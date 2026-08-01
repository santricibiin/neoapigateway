import { TransactionAdminClient } from "@/components/transactions/transaction-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const orders = await prisma.paymentOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { token: { include: { category: true } } },
    take: 200,
  });

  return (
    <TransactionAdminClient
      initialTransactions={orders.map((o) => ({
        id: 0,
        reference: o.invoice,
        buyerName: o.buyerPhone || "—",
        buyerEmail: "—",
        productName: o.productName,
        productSku: o.productSku || o.token.sku || `SKU-${o.tokenId}`,
        categoryName: o.token.category?.name || "Tanpa kategori",
        qty: o.qty,
        unitPrice: o.unitPrice,
        amount: o.amount,
        status: o.status,
        failureReason: null,
        delivered: o.delivered,
        createdAt: o.createdAt.toISOString(),
        expiresAt: o.expiresAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
      }))}
    />
  );
}
