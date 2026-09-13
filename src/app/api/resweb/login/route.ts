import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createResWebSessionToken,
  RESWEB_COOKIE_MAX_AGE,
  RESWEB_COOKIE_NAME,
} from "@/lib/resweb-auth";
import { checkLoginAllowed, formatRetry, recordLoginFail, recordLoginSuccess } from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const ip =
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email dan password wajib diisi" }, { status: 400 });
  }

  // Rate limit: cek sebelum DB + bcrypt supaya request terkunci tetap murah.
  const allowed = checkLoginAllowed("resweb", email, ip);
  if (!allowed.ok) {
    return NextResponse.json(
      { ok: false, error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${formatRetry(allowed.retryAfterSec)}.` },
      { status: 429 }
    );
  }

  const reseller = await prisma.resellerWeb.findUnique({ where: { email } });
  if (!reseller || !reseller.active || !(await bcrypt.compare(password, reseller.password))) {
    recordLoginFail("resweb", email, ip);
    return NextResponse.json({ ok: false, error: "Email atau password salah" }, { status: 401 });
  }

  recordLoginSuccess("resweb", email, ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RESWEB_COOKIE_NAME, createResWebSessionToken(reseller.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: RESWEB_COOKIE_MAX_AGE / 1000,
    path: "/",
  });
  return response;
}
