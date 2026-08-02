import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "neo_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

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

export function createSession(adminId: number) {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({ id: adminId, expires });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encoded);
  const token = `${encoded}.${signature}`;

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export function getSession(): { id: number } | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const [encoded, signature] = raw.split(".");
    if (!encoded || !signature) return null;
    if (!verify(encoded, signature)) return null;

    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof decoded.expires !== "number" || decoded.expires < Date.now()) {
      destroySession();
      return null;
    }
    if (typeof decoded.id !== "number") return null;
    return { id: decoded.id };
  } catch {
    return null;
  }
}

export function requireAdmin() {
  const session = getSession();
  if (!session) {
    redirect("/login/admin");
  }
  return session;
}
