import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createResWebSessionToken,
  RESWEB_COOKIE_MAX_AGE,
  RESWEB_COOKIE_NAME,
} from "@/lib/resweb-auth";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email dan password wajib diisi" }, { status: 400 });
  }

  const reseller = await prisma.resellerWeb.findUnique({ where: { email } });
  if (!reseller || !reseller.active || !(await bcrypt.compare(password, reseller.password))) {
    return NextResponse.json({ ok: false, error: "Email atau password salah" }, { status: 401 });
  }

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
