import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "neo_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    let authed = false;
    if (raw) {
      try {
        const decoded = JSON.parse(Buffer.from(raw, "base64").toString());
        if (decoded.expires > Date.now() && decoded.expires <= Date.now() + SESSION_MAX_AGE) {
          authed = true;
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
