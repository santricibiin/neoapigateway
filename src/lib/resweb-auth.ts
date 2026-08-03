import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const RESWEB_COOKIE = "neo_resweb_session";
const RESWEB_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET env must be set (min 32 chars) in production");
    }
    return "dev-only-insecure-session-secret-min-32-chars!!";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  try {
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createResWebSessionToken(resellerId: number) {
  const expires = Date.now() + RESWEB_MAX_AGE * 1000;
  const payload = JSON.stringify({ id: resellerId, expires, kind: "resweb" });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function createResWebSession(resellerId: number) {
  cookies().set(RESWEB_COOKIE, createResWebSessionToken(resellerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: RESWEB_MAX_AGE,
    path: "/",
  });
}

export function destroyResWebSession() {
  cookies().delete(RESWEB_COOKIE);
}

export function getResWebSession(): { id: number } | null {
  const raw = cookies().get(RESWEB_COOKIE)?.value;
  if (!raw) return null;
  try {
    const [encoded, signature] = raw.split(".");
    if (!encoded || !signature) return null;
    if (!verify(encoded, signature)) return null;

    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof decoded.expires !== "number" || decoded.expires < Date.now()) {
      destroyResWebSession();
      return null;
    }
    if (decoded.kind !== "resweb" || typeof decoded.id !== "number") return null;
    return { id: decoded.id };
  } catch {
    return null;
  }
}

export function requireResWeb(): { id: number } {
  const session = getResWebSession();
  if (!session) {
    redirect("/login/res");
  }
  return session;
}

export const RESWEB_COOKIE_NAME = RESWEB_COOKIE;
export const RESWEB_COOKIE_MAX_AGE = RESWEB_MAX_AGE * 1000;
