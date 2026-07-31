"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const allowed = ["paid", "failed", "cancelled"] as const;

export async function updateTransactionStatus(id: number, expectedStatus: string, nextStatus: string, reason?: string) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1 || !allowed.includes(nextStatus as typeof allowed[number])) return { ok: false, error: "Aksi transaksi tidak valid" };
  const transaction = await prisma.transaction.findUnique({ where: { id }, include: { token: true } });
  if (!transaction) return { ok: false, error: "Transaksi tidak ditemukan" };
  if (transaction.status !== expectedStatus) return { ok: false, error: "Status transaksi sudah berubah. Muat ulang halaman." };
  if (["paid", "success", "cancelled"].includes(transaction.status)) return { ok: false, error: "Transaksi ini sudah final" };
  try {
    await prisma.$transaction(async (tx) => {
      if (nextStatus === "paid") {
        if (transaction.token.stockMode === "counted") {
          const stock = await tx.token.updateMany({ where: { id: transaction.tokenId, stock: { gte: transaction.qty } }, data: { stock: { decrement: transaction.qty }, sold: { increment: transaction.qty } } });
          if (!stock.count) throw new Error("Stok produk tidak mencukupi");
        } else {
          await tx.token.update({ where: { id: transaction.tokenId }, data: { sold: { increment: transaction.qty } } });
        }
      }
      const updated = await tx.transaction.updateMany({
        where: { id, status: expectedStatus },
        data: {
          status: nextStatus,
          paidAt: nextStatus === "paid" ? new Date() : null,
          failedAt: nextStatus === "failed" ? new Date() : null,
          cancelledAt: nextStatus === "cancelled" ? new Date() : null,
          failureReason: nextStatus === "failed" ? String(reason || "Ditandai gagal oleh admin").slice(0, 2000) : null,
        },
      });
      if (!updated.count) throw new Error("Status transaksi berubah saat diproses");
    });
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/tokens");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal memperbarui transaksi" };
  }
}
