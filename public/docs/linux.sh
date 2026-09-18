#!/usr/bin/env bash
# =============================================================================
# Hermes Agent — auto setup untuk member (OpenAI-compatible endpoint)
#
#   BASE_URL="https://domainmu/v1" API_KEY="sk-xxxx" bash <(curl -fsSL https://domainmu/docs/linux.sh)
#
# Env var:
#   BASE_URL  (wajib)  — base URL endpoint, contoh https://domainmu/v1
#   API_KEY   (wajib)  — API key member (sk-xxxx)
#   MODEL     (opsional) — model default, default: glm-5.3
#   PROVIDER_NAME (opsional) — nama provider di config, default: buatprem
#
# Script ini idempotent: aman dijalankan berulang.
#  - Hermes belum terinstall  → install otomatis (installer resmi Nous Research)
#  - Hermes sudah terinstall  → hanya set base URL, API key, dan header
#  - Config lama di-backup ke config.yaml.bak.<timestamp>, bagian lain tidak disentuh
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

[ -n "$BASE_URL" ] || fail "BASE_URL wajib diisi. Contoh: BASE_URL=\"https://domainmu/v1\" API_KEY=\"sk-xxx\" bash linux.sh"
[ -n "$API_KEY" ]  || fail "API_KEY wajib diisi."
case "$API_KEY" in sk-*) : ;; *) warn "API_KEY biasanya berawalan 'sk-' — pastikan sudah benar." ;; esac
BASE_URL="${BASE_URL%/}"

# wajib bash >= 4 (associative array tidak dipakai, tapi ${VAR,,} dst. aman di bash 3+;
# Heredoc YAML memakai fitur standar)
if ! command -v bash >/dev/null 2>&1; then
  fail "Bash tidak ditemukan."
fi

# ---------- deteksi OS ----------
OS="$(uname -s 2>/dev/null || echo unknown)"
if [ "$OS" != "Linux" ] && [ "$OS" != "Darwin" ]; then
  fail "OS tidak dikenal ($OS). Script ini untuk Linux/macOS."
fi

# ---------- 1. install hermes bila belum ada ----------
if command -v hermes >/dev/null 2>&1; then
  ok "Hermes sudah terinstall: $(command -v hermes)"
  hermes --version 2>/dev/null | head -1 || true
else
  info "Hermes belum terinstall. Menginstall via installer resmi..."
  if command -v curl >/dev/null 2>&1; then
    bash <(curl -fsSL https://hermes-agent.nousresearch.com/install.sh)
  elif command -v wget >/dev/null 2>&1; then
    bash <(wget -qO- https://hermes-agent.nousresearch.com/install.sh)
  else
    fail "Butuh curl atau wget untuk install. Install dulu: apt install curl (atau brew install curl)."
  fi

  # refresh PATH untuk sesi ini (installer biasanya ke ~/.local/bin atau /usr/local/bin)
  for _d in "$HOME/.local/bin" /usr/local/bin "$HOME/bin"; do
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
# Hermes: HERMES_HOME env → ~/.hermes (Linux/macOS) — lihat hermes_constants.py
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
if grep -q "^${KEY_ENV}=" "$ENV_FILE" 2>/dev/null; then
  # hapus baris lama lalu tulis baru (key bisa berubah saat member regenerate)
  TMP_ENV="$(mktemp)"
  grep -v "^${KEY_ENV}=" "$ENV_FILE" > "$TMP_ENV" || true
  printf '%s=%s\n' "$KEY_ENV" "$API_KEY" >> "$TMP_ENV"
  mv "$TMP_ENV" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  printf '%s=%s\n' "$KEY_ENV" "$API_KEY" >> "$ENV_FILE"
fi
ok "API key tersimpan di $ENV_FILE"

# ---------- 4. patch config.yaml ----------
python3 - "$CONFIG_FILE" "$BASE_URL" "$MODEL" "$KEY_ENV" "$PROVIDER_NAME" "$UA_VALUE" <<'PYEOF'
import re, shutil, sys, time, os

config_path, base_url, model, key_env, provider_name, ua_value = sys.argv[1:7]

try:
    import yaml
except ImportError:
    # fallback tanpa pyyaml: patch tekstual sederhana
    src = open(config_path).read()
    backup = config_path + ".bak." + time.strftime("%Y%m%d_%H%M%S")
    shutil.copy2(config_path, backup)

    # ganti/hapus blok model: level-2 keys di bawah "model:"
    src = re.sub(r"(?ms)^model:\n.*?(?=^\S)", "", src)
    src = re.sub(r"(?ms)^custom_providers:\n.*?(?=^\S)", "", src)
    src = src.rstrip("\n") + "\n"

    model_block = (
        "model:\n"
        f"  default: {model}\n"
        "  provider: custom\n"
        f"  base_url: {base_url}\n"
        f"  api_key: ${{{key_env}}}\n"
    )
    cp_block = (
        "custom_providers:\n"
        f"  - name: {provider_name}\n"
        f"    base_url: {base_url}\n"
        f"    key_env: {key_env}\n"
        f"    model: {model}\n"
        "    extra_headers:\n"
        f'      User-Agent: "{ua_value}"\n'
    )
    open(config_path, "w").write(src + model_block + cp_block)
    print("PATCHED_TEXTUAL")
    sys.exit(0)

with open(config_path) as f:
    cfg = yaml.safe_load(f) or {}

backup = config_path + ".bak." + time.strftime("%Y%m%d_%H%M%S")
shutil.copy2(config_path, backup)

cfg["model"] = {
    "default": model,
    "provider": "custom",
    "base_url": base_url,
    "api_key": f"${{{key_env}}}",
}

providers = cfg.get("custom_providers") or []
providers = [p for p in providers if isinstance(p, dict) and p.get("base_url") != base_url]
providers.append({
    "name": provider_name,
    "base_url": base_url,
    "key_env": key_env,
    "model": model,
    "extra_headers": {"User-Agent": ua_value},
})
cfg["custom_providers"] = providers

with open(config_path, "w") as f:
    yaml.safe_dump(cfg, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
os.chmod(config_path, 0o600)
print("PATCHED_YAML")
PYEOF

if [ ! -s "$CONFIG_FILE" ]; then
  fail "Patch config gagal — file kosong. Backup lama tetap ada."
fi
ok "Config di-update: $CONFIG_FILE (backup tersimpan)"

# ---------- 5. verifikasi ----------
info "Verifikasi koneksi (panggil model sekali)..."
VERIFY_MODEL="$MODEL"
if [ "$VERIFY_MODEL" != "${VERIFY_MODEL#*/}" ]; then
  # model dengan prefix vendor (mis. openrouter/x) — kirim apa adanya
  :
fi

VERIFY_OUT="$(hermes -z "Reply with exactly: OK" 2>&1)" || {
  printf '%s\n' "$VERIFY_OUT" | tail -20
  fail "Verifikasi gagal. Cek API key / BASE_URL, atau jalankan: hermes doctor"
}
printf '%s\n' "$VERIFY_OUT" | tail -3
ok "Setup selesai! Hermes siap dipakai dengan model $MODEL di $BASE_URL"
echo
info "Mulai dengan: hermes"
