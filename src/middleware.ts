import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "neo_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000;

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

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifySignature(encoded: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    return toBase64Url(digest) === signature;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    let authed = false;
    if (raw) {
      try {
        const [encoded, signature] = raw.split(".");
        if (encoded && signature && await verifySignature(encoded, signature)) {
          const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
          const decoded = JSON.parse(atob(padded));
          if (
            typeof decoded.expires === "number" &&
            typeof decoded.id === "number" &&
            decoded.expires > Date.now() &&
            decoded.expires <= Date.now() + SESSION_MAX_AGE
          ) {
            authed = true;
          }
        }
      } catch {
        authed = false;
      }
    }
    if (!authed) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login/admin";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
