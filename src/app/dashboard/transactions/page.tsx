import { TransactionAdminClient } from "@/components/transactions/transaction-admin-client";
import { prisma } from "@/lib/prisma";
import { expireOverdueOrders } from "@/lib/shop-order";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  await expireOverdueOrders();
  const [orders, reswebOrders] = await Promise.all([
    prisma.paymentOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { token: { include: { category: true } } },
      take: 200,
    }),
    prisma.resellerWebOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { reseller: { select: { name: true, email: true } }, tier: { select: { code: true, label: true } } },
      take: 200,
    }),
  ]);

  const transactions = [
    ...orders.map((o) => ({
      reference: o.invoice,
      buyerName: o.buyerPhone || "—",
      productName: o.productName,
      productSku: o.productSku || o.token.sku || `SKU-${o.tokenId}`,
      categoryName: o.token.category?.name || "Tanpa kategori",
      qty: o.qty,
      unitPrice: o.unitPrice,
      amount: o.amount,
      status: o.status,
      delivered: o.delivered,
      createdAt: o.createdAt.toISOString(),
      expiresAt: o.expiresAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || null,
      source: "Toko" as const,
    })),
    ...reswebOrders.map((o) => ({
      reference: o.invoice,
      buyerName: `${o.reseller.name} · ${o.reseller.email}`,
      productName: `Topup ResWeb ${o.tier.label}`,
      productSku: o.tier.code,
      categoryName: "Reseller Web",
      qty: 1,
      unitPrice: o.unitPrice,
      amount: o.amount,
      status: o.status,
      delivered: o.status === "paid" ? `${Number(o.tokens).toLocaleString("id-ID")} token masuk ke saldo reseller` : null,
      createdAt: o.createdAt.toISOString(),
      expiresAt: o.expiresAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || null,
      source: "ResWeb" as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 200);

  return (
    <TransactionAdminClient
      initialTransactions={transactions}
    />
  );
}
