import { prisma } from "@/lib/prisma";
import { fetchResellerKeys } from "@/lib/bandelbanget";

/**
 * F-01: validasi API key member di layer gateway untuk /v1/*.
 *
 * Allow-set = semua key yang diterbitkan akun reseller kita di upstream + key
 * reseller sendiri. Key asing (milik akun lain di provider yang sama) ditolak
 * di sini, bukan diteruskan ke upstream.
 *
 * Fail-open by design supaya trafik valid tidak pernah terputus. Gate nonaktif
 * (semua request diteruskan, upstream tetap melakukan auth sendiri) saat:
 * - secretKey reseller belum diatur di Setting
 * - upstream tidak terjangkau / PIN reseller belum diset (backoff 10 detik)
 * - daftar key upstream tidak menyertakan key lengkap (hanya keyMasked)
 *
 * Cache 30 detik. Saat key TIDAK ditemukan, refresh paksa sekali (maks 1x per
 * 5 detik) sebelum menolak — key yang baru dibuat langsung bisa dipakai tanpa
 * menunggu TTL, dan spam key acak tidak bisa memaksa gateway menghantam
 * endpoint keys upstream.
 * ponytail: single-process cache; multi-instance → pindah ke Redis.
 */

const TTL_MS = 30_000;
const FORCE_REFRESH_MIN_INTERVAL_MS = 5_000;
const FAIL_BACKOFF_MS = 10_000;

let cache: { at: number; keys: Set<string> } | null = null;
let inflight: Promise<Set<string>> | null = null;
let lastRefreshAt = 0;
let lastFailAt = 0;

function extractKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const xKey = headers.get("x-api-key");
  return xKey ? xKey.trim() : null;
}

/** Set kosong = gate nonaktif (fail-open). */
async function loadKeySet(force: boolean): Promise<Set<string>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.keys;
  if (inflight) return inflight;
  if (Date.now() - lastFailAt < FAIL_BACKOFF_MS) return cache?.keys ?? new Set<string>();

  const task = (async () => {
    try {
      const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
      if (!setting?.secretKey) return new Set<string>();
      const { keys, resellerApiKey } = await fetchResellerKeys(setting.secretKey);
      const set = new Set<string>();
      if (typeof resellerApiKey === "string" && resellerApiKey) set.add(resellerApiKey);
      let withFullKey = 0;
      for (const k of keys) {
        const v = (k as { key?: unknown })?.key;
        if (typeof v === "string" && v) {
          set.add(v);
          withFullKey++;
        }
      }
      // Daftar hanya berisi keyMasked → tidak bisa divalidasi; jangan aktifkan
      // gate (fail-open) supaya member valid tidak tertolak.
      if (withFullKey === 0) return new Set<string>();
      cache = { at: Date.now(), keys: set };
      lastRefreshAt = Date.now();
      lastFailAt = 0;
      return set;
    } catch {
      lastFailAt = Date.now();
      return cache?.keys ?? new Set<string>();
    }
  })();

  inflight = task;
  try {
    return await task;
  } finally {
    if (inflight === task) inflight = null;
  }
}

/**
 * true = teruskan request ke upstream.
 * false = tolak dengan 401 (key asing, atau request tanpa key saat gate aktif).
 */
export async function checkUpstreamKey(request: Request): Promise<boolean> {
  const key = extractKey(request.headers);
  const set = await loadKeySet(false);
  if (set.size === 0) return true; // gate nonaktif → fail-open
  if (!key) return false; // gate aktif: tanpa key = tolak
  if (set.has(key)) return true;
  // Miss: refresh paksa sekali (key baru < TTL lalu), rate-limited anti amplifikasi.
  if (Date.now() - lastRefreshAt < FORCE_REFRESH_MIN_INTERVAL_MS) return false;
  const fresh = await loadKeySet(true);
  return fresh.size > 0 && fresh.has(key);
}
