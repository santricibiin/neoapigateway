import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderClient } from "./order-client";

export default async function OrderPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) notFound();

  const product = await prisma.token.findUnique({
    where: { id, active: true },
    include: { category: true },
  });

  if (!product) notFound();

  return (
    <OrderClient
      product={{
        id: product.id,
        name: product.name,
        model: product.model,
        description: product.description ?? "",
        price: Number(product.price),
        sku: product.sku,
        category: product.category?.name ?? "Lainnya",
        stockMode: product.stockMode,
        stock: product.stock,
      }}
    />
  );
}
