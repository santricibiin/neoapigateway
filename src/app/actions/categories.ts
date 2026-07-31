"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function nameOf(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  return name.length >= 1 && name.length <= 100 ? name : null;
}

export async function createCategory(formData: FormData) {
  requireAdmin();
  const name = nameOf(formData);
  if (!name) return { ok: false, error: "Nama kategori harus 1-100 karakter" };
  try {
    await prisma.category.create({ data: { name } });
    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "Nama kategori sudah dipakai" };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  requireAdmin();
  const name = nameOf(formData);
  if (!Number.isInteger(id) || id < 1 || !name) return { ok: false, error: "Data kategori tidak valid" };
  try {
    await prisma.category.update({ where: { id }, data: { name, active: formData.get("active") === "on" } });
    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui kategori" };
  }
}

export async function deleteCategory(id: number) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID kategori tidak valid" };
  const used = await prisma.token.count({ where: { categoryId: id } });
  if (used) return { ok: false, error: `Kategori masih digunakan oleh ${used} produk` };
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/dashboard/categories");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus kategori" };
  }
}
