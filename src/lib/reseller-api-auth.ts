import { prisma } from "@/lib/prisma";

const MIN_KEY_LENGTH = 8;

/** Format key kuat: res_ + 64 hex (256-bit). Dienforce di semua titik set key. */
export const API_KEY_PATTERN = /^res_[a-f0-9]{64}$/;

/**
 * Anti brute-force API key: 10 key SALAH dalam 15 menit → IP terkunci 15 menit.
 * Hanya percobaan GAGAL yang dihitung — reseller dengan key valid tidak pernah terkunci.
 * ponytail: single-process; multi-instance → pindah ke Redis.
 */
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type FailEntry = { fails: number; firstFailAt: number; lockedUntil: number };
const failStore = new Map<string, FailEntry>();

export type AuthenticatedReseller = {
  id: number;
  name: string;
  email: string;
  balance: bigint;
  active: boolean;
};

export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const xKey = req.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  return null;
}

function requestIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  if (xff) return xff;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function authenticateApiKey(req: Request): Promise<AuthenticatedReseller | null> {
  const key = extractApiKey(req);
  if (!key || key.length < MIN_KEY_LENGTH) return null;

  const ip = requestIp(req);
  const now = Date.now();

  // IP terkunci → tolak murah tanpa query DB.
  // DoS antar client se-NAT nyaris mustahil: setiap key VALID me-reset hitungan,
  // jadi IP dengan traffic reseller aktif tidak akan pernah mencapai batas.
  const e = failStore.get(ip);
  if (e && e.lockedUntil > now) return null;

  const reseller = await prisma.resellerWeb.findUnique({
    where: { apiKey: key },
    select: { id: true, name: true, email: true, balance: true, active: true },
  });
  if (reseller && reseller.active) {
    failStore.delete(ip);
    return reseller;
  }

  // Key salah/akun nonaktif → catat gagal; kunci IP setelah batas.
  if (!e || now - e.firstFailAt > WINDOW_MS) {
    failStore.set(ip, { fails: 1, firstFailAt: now, lockedUntil: 0 });
  } else {
    e.fails += 1;
    if (e.fails >= MAX_FAILS) e.lockedUntil = now + LOCKOUT_MS;
  }
  return null;
}
