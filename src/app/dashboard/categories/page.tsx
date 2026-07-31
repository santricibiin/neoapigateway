import { CategoryAdminClient } from "@/components/catalog/category-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { products: true } } } });
  return <CategoryAdminClient initialCategories={categories.map((item) => ({ id: item.id, name: item.name, active: item.active, productCount: item._count.products, createdAt: item.createdAt.toISOString() }))} />;
}
