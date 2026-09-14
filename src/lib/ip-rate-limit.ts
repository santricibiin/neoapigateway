/**
 * Rate limit anti brute-force invoice (in-memory, per proses server).
 * 3 invoice TIDAK DITEMUKAN dalam 15 menit → IP terkunci 15 menit.
 * Lookup invoice VALID tidak dihitung — polling status tiap 5 detik tetap aman.
 * ponytail: single-process; multi-instance/cluster → pindah ke Redis.
 */
const MAX_MISSES = 3;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export const INVOICE_SCOPE = "invoice";

type Entry = { misses: number; firstMissAt: number; lockedUntil: number };
const store = new Map<string, Entry>();

function prune(now: number) {
  if (store.size < 500) return;
  for (const [k, e] of store) {
    if (e.lockedUntil < now && now - e.firstMissAt > WINDOW_MS) store.delete(k);
  }
}

/** IP client dari header proxy (x-forwarded-for pertama). */
export function clientIp(h: Headers): string {
  const xff = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  if (xff) return xff;
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Cek boleh lookup invoice. Kalau terkunci, balikkan sisa detik. */
export function checkIpAllowed(
  scope: string,
  ip: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const e = store.get(`${scope}:${ip}`);
  if (e && e.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
  }
  return { ok: true };
}

/** Catat invoice tidak ditemukan; kunci IP kalau lewat batas. */
export function recordInvoiceMiss(scope: string, ip: string) {
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const e = store.get(key);
  if (!e || now - e.firstMissAt > WINDOW_MS) {
    store.set(key, { misses: 1, firstMissAt: now, lockedUntil: 0 });
    return;
  }
  e.misses += 1;
  if (e.misses >= MAX_MISSES) e.lockedUntil = now + LOCKOUT_MS;
}

/** Reset hitungan setelah invoice valid ditemukan. */
export function recordInvoiceHit(scope: string, ip: string) {
  store.delete(`${scope}:${ip}`);
}
