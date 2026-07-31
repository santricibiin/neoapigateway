import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "neo_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function createSession(adminId: number) {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({ id: adminId, expires });
  cookies().set(SESSION_COOKIE, btoa(payload), {
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
    const decoded = JSON.parse(atob(raw));
    if (decoded.expires < Date.now()) {
      destroySession();
      return null;
    }
    return { id: decoded.id as number };
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
