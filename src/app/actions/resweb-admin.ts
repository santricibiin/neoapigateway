"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";
import type { ActionResult } from "@/types";

const VALID_CODES = Object.keys(QUOTA_PACKAGES);

function parseTier(formData: FormData) {
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  const price = Number(formData.get("price"));
  const costPrice = Number(formData.get("costPrice"));
  const active = formData.get("active") === "on";
  const sortOrder = Number(formData.get("sortOrder"));
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  if (!pack) return { error: `Kode harus salah satu: ${VALID_CODES.join(", ")}` } as const;
  if (label.length < 1 || label.length > 50) return { error: "Label harus 1-50 karakter" } as const;
  if (!Number.isFinite(price) || price < 0 || price > 2_000_000_000) return { error: "Harga tidak valid" } as const;
  if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > 2_000_000_000) return { error: "Harga modal tidak valid" } as const;
  if (!Number.isInteger(sortOrder) || sortOrder < -2_000_000_000 || sortOrder > 2_000_000_000) return { error: "Urutan tidak valid" } as const;
  return { code, label, tokens: pack.tokens, validDays: pack.validDays, price, costPrice, active, sortOrder } as const;
}

export async function createResWebTier(formData: FormData): Promise<ActionResult> {
  requireAdmin();
  const data = parseTier(formData);
  if ("error" in data) return { ok: false, error: data.error };
  try {
    await prisma.resellerWebTier.create({ data });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Kode paket sudah digunakan" };
  }
}

export async function updateResWebTier(id: number, formData: FormData): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  const data = parseTier(formData);
  if ("error" in data) return { ok: false, error: data.error };
  try {
    await prisma.resellerWebTier.update({ where: { id }, data });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui paket" };
  }
}

export async function deleteResWebTier(id: number): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  try {
    await prisma.resellerWebTier.delete({ where: { id } });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus paket" };
  }
}

export async function createResellerWeb(formData: FormData): Promise<ActionResult> {
  requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Email tidak valid" };
  if (name.length < 1 || name.length > 200) return { ok: false, error: "Nama harus 1-200 karakter" };
  if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.resellerWeb.create({ data: { email, name, password: hash } });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Email sudah digunakan" };
  }
}

export async function updateResellerWeb(id: number, formData: FormData): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const active = formData.get("active") === "on";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Email tidak valid" };
  if (name.length < 1 || name.length > 200) return { ok: false, error: "Nama harus 1-200 karakter" };
  if (password && password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
  try {
    await prisma.resellerWeb.update({
      where: { id },
      data: { email, name, active, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
    });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui reseller atau email sudah digunakan" };
  }
}

export async function toggleResellerWebActive(id: number): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  const r = await prisma.resellerWeb.findUnique({ where: { id }, select: { active: true } });
  if (!r) return { ok: false, error: "Reseller tidak ditemukan" };
  await prisma.resellerWeb.update({ where: { id }, data: { active: !r.active } });
  revalidatePath("/dashboard/resweb");
  return { ok: true };
}

export async function resetResellerWebPassword(id: number, password: string): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
  const hash = await bcrypt.hash(password, 10);
  await prisma.resellerWeb.update({ where: { id }, data: { password: hash } });
  revalidatePath("/dashboard/resweb");
  return { ok: true };
}

export async function adjustResellerWebBalance(id: number, delta: number): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  if (!Number.isInteger(delta)) return { ok: false, error: "Delta tidak valid" };
  const reseller = await prisma.resellerWeb.findUnique({ where: { id }, select: { balance: true } });
  if (!reseller) return { ok: false, error: "Reseller tidak ditemukan" };
  if (reseller.balance + BigInt(delta) < BigInt(0)) return { ok: false, error: "Saldo tidak boleh negatif" };
  await prisma.resellerWeb.update({ where: { id }, data: { balance: { increment: BigInt(delta) } } });
  revalidatePath("/dashboard/resweb");
  return { ok: true };
}
