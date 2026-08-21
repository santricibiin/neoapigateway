#!/usr/bin/env bash
set -euo pipefail

# ===== Neo API Gateway — Backup Cron =====
# Dipanggil oleh PM2 cron / cron sistem
# Cek settings DB → jika backupEnabled → mysqldump → zip → kirim ke Telegram
# Juga scan /root/neoapigateway/ untuk file .sql → backup otomatis

APP_DIR="/root/neoapigateway"
ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] .env tidak ditemukan"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

DB_URL="$DATABASE_URL"
if [ -z "$DB_URL" ]; then
  echo "[backup] DATABASE_URL kosong"
  exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo "$DB_URL" | sed -n 's|mysql://\([^:]*\):.*@.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# WIB timestamp
WIB=$(TZ='Asia/Jakarta' date '+%d%m%y-%H%M')
SQL_FILE="/tmp/bc-${WIB}.sql"
ZIP_FILE="/tmp/bc-${WIB}.zip"

echo "[backup] Mulai backup $DB_NAME → $ZIP_FILE"

# mysqldump
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" --single-transaction --routines --triggers > "$SQL_FILE" 2>/dev/null

if [ ! -s "$SQL_FILE" ]; then
  echo "[backup] mysqldump gagal (file kosong)"
  rm -f "$SQL_FILE"
  exit 1
fi

# zip
zip -j "$ZIP_FILE" "$SQL_FILE" >/dev/null
rm -f "$SQL_FILE"

# Cek file .sql / .zip di APP_DIR → sertakan dalam backup
EXTRA_FILES=$(find "$APP_DIR" -maxdepth 1 -name '*.sql' -o -name '*.zip' 2>/dev/null | head -20)
if [ -n "$EXTRA_FILES" ]; then
  echo "[backup] Menemukan file SQL/ZIP di $APP_DIR, mengirim juga..."
  for f in $EXTRA_FILES; do
    send_telegram "$f" "File ditemukan: $(basename "$f")"
  done
fi

# Kirim ke Telegram
send_telegram() {
  local file="$1"
  local caption="${2:-Backup database $(basename "$file")}"
  local token="$TELEGRAM_BOT_TOKEN"
  local chat="$TELEGRAM_CHAT_ID"

  if [ -z "$token" ] || [ -z "$chat" ]; then
    echo "[backup] Telegram token/chat kosong, simpan lokal"
    cp "$file" "$APP_DIR/$(basename "$file")"
    return
  fi

  curl -s -F "chat_id=$chat" -F "document=@$file" -F "caption=$caption" \
    "https://api.telegram.org/bot$token/sendDocument" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "[backup] Terkirim ke Telegram: $(basename "$file")"
  else
    echo "[backup] Gagal kirim Telegram, simpan lokal"
    cp "$file" "$APP_DIR/$(basename "$file")"
  fi
}

send_telegram "$ZIP_FILE" "Backup database $(basename "$ZIP_FILE")"
rm -f "$ZIP_FILE"

echo "[backup] Selesai"
