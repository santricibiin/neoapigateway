"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createResWebSession, destroyResWebSession, getResWebSession } from "@/lib/resweb-auth";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

export async function loginResWeb(formData: FormData): Promise<ActionResult & { redirect?: string }> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { ok: false, error: "Email dan password wajib diisi" };
  }

  try {
    const reseller = await prisma.resellerWeb.findUnique({ where: { email } });
    if (!reseller || !reseller.active) {
      return { ok: false, error: "Email atau password salah" };
    }

    const valid = await bcrypt.compare(password, reseller.password);
    if (!valid) {
      return { ok: false, error: "Email atau password salah" };
    }

    createResWebSession(reseller.id);
    console.log("[resweb] session created for", reseller.email, "redirect to /res");
    return { ok: true, redirect: "/res" };
  } catch (err) {
    console.error("[resweb] login error:", err);
    return { ok: false, error: "Terjadi kesalahan, coba lagi" };
  }
}

export async function logoutResWeb() {
  destroyResWebSession();
  redirect("/login/res");
}

export async function updateResellerPassword(formData: FormData): Promise<ActionResult> {
  const session = getResWebSession();
  if (!session) return { ok: false, error: "Sesi berakhir, silakan login ulang" };

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  if (!current || !next) return { ok: false, error: "Password lama dan baru wajib diisi" };
  if (next.length < 6) return { ok: false, error: "Password baru minimal 6 karakter" };

  const reseller = await prisma.resellerWeb.findUnique({ where: { id: session.id }, select: { password: true } });
  if (!reseller) return { ok: false, error: "Akun tidak ditemukan" };

  const valid = await bcrypt.compare(current, reseller.password);
  if (!valid) return { ok: false, error: "Password lama salah" };

  const hash = await bcrypt.hash(next, 10);
  await prisma.resellerWeb.update({ where: { id: session.id }, data: { password: hash } });
  return { ok: true };
}

export async function updateResellerApiKey(formData: FormData): Promise<ActionResult & { apiKey?: string }> {
  const session = getResWebSession();
  if (!session) return { ok: false, error: "Sesi berakhir, silakan login ulang" };

  const apiKey = String(formData.get("apiKey") || "").trim();
  if (!apiKey) return { ok: false, error: "API key wajib diisi" };
  if (apiKey.length < 8) return { ok: false, error: "API key minimal 8 karakter" };
  if (apiKey.length > 128) return { ok: false, error: "API key maksimal 128 karakter" };

  try {
    await prisma.resellerWeb.update({ where: { id: session.id }, data: { apiKey } });
    revalidatePath("/res/settings");
    return { ok: true, apiKey };
  } catch {
    return { ok: false, error: "API key sudah digunakan" };
  }
}
