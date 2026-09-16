import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PayClient } from "./pay-client";
import { INVOICE_SCOPE, checkIpAllowed, clientIp, recordInvoiceHit, recordInvoiceMiss } from "@/lib/ip-rate-limit";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: { invoice: string } }) {
  const invoice = params.invoice.trim().toUpperCase();
  if (!invoice) notFound();

  // Anti brute-force: IP terkunci setelah 3x invoice tidak ditemukan.
  const ip = clientIp(headers());
  const allowed = checkIpAllowed(INVOICE_SCOPE, ip);
  if (!allowed.ok) {
    redirect(`/track?locked=${allowed.retryAfterSec}`);
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { token: true },
  });

  if (!order) {
    const { lockedForSec } = recordInvoiceMiss(INVOICE_SCOPE, ip);
    if (lockedForSec) redirect(`/track?locked=${lockedForSec}`);
    notFound();
  }
  recordInvoiceHit(INVOICE_SCOPE, ip);

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
