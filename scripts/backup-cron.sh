#!/usr/bin/env bash
set -euo pipefail

# ===== Neo API Gateway — Backup Cron =====
# Dijalankan PM2 tiap 15 menit. Baca settings dari DB (dashboard admin):
# enabled / interval / unit / telegram token+chat. Kalau belum waktunya
# (interval belum tercapai sejak run terakhir), skip.

APP_DIR="/root/neoapigateway"
ENV_FILE="$APP_DIR/.env"
MARKER="/tmp/neo-backup-last-run"

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

DB_USER=$(echo "$DB_URL" | sed -n 's|mysql://\([^:]*\):.*@.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

MYSQL_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -s)

# Ambil settings dari DB
SETTINGS=$(printf 'SELECT backupEnabled, backupInterval, backupUnit, telegramBotToken, telegramChatId FROM Setting WHERE id=1;' | "${MYSQL_CMD[@]}" 2>/dev/null || true)
if [ -z "$SETTINGS" ]; then
  echo "[backup] Tidak bisa baca settings dari DB"
  exit 1
fi

ENABLED=$(echo "$SETTINGS" | awk '{print $1}')
INTERVAL=$(echo "$SETTINGS" | awk '{print $2}')
UNIT=$(echo "$SETTINGS" | awk '{print $3}')
DB_TOKEN=$(echo "$SETTINGS" | awk '{print $4}')
DB_CHAT=$(echo "$SETTINGS" | awk '{print $5}')

if [ "$ENABLED" != "1" ]; then
  echo "[backup] Auto-backup nonaktif di settings"
  exit 0
fi

if [ -z "$DB_TOKEN" ] || [ -z "$DB_CHAT" ]; then
  echo "[backup] Telegram token/chat kosong di settings"
  exit 1
fi

# Hitung interval dalam detik
case "$UNIT" in
  hours) INTERVAL_S=$((INTERVAL * 3600)) ;;
  days)  INTERVAL_S=$((INTERVAL * 86400)) ;;
  *)     INTERVAL_S=$((INTERVAL * 60)) ;;
esac

# Skip kalau belum waktunya
NOW=$(date +%s)
if [ -f "$MARKER" ]; then
  LAST=$(cat "$MARKER" 2>/dev/null || echo 0)
  if [ $((NOW - LAST)) -lt "$INTERVAL_S" ]; then
    echo "[backup] Belum waktunya (interval ${INTERVAL_S}s, lewat $((NOW - LAST))s)"
    exit 0
  fi
fi

# ===== Mulai backup =====
WIB=$(TZ='Asia/Jakarta' date '+%d%m%y-%H%M')
SQL_FILE="/tmp/bc-${WIB}.sql"
ZIP_FILE="/tmp/bc-${WIB}.zip"

send_telegram() {
  local file="$1"
  local caption="${2:-Backup database $(basename "$file")}"
  curl -s -F "chat_id=$DB_CHAT" -F "document=@$file" -F "caption=$caption" \
    "https://api.telegram.org/bot$DB_TOKEN/sendDocument" >/dev/null 2>&1
}

echo "[backup] Mulai backup $DB_NAME → $ZIP_FILE"

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" --single-transaction --routines --triggers > "$SQL_FILE" 2>/dev/null

if [ ! -s "$SQL_FILE" ]; then
  echo "[backup] mysqldump gagal (file kosong)"
  rm -f "$SQL_FILE"
  exit 1
fi

zip -j "$ZIP_FILE" "$SQL_FILE" >/dev/null
rm -f "$SQL_FILE"

if send_telegram "$ZIP_FILE" "Backup database $(basename "$ZIP_FILE")"; then
  echo "[backup] Terkirim ke Telegram: $(basename "$ZIP_FILE")"
  echo "$NOW" > "$MARKER"
else
  echo "[backup] Gagal kirim Telegram, simpan lokal"
  cp "$ZIP_FILE" "$APP_DIR/$(basename "$ZIP_FILE")"
fi
rm -f "$ZIP_FILE"

echo "[backup] Selesai"
