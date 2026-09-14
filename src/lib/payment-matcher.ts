import { prisma } from "@/lib/prisma";
import { QUOTA_PACKAGES, provisionCustomerKey, formatBandelDelivery, addCustomerQuota, fetchResellerKeys } from "@/lib/bandelbanget";
import { notifyOrderPaid } from "@/lib/telegram-notify";
import type { ActionResult } from "@/types";

/** Claim event dengan order pending yang cocok secara atomic. */
export async function claimPaymentEvent(eventId: string) {
  // Grace period: jangan expire order yang baru saja lewat TTL, notifikasi bank bisa telat.
  const EXPIRE_GRACE_MS = 10 * 60 * 1000;
  await prisma.paymentOrder.updateMany({
    where: { status: "pending", expiresAt: { lte: new Date(Date.now() - EXPIRE_GRACE_MS) } },
    data: { status: "expired" },
  });
  return prisma.$transaction(async (tx) => {
    const event = await tx.paymentEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matched || event.amount == null) return null;

    const order = await tx.paymentOrder.findFirst({
      where: {
        status: "pending",
        // Event forwarder QRIS hanya boleh match order IDR (order USDT diclaim poller Binance).
        currency: "idr",
        // Order gopaymerchant2 diclaim poller gateway (scope trx_id), bukan notif APK.
        qrisProvider: { not: "gopaymerchant2" },
        amount: event.amount,
        // Grace period: order lewat TTL masih bisa diclaim (notifikasi telat)
        expiresAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
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

/**
 * Fulfillment idempotent & anti double-credit:
 * 1. Lock atomik processing → delivering (updateMany guard).
 * 2. Side effect eksternal (bandelapi) DI LUAR transaction.
 * 3. Finalisasi atomik delivering → paid.
 * Crash di tengah tahap 2 meninggalkan order "delivering" (reaper poll-bot akan menandai failed; admin bisa force-fulfill).
 */
export async function fulfillOrder(orderId: string): Promise<ActionResult<{ delivered: string }>> {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { token: true },
  });
  if (!order) return { ok: false, error: "Order tidak ditemukan" };
  if (order.status === "paid" && order.delivered) {
    return { ok: true, data: { delivered: order.delivered } };
  }
  if (order.status === "delivering") {
    return { ok: false, error: "Order sedang dikirim, tunggu sebentar" };
  }
  if (order.status !== "processing") {
    return { ok: false, error: "Order belum dibayar" };
  }

  const locked = await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: "processing" },
    data: { status: "delivering" },
  });
  if (locked.count !== 1) {
    const fresh = await prisma.paymentOrder.findUnique({ where: { id: order.id } });
    if (fresh?.status === "paid" && fresh.delivered) {
      return { ok: true, data: { delivered: fresh.delivered } };
    }
    return { ok: false, error: "Order tidak bisa dikunci untuk pengiriman" };
  }

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const stockMode = order.token.stockMode as "counted" | "external";
  let delivered = "";

  try {
    if (stockMode === "counted") {
      const dec = await prisma.token.updateMany({
        where: { id: order.token.id, stock: { gte: order.qty } },
        data: {
          stock: { decrement: order.qty },
          sold: { increment: order.qty },
        },
      });
      if (dec.count !== 1) throw new Error("Stok tidak cukup");
      delivered = `${order.qty}x ${order.token.name}`;
    } else {
      const code = (order.productSku || order.token.sku || order.token.model || "").toUpperCase();
      const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
      if (!pack) {
        throw new Error(`Kode produk ${code} tidak dikenal untuk kuota`);
      }
      if (!setting?.secretKey) {
        throw new Error("Secret Key Provider belum diatur");
      }

      // Jika ada buyerQuotaToken, tambah kuota ke member yang sudah ada
      if (order.buyerQuotaToken) {
        const keys = await fetchResellerKeys(setting.secretKey);
        const member = keys.keys.find((k) => k.secretToken === order.buyerQuotaToken);
        if (!member) {
          throw new Error("Member tidak ditemukan untuk penambahan kuota");
        }
        const result = await addCustomerQuota(
          setting.secretKey,
          Number(member.id),
          pack.tokens * order.qty,
          pack.validDays
        );
        const memberLabel = member.name ? `${member.name}` : `Member #${member.id}`;
        delivered = `Target: ${memberLabel} · ID #${member.id}${member.keyMasked ? ` · ${member.keyMasked}` : ""}\nKuota +${(pack.tokens * order.qty).toLocaleString("id-ID")} token (${order.qty}x ${code})`;
        if (result.remainingQuota != null) {
          delivered += `\nSisa kuota: ${result.remainingQuota.toLocaleString("id-ID")}`;
        }
      } else {
        // Default: provision key baru (tanpa kredensial — member set sendiri via dashboard)
        const created = await provisionCustomerKey(
          setting.secretKey,
          pack.tokens * order.qty,
          pack.validDays,
          undefined,
          setting.pin || undefined
        );
        delivered = formatBandelDelivery(created, code);
      }
    }
  } catch (e) {
    // Lepaskan lock supaya bisa di-retry
    await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "delivering" },
      data: { status: "processing" },
    });
    const msg = e instanceof Error ? e.message : "Gagal memproses pengiriman";
    return { ok: false, error: msg };
  }

  const done = await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: "delivering" },
    data: { status: "paid", delivered },
  });
  if (done.count !== 1) {
    return { ok: false, error: "Order gagal difinalisasi (status berubah saat pengiriman)" };
  }

  await notifyOrderPaid({
    invoice: order.invoice,
    productName: order.buyerQuotaToken ? "Tambah Kuota" : order.productName,
    productSku: order.productSku,
    qty: order.qty,
    amount: order.amount,
    currency: (order.currency as "idr" | "usdt") ?? "idr",
    buyerPhone: order.buyerPhone,
    telegramUserId: order.telegramUserId,
    paidAt: order.paidAt,
  });

  return { ok: true, data: { delivered } };
}
