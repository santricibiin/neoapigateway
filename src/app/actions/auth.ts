"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import type { ActionResult } from "@/types";

export async function loginAdmin(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { ok: false, error: "Email dan password wajib diisi" };
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return { ok: false, error: "Email atau password salah" };
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return { ok: false, error: "Email atau password salah" };
    }

    createSession(admin.id);
  } catch (err) {
    console.error("loginAdmin error:", err);
    return { ok: false, error: "Terjadi kesalahan, coba lagi" };
  }

  redirect("/dashboard");
}

export async function logoutAdmin() {
  const { destroySession } = await import("@/lib/auth");
  destroySession();
  redirect("/login/admin");
}
