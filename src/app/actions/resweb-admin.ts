"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";
import type { ActionResult } from "@/types";

const VALID_CODES = Object.keys(QUOTA_PACKAGES);

/** Normalisasi & validasi nomor WA: terima 08xx/62xx/8xx → 62xxx. */
function parseWaNumber(raw: string): { wa?: string; error?: string } {
  const s = raw.replace(/[\s\-()]/g, "");
  if (!s) return { wa: undefined };
  const digits = s.replace(/^\+/, "");
  if (!/^\d{9,16}$/.test(digits)) return { error: "Nomor WhatsApp tidak valid (9-16 digit)" };
  const normalized = digits.startsWith("62")
    ? digits
    : digits.startsWith("0")
      ? `62${digits.slice(1)}`
      : `62${digits}`;
  if (!/^62\d{8,14}$/.test(normalized)) return { error: "Nomor WhatsApp tidak valid" };
  return { wa: normalized };
}

/** Normalisasi username Telegram: terima @xxx / t.me/xxx / xxx → xxx. Wajib minimal salah satu WA/TG. */
function parseTelegram(raw: string): { tg?: string; error?: string } {
  const s = raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?t\.me\//i, "").replace(/\/+$/, "");
  if (!s) return { tg: undefined };
  if (!/^[A-Za-z0-9_]{4,32}$/.test(s)) {
    return { error: "Username Telegram tidak valid (4-32 karakter, huruf/angka/underscore)" };
  }
  return { tg: s };
}

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

export async function deleteResWebTier(id: number): Promise<ActionResult<{ note?: string }>> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };

  // Paket yang sudah dipakai transaksi tidak bisa dihapus permanen (FK Restrict).
  // Soft-delete: nonaktifkan supaya hilang dari daftar, history transaksi tetap utuh.
  const orderCount = await prisma.resellerWebOrder.count({ where: { tierId: id } });
  if (orderCount > 0) {
    await prisma.resellerWebTier.update({ where: { id }, data: { active: false } });
    revalidatePath("/dashboard/resweb");
    return {
      ok: true,
      data: {
        note: `Paket sudah dipakai di ${orderCount} transaksi. Tidak dihapus permanen, tetapi dinonaktifkan (disembunyikan dari daftar).`,
      },
    };
  }

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
  const apiKey = String(formData.get("apiKey") || "").trim();
  const wa = String(formData.get("wa") || "").trim();
  const tg = String(formData.get("telegram") || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Email tidak valid" };
  if (name.length < 1 || name.length > 200) return { ok: false, error: "Nama harus 1-200 karakter" };
  if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
  if (apiKey && apiKey.length < 8) return { ok: false, error: "API key minimal 8 karakter" };
  if (apiKey && apiKey.length > 128) return { ok: false, error: "API key maksimal 128 karakter" };
  const parsedWa = parseWaNumber(wa);
  if (parsedWa.error) return { ok: false, error: parsedWa.error };
  const parsedTg = parseTelegram(tg);
  if (parsedTg.error) return { ok: false, error: parsedTg.error };
  if (!parsedWa.wa && !parsedTg.tg) return { ok: false, error: "Minimal isi salah satu: No. WhatsApp atau Telegram" };
  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.resellerWeb.create({ data: { email, name, waNumber: parsedWa.wa, telegram: parsedTg.tg, password: hash, ...(apiKey ? { apiKey } : {}) } });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Email atau API key sudah digunakan" };
  }
}

export async function updateResellerWeb(id: number, formData: FormData): Promise<ActionResult> {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID tidak valid" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const apiKey = String(formData.get("apiKey") || "").trim();
  const wa = String(formData.get("wa") || "").trim();
  const tg = String(formData.get("telegram") || "").trim();
  const active = formData.get("active") === "on";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Email tidak valid" };
  if (name.length < 1 || name.length > 200) return { ok: false, error: "Nama harus 1-200 karakter" };
  if (password && password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
  if (apiKey && apiKey.length < 8) return { ok: false, error: "API key minimal 8 karakter" };
  if (apiKey && apiKey.length > 128) return { ok: false, error: "API key maksimal 128 karakter" };
  const parsedWa = parseWaNumber(wa);
  if (parsedWa.error) return { ok: false, error: parsedWa.error };
  const parsedTg = parseTelegram(tg);
  if (parsedTg.error) return { ok: false, error: parsedTg.error };
  if (!parsedWa.wa && !parsedTg.tg) return { ok: false, error: "Minimal isi salah satu: No. WhatsApp atau Telegram" };
  try {
    await prisma.resellerWeb.update({
      where: { id },
      data: { email, name, active, waNumber: parsedWa.wa, telegram: parsedTg.tg, apiKey: apiKey || null, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
    });
    revalidatePath("/dashboard/resweb");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui reseller atau email/API key sudah digunakan" };
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
  const bigDelta = BigInt(delta);
  if (bigDelta >= BigInt(0)) {
    await prisma.resellerWeb.update({ where: { id }, data: { balance: { increment: bigDelta } } });
  } else {
    const result = await prisma.resellerWeb.updateMany({
      where: { id, balance: { gte: -bigDelta } },
      data: { balance: { increment: bigDelta } },
    });
    if (!result.count) return { ok: false, error: "Saldo tidak boleh negatif" };
  }
  revalidatePath("/dashboard/resweb");
  return { ok: true };
}
