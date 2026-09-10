import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrackClient } from "./track-client";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: { invoice: string } }) {
  const invoice = params.invoice.trim();
  if (!invoice) notFound();

  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { token: { include: { category: true } } },
  });

  if (!order) notFound();

  return (
    <TrackClient
      order={{
        invoice: order.invoice,
        status: order.status,
        amount: order.amount,
        qty: order.qty,
        unitPrice: order.unitPrice,
        productName: order.productName,
        productSku: order.productSku,
        paidAt: order.paidAt?.toISOString() ?? null,
        expiresAt: order.expiresAt.toISOString(),
        delivered: order.delivered,
        createdAt: order.createdAt.toISOString(),
        product: order.token
          ? {
              id: order.token.id,
              name: order.token.name,
              model: order.token.model,
              sku: order.token.sku,
              category: order.token.category?.name ?? "Lainnya",
            }
          : null,
      }}
    />
  );
}
