import { prisma } from "@/lib/prisma";
import { QUOTA_PACKAGES, provisionCustomerKey, formatBandelDelivery } from "@/lib/bandelbanget";
import type { ActionResult } from "@/types";

/** Claim event dengan order pending yang cocok secara atomic. */
export async function claimPaymentEvent(eventId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.paymentEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matched || event.amount == null) return null;

    const order = await tx.paymentOrder.findFirst({
      where: {
        status: "pending",
        amount: event.amount,
        expiresAt: { gt: new Date() },
        createdAt: { lte: event.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!order) return null;

    const claimed = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: "pending", paymentEventId: null },
      data: {
        status: "processing",
        paymentEventId: event.id,
        paidAt: event.createdAt,
      },
    });
    if (claimed.count !== 1) return null;

    await tx.paymentEvent.update({
      where: { id: event.id },
      data: { matched: true },
    });

    return order;
  });
}

/** Fulfillment idempotent: decrement stok counted atau buat customer key bandelapi. */
export async function fulfillOrder(orderId: string): Promise<ActionResult<{ delivered: string }>> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({
      where: { id: orderId },
      include: { token: true },
    });
    if (!order) return { ok: false, error: "Order tidak ditemukan" };
    if (order.status === "paid" && order.delivered) {
      return { ok: true, data: { delivered: order.delivered } };
    }
    if (order.status !== "processing") {
      return { ok: false, error: "Order belum dibayar" };
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const stockMode = order.token.stockMode as "counted" | "external";
    let delivered = "";

    if (stockMode === "counted") {
      if (order.token.stock < order.qty) {
        return { ok: false, error: "Stok tidak cukup" };
      }
      await tx.token.update({
        where: { id: order.token.id },
        data: {
          stock: { decrement: order.qty },
          sold: { increment: order.qty },
        },
      });
      delivered = `${order.qty}x ${order.token.name}`;
    } else {
      const code = (order.productSku || order.token.sku || order.token.model || "").toUpperCase();
      const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
      if (!pack) {
        return { ok: false, error: `Kode produk ${code} tidak dikenal untuk kuota` };
      }
      if (!setting?.secretKey) {
        return { ok: false, error: "Secret Key BandelBanget belum diatur" };
      }

      try {
        const created = await provisionCustomerKey(
          setting.secretKey,
          pack.tokens * order.qty,
          pack.validDays,
          setting.pin || undefined
        );
        delivered = formatBandelDelivery(created, code);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal membuat customer key";
        return { ok: false, error: msg };
      }
    }

    await tx.paymentOrder.update({
      where: { id: order.id },
      data: { status: "paid", delivered },
    });

    return { ok: true, data: { delivered } };
  });
}
