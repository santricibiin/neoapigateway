"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function getPublicProducts() {
  try {
    const tokens = await prisma.token.findMany({
      where: { active: true, category: { active: true } },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return { ok: true, data: tokens } as const;
  } catch {
    return { ok: false, error: "Gagal memuat produk" } as const;
  }
}

function parseProduct(formData: FormData) {
  const categoryId = Number(formData.get("categoryId"));
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price"));
  const costPrice = Number(formData.get("costPrice"));
  const stock = Number(formData.get("stock"));
  const stockMode = String(formData.get("stockMode") || "counted");
  const active = formData.get("active") === "on";
  const sortOrder = Number(formData.get("sortOrder"));
  if (!Number.isInteger(categoryId) || categoryId < 1) return { error: "Pilih kategori" } as const;
  if (!sku || sku.length > 50 || !/^[A-Z0-9_-]+$/.test(sku)) return { error: "SKU wajib 1-50 karakter: huruf, angka, _ atau -" } as const;
  if (name.length < 1 || name.length > 200) return { error: "Nama produk harus 1-200 karakter" } as const;
  if (model.length < 1 || model.length > 100) return { error: "Model harus 1-100 karakter" } as const;
  if (description.length > 4000) return { error: "Deskripsi maksimal 4000 karakter" } as const;
  if (!Number.isFinite(price) || price < 0 || price > 2_000_000_000) return { error: "Harga tidak valid" } as const;
  if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > 2_000_000_000) return { error: "Harga modal tidak valid" } as const;
  if (!Number.isInteger(stock) || stock < 0 || stock > 2_000_000_000) return { error: "Stok tidak valid" } as const;
  if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < -2_000_000_000 || sortOrder > 2_000_000_000) return { error: "Urutan tidak valid" } as const;
  if (!(["counted", "external"] as string[]).includes(stockMode)) return { error: "Mode stok tidak valid" } as const;
  return { categoryId, sku, name, model, description: description || null, price, costPrice, stock: stockMode === "external" ? 0 : stock, stockMode, active, sortOrder };
}

export async function createProduct(formData: FormData) {
  requireAdmin();
  const data = parseProduct(formData);
  if ("error" in data) return { ok: false, error: data.error };
  if (!await prisma.category.findUnique({ where: { id: data.categoryId } })) return { ok: false, error: "Kategori tidak ditemukan" };
  try {
    await prisma.token.create({ data });
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "SKU sudah digunakan" };
  }
}

export async function updateProduct(id: number, formData: FormData) {
  requireAdmin();
  const data = parseProduct(formData);
  if (!Number.isInteger(id) || id < 1 || "error" in data) return { ok: false, error: "error" in data ? data.error : "ID produk tidak valid" };
  if (!await prisma.category.findUnique({ where: { id: data.categoryId } })) return { ok: false, error: "Kategori tidak ditemukan" };
  try {
    await prisma.token.update({ where: { id }, data });
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui produk atau SKU sudah dipakai" };
  }
}

export async function deleteProduct(id: number) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID produk tidak valid" };
  const transactions = await prisma.transaction.count({ where: { tokenId: id } });
  if (transactions) return { ok: false, error: `Produk memiliki ${transactions} transaksi. Nonaktifkan produk, jangan hapus.` };
  try {
    await prisma.token.delete({ where: { id } });
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus produk" };
  }
}
