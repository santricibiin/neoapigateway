import { ProductAdminClient } from "@/components/catalog/product-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.token.findMany({ orderBy: { createdAt: "desc" }, include: { category: true, _count: { select: { transactions: true } } } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return <ProductAdminClient initialProducts={products.map((item) => ({ id: item.id, categoryId: item.categoryId, categoryName: item.category?.name || "Tanpa kategori", sku: item.sku || `LEGACY-${item.id}`, name: item.name, model: item.model, description: item.description || "", price: Number(item.price), stockMode: item.stockMode, stock: item.stock, sold: item.sold, active: item.active, transactionCount: item._count.transactions }))} categories={categories.map((item) => ({ id: item.id, name: item.name }))} />;
}
