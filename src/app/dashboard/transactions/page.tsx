import { TransactionAdminClient } from "@/components/transactions/transaction-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, include: { token: { include: { category: true } } } });
  return <TransactionAdminClient initialTransactions={transactions.map((item) => ({ id: item.id, reference: item.reference || `TRX-${String(item.id).padStart(6, "0")}`, buyerName: item.buyerName, buyerEmail: item.buyerEmail, productName: item.productName || item.token.name, productSku: item.productSku || item.token.sku || `LEGACY-${item.token.id}`, categoryName: item.token.category?.name || "Tanpa kategori", qty: item.qty, unitPrice: Number(item.unitPrice ?? item.amount), amount: Number(item.amount), status: item.status === "success" ? "paid" : item.status, failureReason: item.failureReason, createdAt: item.createdAt.toISOString(), expiresAt: item.expiresAt?.toISOString() || null, paidAt: item.paidAt?.toISOString() || null }))} />;
}
