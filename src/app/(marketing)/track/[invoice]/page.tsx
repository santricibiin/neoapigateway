import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TrackClient } from "./track-client";
import { INVOICE_SCOPE, checkIpAllowed, clientIp, recordInvoiceHit, recordInvoiceMiss } from "@/lib/ip-rate-limit";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: { invoice: string } }) {
  const invoice = params.invoice.trim();
  if (!invoice) notFound();

  // Anti brute-force: IP terkunci setelah 3x invoice tidak ditemukan.
  const ip = clientIp(headers());
  const allowed = checkIpAllowed(INVOICE_SCOPE, ip);
  if (!allowed.ok) {
    redirect(`/track?locked=${allowed.retryAfterSec}`);
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { token: { include: { category: true } } },
  });

  if (!order) {
    recordInvoiceMiss(INVOICE_SCOPE, ip);
    notFound();
  }
  recordInvoiceHit(INVOICE_SCOPE, ip);

  return (
    <TrackClient
      order={{
        invoice: order.invoice,
        status: order.status,
        amount: order.amount,
        currency: (order.currency as "idr" | "usdt") ?? "idr",
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
