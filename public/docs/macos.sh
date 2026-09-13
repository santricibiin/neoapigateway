#!/usr/bin/env bash
# =============================================================================
# Hermes Agent — auto setup untuk member (macOS)
#
#   BASE_URL="https://domainmu/v1" API_KEY="sk-xxxx" bash <(curl -fsSL https://domainmu/docs/macos.sh)
#
# Env var:
#   BASE_URL  (wajib)  — base URL endpoint, contoh https://buatprem.biz.id/v1
#   API_KEY   (wajib)  — API key member (sk-xxxx)
#   MODEL     (opsional) — model default, default: glm-5.3
#   PROVIDER_NAME (opsional) — nama provider di config, default: buatprem
#
# Script ini idempotent: aman dijalankan berulang.
#  - Hermes belum terinstall  → install otomatis (installer resmi Nous Research)
#  - Hermes sudah terinstall  → hanya set base URL, API key, dan header
#  - Config lama di-backup ke config.yaml.bak.<timestamp>, bagian lain tetap utuh
#    (blok custom_providers lama diganti dengan milik endpoint ini)
# =============================================================================
set -euo pipefail

# ---------- warna & util ----------
if [ -t 1 ]; then
  C_G="\033[1;32m"; C_R="\033[1;31m"; C_Y="\033[1;33m"; C_B="\033[1;36m"; C_0="\033[0m"
else
  C_G=""; C_R=""; C_Y=""; C_B=""; C_0=""
fi
info()  { printf "${C_B}[INFO]${C_0} %s\n" "$*"; }
ok()    { printf "${C_G}[OK]${C_0} %s\n" "$*"; }
warn()  { printf "${C_Y}[WARN]${C_0} %s\n" "$*"; }
fail()  { printf "${C_R}[ERROR]${C_0} %s\n" "$*"; exit 1; }

# ---------- argumen ----------
BASE_URL="${BASE_URL:-}"
API_KEY="${API_KEY:-}"
MODEL="${MODEL:-glm-5.3}"
PROVIDER_NAME="${PROVIDER_NAME:-buatprem}"
KEY_ENV="HERMES_BUATPREM_API_KEY"
UA_VALUE="hermes-agent-setup/1.0"

[ -n "$BASE_URL" ] || fail "BASE_URL wajib diisi. Contoh: BASE_URL=\"https://domainmu/v1\" API_KEY=\"sk-xxx\" bash macos.sh"
[ -n "$API_KEY" ]  || fail "API_KEY wajib diisi."
case "$API_KEY" in sk-*) : ;; *) warn "API_KEY biasanya berawalan 'sk-' — pastikan sudah benar." ;; esac
BASE_URL="${BASE_URL%/}"

OS="$(uname -s 2>/dev/null || echo unknown)"
[ "$OS" = "Darwin" ] || fail "Script ini khusus macOS. Untuk Linux pakai: docs/linux.sh"

# curl wajib ada (default di macOS modern; fallback via Homebrew)
if ! command -v curl >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    info "curl tidak ditemukan — install via Homebrew..."
    brew install curl
  else
    fail "curl tidak ditemukan. Install Homebrew dari https://brew.sh lalu jalankan: brew install curl"
  fi
fi

# ---------- 1. install hermes bila belum ada ----------
if command -v hermes >/dev/null 2>&1; then
  ok "Hermes sudah terinstall: $(command -v hermes)"
  hermes --version 2>/dev/null | head -1 || true
else
  info "Hermes belum terinstall. Menginstall via installer resmi..."
  bash <(curl -fsSL https://hermes-agent.nousresearch.com/install.sh)

  # refresh PATH sesi ini (Homebrew Apple Silicon/Intel + lokasi installer)
  for _d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin" "$HOME/bin"; do
    case ":$PATH:" in
      *":$_d:"*) : ;;
      *) [ -d "$_d" ] && export PATH="$_d:$PATH" || true ;;
    esac
  done

  command -v hermes >/dev/null 2>&1 \
    || fail "Install selesai tapi 'hermes' tidak ditemukan di PATH. Buka terminal baru lalu jalankan ulang script ini."
  ok "Hermes terinstall: $(command -v hermes)"
fi

# ---------- 2. lokasi config ----------
# Hermes: HERMES_HOME env → ~/.hermes (macOS) — lihat hermes_constants.py
CONFIG_DIR="${HERMES_HOME:-${HERMES_CONFIG_DIR:-$HOME/.hermes}}"
CONFIG_FILE="$CONFIG_DIR/config.yaml"
ENV_FILE="$CONFIG_DIR/.env"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
  info "Config belum ada — membuat config baru."
  printf 'model:\n  default: %s\n  provider: custom\n  base_url: %s\n  api_key: ${%s}\n' \
    "$MODEL" "$BASE_URL" "$KEY_ENV" > "$CONFIG_FILE"
fi

# ---------- 3. tulis API key ke .env (permission 600) ----------
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"
TMP_ENV="$(mktemp)"
{ grep -v "^${KEY_ENV}=" "$ENV_FILE" 2>/dev/null || true; printf '%s=%s\n' "$KEY_ENV" "$API_KEY"; } > "$TMP_ENV"
mv "$TMP_ENV" "$ENV_FILE"
chmod 600 "$ENV_FILE"
ok "API key tersimpan di $ENV_FILE"

# ---------- 4. patch config.yaml (awk — tanpa dependensi python) ----------
TS="$(date +%Y%m%d_%H%M%S)"
cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$TS"

TMP_CFG="$(mktemp)"
awk -v model="$MODEL" -v base="$BASE_URL" -v keyenv="$KEY_ENV" \
    -v pname="$PROVIDER_NAME" -v ua="$UA_VALUE" '
  /^model:/            { skip=1; next }
  /^custom_providers:/ { skip=1; next }
  skip && (/^[ \t]/ || /^$/) { next }
  { skip=0; print }
  END {
    print "model:"
    print "  default: " model
    print "  provider: custom"
    print "  base_url: " base
    print "  api_key: ${" keyenv "}"
    print "custom_providers:"
    print "  - name: " pname
    print "    base_url: " base
    print "    key_env: " keyenv
    print "    model: " model
    print "    extra_headers:"
    print "      User-Agent: \"" ua "\""
  }
' "$CONFIG_FILE" > "$TMP_CFG"

if [ ! -s "$TMP_CFG" ]; then
  rm -f "$TMP_CFG"
  fail "Patch config gagal — file kosong. Backup tetap ada di config.yaml.bak.$TS"
fi
mv "$TMP_CFG" "$CONFIG_FILE"
ok "Config di-update: $CONFIG_FILE (backup: config.yaml.bak.$TS)"

# ---------- 5. verifikasi ----------
info "Verifikasi koneksi (panggil model sekali)..."
VERIFY_OUT="$(hermes -z "Reply with exactly: OK" 2>&1)" || {
  printf '%s\n' "$VERIFY_OUT" | tail -20
  fail "Verifikasi gagal. Cek API key / BASE_URL, atau jalankan: hermes doctor"
}
printf '%s\n' "$VERIFY_OUT" | tail -3
ok "Setup selesai! Hermes siap dipakai dengan model $MODEL di $BASE_URL"
echo
info "Mulai dengan: hermes"
