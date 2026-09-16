"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { destroyResWebSession, getResWebSession } from "@/lib/resweb-auth";
import { API_KEY_PATTERN } from "@/lib/reseller-api-auth";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

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
  if (!API_KEY_PATTERN.test(apiKey)) return { ok: false, error: "API key harus format res_ + 64 karakter hex (klik Generate)" };

  try {
    await prisma.resellerWeb.update({ where: { id: session.id }, data: { apiKey } });
    revalidatePath("/res/settings");
    return { ok: true, apiKey };
  } catch {
    return { ok: false, error: "API key sudah digunakan" };
  }
}
