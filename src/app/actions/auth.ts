"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { checkLoginAllowed, formatRetry, recordLoginFail, recordLoginSuccess } from "@/lib/login-rate-limit";
import type { ActionResult } from "@/types";

function clientIp(): string {
  const h = headers();
  return (
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function loginAdmin(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString();
  const ip = clientIp();

  if (!email || !password) {
    return { ok: false, error: "Email dan password wajib diisi" };
  }

  // Rate limit: cek SEBELUM query DB supaya request terkunci tetap murah.
  const allowed = checkLoginAllowed("admin", email, ip);
  if (!allowed.ok) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${formatRetry(allowed.retryAfterSec)}.`,
    };
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      recordLoginFail("admin", email, ip);
      return { ok: false, error: "Email atau password salah" };
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      recordLoginFail("admin", email, ip);
      return { ok: false, error: "Email atau password salah" };
    }

    recordLoginSuccess("admin", email, ip);
    createSession(admin.id);
    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("loginAdmin error:", err);
    return { ok: false, error: "Terjadi kesalahan, coba lagi" };
  }
}

export async function logoutAdmin() {
  const { destroySession } = await import("@/lib/auth");
  destroySession();
  redirect("/login/admin");
}
