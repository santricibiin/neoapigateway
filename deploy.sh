#!/usr/bin/env bash
set -euo pipefail

# ===== Neo API Gateway — Deploy Script =====
# Menu: 1) Deploy Awal  2) Update
# Deploy awal: Node.js, MySQL, .env, Nginx, Certbot SSL, PM2
# Update: git pull → npm install → prisma generate → db push → build → restart PM2

APP_DIR="/root/neoapigateway"
APP_NAME="neo"
APP_PORT=3000
MYSQL_DB="neo"
MYSQL_USER="neo_app"
MYSQL_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -base64 48)
FORWARD_SECRET=$(openssl rand -hex 24)
ADMIN_EMAIL="admin@neo.ai"
ADMIN_PASS=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ===== Cek root =====
if [ "$EUID" -ne 0 ]; then
  err "Jalankan sebagai root: sudo bash deploy.sh"
  exit 1
fi

cd "$APP_DIR"

# ===== Fungsi: Deploy Awal =====
deploy_awal() {
  echo ""
  info "=== Setup Domain ==="
  read -rp "Domain untuk website (contoh: neo.domain.com): " DOMAIN
  DOMAIN=$(echo "$DOMAIN" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')

  if [ -z "$DOMAIN" ]; then
    err "Domain wajib diisi."
    exit 1
  fi

  read -rp "Email untuk Let's Encrypt SSL (contoh: admin@domain.com): " SSL_EMAIL
  SSL_EMAIL=$(echo "$SSL_EMAIL" | tr -d '[:space:]')
  if [ -z "$SSL_EMAIL" ]; then
    SSL_EMAIL="admin@${DOMAIN}"
    warn "Email kosong, pakai: $SSL_EMAIL"
  fi

  echo ""
  info "Domain : $DOMAIN"
  info "Email  : $SSL_EMAIL"
  read -rp "Lanjutkan? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    warn "Dibatalkan."
    exit 0
  fi

  echo ""
  info "=== Mulai deploy untuk $DOMAIN ==="
  echo ""

  # 1. Node.js
  if command -v node &>/dev/null && node -v | grep -q 'v2'; then
    log "Node.js sudah terinstall: $(node -v) — skip"
  else
    info "Menginstall Node.js 20.x ..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log "Node.js terinstall: $(node -v)"
  fi

  # 2. MySQL
  if command -v mysql &>/dev/null; then
    log "MySQL sudah terinstall — skip"
  else
    info "Menginstall MySQL Server ..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y mysql-server
    log "MySQL terinstall"
  fi

  if ! systemctl is-active --quiet mysql; then
    systemctl start mysql
    systemctl enable mysql
  fi
  log "MySQL service aktif"

  # 3. Database & User
  if mysql -e "USE $MYSQL_DB" 2>/dev/null; then
    log "Database '$MYSQL_DB' sudah ada — skip"
  else
    info "Membuat database '$MYSQL_DB' & user '$MYSQL_USER' ..."
    mysql <<EOF
CREATE DATABASE IF NOT EXISTS $MYSQL_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASS';
GRANT ALL PRIVILEGES ON $MYSQL_DB.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    log "Database & user siap"
  fi

  # 4. Dependencies
  cd "$APP_DIR"
  if [ -d "node_modules" ]; then
    log "node_modules sudah ada — skip npm install"
  else
    info "Menginstall dependencies ..."
    npm install
    log "Dependencies terinstall"
  fi

  # 5. .env
  ENV_FILE="$APP_DIR/.env"
  if [ -f "$ENV_FILE" ] && grep -q "$DOMAIN" "$ENV_FILE" 2>/dev/null; then
    log ".env sudah konfigurasi untuk $DOMAIN — skip"
    # Pastikan SESSION_SECRET & FORWARD_SECRET ada (untuk deploy lama yang belum punya)
    if ! grep -q "SESSION_SECRET" "$ENV_FILE"; then
      echo "SESSION_SECRET=\"${SESSION_SECRET}\"" >> "$ENV_FILE"
      log "SESSION_SECRET ditambahkan ke .env"
    fi
    if ! grep -q "PAYMENT_FORWARD_SECRET" "$ENV_FILE"; then
      echo "PAYMENT_FORWARD_SECRET=\"${FORWARD_SECRET}\"" >> "$ENV_FILE"
      log "PAYMENT_FORWARD_SECRET ditambahkan ke .env"
    fi
    # Reload nilai dari .env yang existing
    EXISTING_PASS=$(grep 'DATABASE_URL' "$ENV_FILE" 2>/dev/null | sed -n 's/.*:\([^@]*\)@localhost.*/\1/p' || true)
    if [ -n "$EXISTING_PASS" ]; then
      MYSQL_PASS="$EXISTING_PASS"
    fi
    EXISTING_SESSION=$(grep 'SESSION_SECRET' "$ENV_FILE" 2>/dev/null | sed -n 's/.*="\(.*\)".*/\1/p' || true)
    if [ -n "$EXISTING_SESSION" ]; then
      SESSION_SECRET="$EXISTING_SESSION"
    fi
    EXISTING_FORWARD=$(grep 'PAYMENT_FORWARD_SECRET' "$ENV_FILE" 2>/dev/null | sed -n 's/.*="\(.*\)".*/\1/p' || true)
    if [ -n "$EXISTING_FORWARD" ]; then
      FORWARD_SECRET="$EXISTING_FORWARD"
    fi
  else
    info "Mengkonfigurasi .env ..."

    EXISTING_PASS=$(grep 'DATABASE_URL' "$ENV_FILE" 2>/dev/null | sed -n 's/.*:\([^@]*\)@localhost.*/\1/p' || true)
    if [ -n "$EXISTING_PASS" ]; then
      MYSQL_PASS="$EXISTING_PASS"
      warn "Pakai password DB existing"
    else
      mysql <<EOF
ALTER USER '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASS';
FLUSH PRIVILEGES;
EOF
    fi

    cat > "$ENV_FILE" <<EOF
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$MYSQL_DB"
BANDEL_UPSTREAM="https://bandelbanget.xyz"
PUBLIC_API_BASE="https://$DOMAIN"
PUBLIC_BRAND_NAME="Neo API Gateway"
NODE_ENV="production"
SESSION_SECRET="$SESSION_SECRET"
PAYMENT_FORWARD_SECRET="$FORWARD_SECRET"
EOF
    log ".env dibuat"
  fi

  # 6. Prisma
  info "Generate Prisma Client ..."
  npx prisma generate
  info "Push schema ke database ..."
  npx prisma db push --accept-data-loss
  log "Database schema sinkron"

  # 6b. Seed admin dengan password random
  info "Seed admin & data awal ..."
  ADMIN_PASS="$ADMIN_PASS" npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    import bcrypt from 'bcryptjs';
    const prisma = new PrismaClient();
    async function main() {
      const email = '${ADMIN_EMAIL}';
      const password = process.env.ADMIN_PASS;
      if (!password) throw new Error('ADMIN_PASS env not set');
      const hashed = await bcrypt.hash(password, 10);
      const admin = await prisma.admin.upsert({
        where: { email },
        update: {},
        create: { email, name: 'Super Admin', password: hashed, role: 'admin' },
      });
      console.log('Admin ready:', admin.email);
    }
    main().catch(console.error).finally(() => prisma.\$disconnect());
  " 2>&1 | tail -1
  log "Admin seeded"

  # 7. Build
  info "Build Next.js ..."
  npm run build
  log "Build sukses"

  # 8. PM2
  if command -v pm2 &>/dev/null; then
    log "PM2 sudah terinstall — skip"
  else
    info "Menginstall PM2 ..."
    npm install -g pm2
    log "PM2 terinstall"
  fi

  pm2 delete "$APP_NAME" 2>/dev/null || true
  info "Start aplikasi via PM2 ..."
  pm2 start npm --name "$APP_NAME" -- start
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || true
  log "Aplikasi berjalan di port $APP_PORT (PM2)"

  # 8b. Backup cron via PM2
  pm2 delete "neo-backup" 2>/dev/null || true
  pm2 start "$APP_DIR/scripts/backup-cron.sh" --name "neo-backup" --cron "0 * * * *" 2>/dev/null || true
  pm2 save 2>/dev/null || true
  log "Backup cron aktif (cek tiap jam via PM2)"

  # 9. Nginx
  if command -v nginx &>/dev/null; then
    log "Nginx sudah terinstall — skip"
  else
    info "Menginstall Nginx ..."
    apt-get install -y nginx
    log "Nginx terinstall"
  fi

  # 10. Nginx config
  NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
  if [ -f "$NGINX_CONF" ]; then
    log "Nginx config untuk $DOMAIN sudah ada — skip"
  else
    info "Membuat Nginx config untuk $DOMAIN ..."
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    log "Nginx config dibuat"
  fi

  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log "Nginx reload sukses"
  else
    err "Nginx config test gagal — cek manual"
    nginx -t
  fi

  # 11. Certbot SSL
  if command -v certbot &>/dev/null; then
    log "Certbot sudah terinstall — skip"
  else
    info "Menginstall Certbot ..."
    apt-get install -y certbot python3-certbot-nginx
    log "Certbot terinstall"
  fi

  if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log "SSL untuk $DOMAIN sudah ada — skip"
  else
    info "Mendapatkan SSL certificate untuk $DOMAIN ..."
    echo ""
    warn "Pastikan DNS $DOMAIN sudah mengarah ke IP server ini!"
    read -rp "Lanjutkan request SSL? (y/N): " SSL_CONFIRM
    if [[ "$SSL_CONFIRM" =~ ^[Yy]$ ]]; then
      certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
        --non-interactive --agree-tos -m "$SSL_EMAIL" \
        --redirect || {
        err "Certbot gagal — cek DNS / port 80"
        warn "Aplikasi tetap jalan di http://$DOMAIN"
      }
      log "SSL certificate terinstall"
    else
      warn "Skip SSL — aplikasi jalan di http://$DOMAIN"
    fi
  fi

  # Selesai
  echo ""
  log "=== DEPLOY AWAL SELESAI ==="
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║              KREDENSIAL & INFO APLIKASI                   ║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  URL Aplikasi  : https://$DOMAIN"
  echo -e "${CYAN}║${NC}  Admin Login   : https://$DOMAIN/login/admin"
  echo -e "${CYAN}║${NC}  PM2           : pm2 status | pm2 logs $APP_NAME"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  ${YELLOW}↓ SALIN KREDENSIAL BERIKUT ↓${NC}${CYAN}                              ║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  Admin Email   : ${GREEN}$ADMIN_EMAIL${NC}"
  echo -e "${CYAN}║${NC}  Admin Pass    : ${GREEN}$ADMIN_PASS${NC}"
  echo -e "${CYAN}║${NC}  DB URL        : ${GREEN}mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$MYSQL_DB${NC}"
  echo -e "${CYAN}║${NC}  Session Secret: ${GREEN}$SESSION_SECRET${NC}"
  echo -e "${CYAN}║${NC}  Forward Secret: ${GREEN}$FORWARD_SECRET${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  ${YELLOW}App Android Forwarder:${NC}"
  echo -e "${CYAN}║${NC}  Callback URL  : https://$DOMAIN/api/payment/callback"
  echo -e "${CYAN}║${NC}  Param1        : ${GREEN}secret${NC}"
  echo -e "${CYAN}║${NC}  Value1        : ${GREEN}$FORWARD_SECRET${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  warn "Jika SSL gagal, pastikan DNS A record → $(curl -s ifconfig.me) & port 80 terbuka"
  echo ""
}

# ===== Fungsi: Update =====
update() {
  echo ""
  info "=== Update Aplikasi ==="
  echo ""

  # Cek PM2
  if ! command -v pm2 &>/dev/null; then
    err "PM2 belum terinstall. Jalankan deploy awal dulu."
    exit 1
  fi

  # Git pull
  info "Git pull ..."
  git pull --ff-only
  log "Code terbaru ditarik"

  # Pastikan SESSION_SECRET & PAYMENT_FORWARD_SECRET ada di .env lama
  ENV_FILE="$APP_DIR/.env"
  if [ -f "$ENV_FILE" ]; then
    if ! grep -q "SESSION_SECRET" "$ENV_FILE"; then
      echo "SESSION_SECRET=\"$(openssl rand -base64 48)\"" >> "$ENV_FILE"
      log "SESSION_SECRET ditambahkan ke .env"
    fi
    if ! grep -q "PAYMENT_FORWARD_SECRET" "$ENV_FILE"; then
      echo "PAYMENT_FORWARD_SECRET=\"$(openssl rand -hex 24)\"" >> "$ENV_FILE"
      log "PAYMENT_FORWARD_SECRET ditambahkan ke .env"
    fi
  fi

  # npm install
  info "Install dependencies ..."
  npm install
  log "Dependencies update"

  # Prisma
  info "Generate Prisma Client ..."
  npx prisma generate
  info "Push schema ke database ..."
  npx prisma db push --accept-data-loss
  log "Database schema sinkron"

  # Build
  info "Build Next.js ..."
  npm run build
  log "Build sukses"

  # Restart PM2
  info "Restart PM2 ..."
  pm2 restart "$APP_NAME" --update-env 2>/dev/null || {
    warn "Process '$APP_NAME' tidak ditemukan, start baru ..."
    pm2 start npm --name "$APP_NAME" -- start
    pm2 save
  }
  log "Aplikasi direstart"

  echo ""
  log "=== UPDATE SELESAI ==="
  echo ""
  info "PM2 status:"
  pm2 list
  echo ""
}

# ===== Fungsi: Restore Backup =====
restore_backup() {
  echo ""
  info "=== Restore Backup ==="
  echo ""

  # Cari file .sql / .zip di APP_DIR
  BACKUP_FILES=$(find "$APP_DIR" -maxdepth 1 \( -name '*.sql' -o -name 'bc-*.zip' \) 2>/dev/null | sort)

  if [ -z "$BACKUP_FILES" ]; then
    err "Tidak ada file backup (.sql / .zip) di $APP_DIR"
    warn "Upload file backup ke $APP_DIR/ lalu jalankan lagi."
    exit 1
  fi

  echo "File backup ditemukan:"
  echo ""
  local i=1
  local files=()
  while IFS= read -r f; do
    local fname=$(basename "$f")
    local fsize=$(du -h "$f" | cut -f1)
    local fdate=$(stat -c %y "$f" 2>/dev/null | cut -d. -f1)
    echo "  $i) $fname ($fsize, $fdate)"
    files+=("$f")
    i=$((i + 1))
  done <<< "$BACKUP_FILES"
  echo ""

  read -rp "Pilih file (1-$((i-1))): " PILIH

  if ! [[ "$PILIH" =~ ^[0-9]+$ ]] || [ "$PILIH" -lt 1 ] || [ "$PILIH" -gt $((i-1)) ]; then
    err "Pilihan tidak valid"
    exit 1
  fi

  local selected="${files[$((PILIH-1))]}"
  local fname=$(basename "$selected")

  echo ""
  warn "PERINGATAN: Restore akan MENIMPA database saat ini!"
  warn "File: $fname"
  read -rp "Lanjutkan restore? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    warn "Dibatalkan."
    exit 0
  fi

  # Parse DB credentials dari .env
  ENV_FILE="$APP_DIR/.env"
  if [ ! -f "$ENV_FILE" ]; then
    err ".env tidak ditemukan"
    exit 1
  fi
  export $(grep -v '^#' "$ENV_FILE" | xargs)
  DB_URL="$DATABASE_URL"
  DB_USER=$(echo "$DB_URL" | sed -n 's|mysql://\([^:]*\):.*@.*|\1|p')
  DB_PASS=$(echo "$DB_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')
  DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

  local tmp_sql="/tmp/restore_$$.sql"

  # Unzip jika .zip
  case "$fname" in
    *.zip)
      info "Ekstrak $fname ..."
      unzip -o "$selected" -d /tmp/restore_$$ >/dev/null
      tmp_sql=$(find /tmp/restore_$$ -name '*.sql' | head -1)
      if [ -z "$tmp_sql" ]; then
        err "File .sql tidak ditemukan dalam zip"
        rm -rf /tmp/restore_$$
        exit 1
      fi
      ;;
    *.sql)
      tmp_sql="$selected"
      ;;
  esac

  # Stop app
  info "Stop aplikasi (PM2) ..."
  pm2 stop "$APP_NAME" 2>/dev/null || true

  # Restore
  info "Restore database ..."
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$tmp_sql" 2>/dev/null
  log "Database restored"

  # Cleanup
  [ "$fname" = "*.zip" ] && rm -rf /tmp/restore_$$

  # Prisma generate (schema mungkin berubah)
  info "Generate Prisma Client ..."
  cd "$APP_DIR"
  npx prisma generate

  # Start app
  info "Start aplikasi (PM2) ..."
  pm2 start "$APP_NAME" 2>/dev/null || pm2 start npm --name "$APP_NAME" -- start
  pm2 save

  echo ""
  log "=== RESTORE SELESAI ==="
  echo ""
  info "Database: $DB_NAME"
  info "File    : $fname"
  echo ""
}

# ===== Menu Utama =====
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Neo API Gateway — Deploy Script    ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  1. Deploy Awal                      ║${NC}"
echo -e "${CYAN}║  2. Update                           ║${NC}"
echo -e "${CYAN}║  3. Restore Backup                   ║${NC}"
echo -e "${CYAN}║  4. Keluar                           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
read -rp "Pilih (1/2/3/4): " PILIHAN

case "$PILIHAN" in
  1) deploy_awal ;;
  2) update ;;
  3) restore_backup ;;
  4) echo "Bye." ; exit 0 ;;
  *) err "Pilihan tidak valid." ; exit 1 ;;
esac
