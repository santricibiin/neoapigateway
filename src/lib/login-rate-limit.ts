/**
 * Rate limit login sederhana (in-memory, per proses server).
 * 5 percobaan gagal dalam 15 menit → terkunci 15 menit (per email DAN per IP).
 * ponytail: single-process; kalau nanti multi-instance/PM2 cluster, pindah ke Redis.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type Entry = { fails: number; firstFailAt: number; lockedUntil: number };
const store = new Map<string, Entry>();

function keys(scope: string, email: string, ip: string): string[] {
  return [`${scope}:e:${email.toLowerCase()}`, `${scope}:i:${ip}`];
}

function prune(now: number) {
  if (store.size < 500) return;
  for (const [k, e] of store) {
    if (e.lockedUntil < now && now - e.firstFailAt > WINDOW_MS) store.delete(k);
  }
}

/** Cek boleh mencoba login. Kalau terkunci, balikkan sisa detik. */
export function checkLoginAllowed(
  scope: string,
  email: string,
  ip: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  for (const key of keys(scope, email, ip)) {
    const e = store.get(key);
    if (e && e.lockedUntil > now) {
      return { ok: false, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
    }
  }
  return { ok: true };
}

/** Catat percobaan gagal; kunci kalau sudah lewat batas. */
export function recordLoginFail(scope: string, email: string, ip: string) {
  const now = Date.now();
  for (const key of keys(scope, email, ip)) {
    const e = store.get(key);
    if (!e || now - e.firstFailAt > WINDOW_MS) {
      store.set(key, { fails: 1, firstFailAt: now, lockedUntil: 0 });
      continue;
    }
    e.fails += 1;
    if (e.fails >= MAX_ATTEMPTS) e.lockedUntil = now + LOCKOUT_MS;
  }
}

/** Hapus catatan setelah login sukses. */
export function recordLoginSuccess(scope: string, email: string, ip: string) {
  for (const key of keys(scope, email, ip)) store.delete(key);
}

/** Format sisa waktu lockout untuk pesan user. */
export function formatRetry(retryAfterSec: number): string {
  const min = Math.ceil(retryAfterSec / 60);
  return min > 1 ? `${min} menit` : `${retryAfterSec} detik`;
}
