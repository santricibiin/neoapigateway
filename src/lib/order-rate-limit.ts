/**
 * Rate limit order/cancel per IP (in-memory, per proses server).
 * Order: maks 2 baru dalam 15 menit. Cancel: maks 2 dalam 15 menit.
 * ponytail: single-process; multi-instance/cluster → pindah ke Redis.
 */
import { clientIp } from "@/lib/ip-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export const ORDER_SCOPE = "order";
export const CANCEL_SCOPE = "cancel";

/** Batas per scope. */
const MAX_HITS: Record<string, number> = {
  [ORDER_SCOPE]: 2,
  [CANCEL_SCOPE]: 2,
};

type Entry = { hits: number; firstHitAt: number; lockedUntil: number };
const store = new Map<string, Entry>();

function prune(now: number) {
  if (store.size < 500) return;
  for (const [k, e] of store) {
    if (e.lockedUntil < now && now - e.firstHitAt > WINDOW_MS) store.delete(k);
  }
}

/** Cek boleh order/cancel. Kalau terkunci, balikkan sisa detik. */
export function checkOrderAllowed(
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

/** Catat order/cancel baru; kunci IP kalau lewat batas. */
export function recordOrderHit(scope: string, ip: string): { lockedForSec: number } {
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const max = MAX_HITS[scope] ?? 3;
  const e = store.get(key);
  if (!e || now - e.firstHitAt > WINDOW_MS) {
    store.set(key, { hits: 1, firstHitAt: now, lockedUntil: 0 });
    return { lockedForSec: 0 };
  }
  e.hits += 1;
  if (e.hits >= max) {
    e.lockedUntil = now + LOCKOUT_MS;
    return { lockedForSec: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { lockedForSec: 0 };
}


