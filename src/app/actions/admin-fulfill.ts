"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { QUOTA_PACKAGES, provisionCustomerKey, formatBandelDelivery } from "@/lib/bandelbanget";
import type { ActionResult } from "@/types";

/**
 * Admin manual fulfill: selesaikan transaksi (pending/expired/failed/processing → paid)
 * & buat produk. Bypass status check (admin override).
 */
export async function forceFulfillOrder(invoice: string): Promise<ActionResult<{ delivered: string }>> {
  requireAdmin();

  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { token: true },
  });
  if (!order) return { ok: false, error: "Order tidak ditemukan" };
  if (order.status === "paid" && order.delivered) {
    return { ok: true, data: { delivered: order.delivered } };
  }

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const stockMode = order.token.stockMode as "counted" | "external";
  let delivered = "";

  try {
    if (stockMode === "counted") {
      if (order.token.stock < order.qty) {
        return { ok: false, error: "Stok tidak cukup" };
      }
      await prisma.token.update({
        where: { id: order.token.id },
        data: { stock: { decrement: order.qty }, sold: { increment: order.qty } },
      });
      delivered = `${order.qty}x ${order.token.name}`;
    } else {
      const code = (order.productSku || order.token.sku || order.token.model || "").toUpperCase();
      const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
      if (!pack) return { ok: false, error: `Kode produk ${code} tidak dikenal` };
      if (!setting?.secretKey) return { ok: false, error: "Secret Key belum diatur" };

      const created = await provisionCustomerKey(
        setting.secretKey,
        pack.tokens * order.qty,
        pack.validDays,
        setting.pin || undefined
      );
      delivered = formatBandelDelivery(created, code);
    }

    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "paid", delivered, paidAt: order.paidAt ?? new Date() },
    });

    revalidatePath("/dashboard/transactions");
    return { ok: true, data: { delivered } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal fulfill" };
  }
}
