import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PayClient } from "./pay-client";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: { invoice: string } }) {
  const invoice = params.invoice.trim().toUpperCase();
  if (!invoice) notFound();

  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { token: true },
  });

  if (!order) notFound();

  return (
    <PayClient
      order={{
        invoice: order.invoice,
        status: order.status,
        amount: order.amount,
        currency: (order.currency as "idr" | "usdt") ?? "idr",
        payMethod: (order.payMethod as "qris" | "binancepay" | "usdt") ?? "qris",
        qty: order.qty,
        unitPrice: order.unitPrice,
        productName: order.productName,
        productSku: order.productSku,
        qrisPayload: order.qrisPayload,
        expiresAt: order.expiresAt.toISOString(),
        delivered: order.delivered,
        paidAt: order.paidAt?.toISOString() ?? null,
        productId: order.token?.id ?? null,
      }}
    />
  );
}
