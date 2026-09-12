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

/**
 * Renumber posisi urutan produk dalam satu kategori menjadi 1..N berurutan.
 * Dipanggil setelah create/update produk supaya angka urutan selalu rapat
 * (tidak ada loncatan setelah produk dihapus/dipindah posisi).
 */
async function renumberCategoryOrder(categoryId: number) {
  const items = await prisma.token.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    items.map((item, index) =>
      prisma.token.update({
        where: { id: item.id },
        data: { sortOrder: index + 1 },
      })
    )
  );
}

export async function createProduct(formData: FormData) {
  requireAdmin();
  const data = parseProduct(formData);
  if ("error" in data) return { ok: false, error: data.error };
  if (!await prisma.category.findUnique({ where: { id: data.categoryId } })) return { ok: false, error: "Kategori tidak ditemukan" };
  try {
    // Posisi baru: sisipkan di posisi yang diminta (default paling bawah).
    const count = await prisma.token.count({ where: { categoryId: data.categoryId } });
    const wanted = data.sortOrder >= 1 ? data.sortOrder : count + 1;
    data.sortOrder = Math.max(1, Math.min(wanted, count + 1));
    await prisma.token.create({ data });
    await renumberCategoryOrder(data.categoryId);
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
    const count = await prisma.token.count({ where: { categoryId: data.categoryId } });
    const wanted = data.sortOrder >= 1 ? data.sortOrder : 1;
    data.sortOrder = Math.max(1, Math.min(wanted, Math.max(1, count)));
    await prisma.token.update({ where: { id }, data });
    await renumberCategoryOrder(data.categoryId);
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui produk atau SKU sudah dipakai" };
  }
}

export async function deleteProduct(id: number) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID produk tidak valid" };
  const [transactions, orders, product] = await Promise.all([
    prisma.transaction.count({ where: { tokenId: id } }),
    prisma.paymentOrder.count({ where: { tokenId: id } }),
    prisma.token.findUnique({ where: { id }, select: { sku: true, categoryId: true } }),
  ]);
  if (!product) return { ok: false, error: "Produk tidak ditemukan" };
  if (transactions || orders) {
    // Soft delete: produk punya riwayat penjualan yang tidak boleh hilang.
    // Arsipkan (nonaktif + SKU di-suffix) supaya SKU aslinya bisa dipakai ulang.
    const suffix = `-DEL-${Date.now().toString(36).toUpperCase()}`;
    const baseSku = (product.sku || `SKU${id}`).slice(0, 50 - suffix.length);
    try {
      await prisma.token.update({
        where: { id },
        data: { active: false, sku: `${baseSku}${suffix}` },
      });
      revalidatePath("/dashboard/tokens");
      return { ok: true, archived: true, message: `Produk diarsipkan (nonaktif) karena punya ${transactions + orders} riwayat transaksi. SKU lama bebas dipakai ulang.` };
    } catch {
      return { ok: false, error: "Gagal mengarsipkan produk" };
    }
  }
  try {
    await prisma.token.delete({ where: { id } });
    // Rapatkan posisi urutan sisanya dalam kategori (1..N tanpa lubang).
    if (product.categoryId != null) await renumberCategoryOrder(product.categoryId);
    revalidatePath("/dashboard/tokens");
    return { ok: true, archived: false, message: "Produk dihapus permanen." };
  } catch {
    return { ok: false, error: "Gagal menghapus produk" };
  }
}
