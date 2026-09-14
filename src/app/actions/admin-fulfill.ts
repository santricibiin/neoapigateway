"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { QUOTA_PACKAGES, provisionCustomerKey, formatBandelDelivery, fetchResellerKeys, addCustomerQuota } from "@/lib/bandelbanget";
import { notifyOrderPaid, notifyTopupPaid } from "@/lib/telegram-notify";
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

  // Lock atomik supaya retry/concurrent admin tidak double-provision
  const FORCEABLE = ["pending", "processing", "delivering", "expired", "failed"];
  const locked = await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: { in: FORCEABLE } },
    data: { status: "delivering" },
  });
  if (locked.count !== 1) {
    return { ok: false, error: "Order sedang diproses lain" };
  }

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const stockMode = order.token.stockMode as "counted" | "external";
  let delivered = "";

  try {
    if (stockMode === "counted") {
      const dec = await prisma.token.updateMany({
        where: { id: order.token.id, stock: { gte: order.qty } },
        data: { stock: { decrement: order.qty }, sold: { increment: order.qty } },
      });
      if (dec.count !== 1) throw new Error("Stok tidak cukup");
      delivered = `${order.qty}x ${order.token.name}`;
    } else {
      const code = (order.productSku || order.token.sku || order.token.model || "").toUpperCase();
      const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
      if (!pack) throw new Error(`Kode produk ${code} tidak dikenal`);
      if (!setting?.secretKey) throw new Error("Secret Key belum diatur");

      if (order.buyerQuotaToken) {
        // Topup kuota dari dashboard member: tambah kuota ke key yang sudah ada,
        // bukan provision key baru (mencegah token ganda untuk member yang sama).
        const keys = await fetchResellerKeys(setting.secretKey);
        const member = keys.keys.find((k) => k.secretToken === order.buyerQuotaToken);
        if (!member) throw new Error("Member tidak ditemukan untuk penambahan kuota");
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

    const done = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "delivering" },
      data: { status: "paid", delivered, paidAt: order.paidAt ?? new Date() },
    });
    if (done.count !== 1) {
      return { ok: false, error: "Order gagal difinalisasi (status berubah)" };
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

    revalidatePath("/dashboard/transactions");
    return { ok: true, data: { delivered } };
  } catch (e) {
    // Kembalikan status semula supaya bisa di-retry
    await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "delivering" },
      data: { status: order.status },
    });
    return { ok: false, error: e instanceof Error ? e.message : "Gagal fulfill" };
  }
}

/**
 * Admin manual fulfill untuk order topup reseller web (pending/processing/expired/failed → paid).
 * Kuota dikreditkan ke saldo ResellerWeb (balance), bukan membuat token baru.
 * Atomik & idempotent: status guard mencegah double-credit saat retry.
 */
export async function forceFulfillReswebOrder(invoice: string): Promise<ActionResult<{ delivered: string }>> {
  requireAdmin();

  const order = await prisma.resellerWebOrder.findUnique({
    where: { invoice },
    include: { reseller: { select: { name: true } }, tier: { select: { code: true, label: true } } },
  });
  if (!order) return { ok: false, error: "Order tidak ditemukan" };
  if (order.status === "paid") {
    return { ok: true, data: { delivered: `${Number(order.tokens).toLocaleString("id-ID")} token sudah masuk ke saldo reseller` } };
  }

  const FORCEABLE = ["pending", "processing", "expired", "failed"];
  const done = await prisma.$transaction(async (tx) => {
    const locked = await tx.resellerWebOrder.updateMany({
      where: { id: order.id, status: { in: FORCEABLE } },
      data: { status: "paid", paidAt: order.paidAt ?? new Date() },
    });
    if (locked.count !== 1) return false;
    await tx.resellerWeb.update({
      where: { id: order.resellerId },
      data: { balance: { increment: order.tokens } },
    });
    return true;
  });

  if (!done) {
    return { ok: false, error: "Order sedang diproses lain" };
  }

  await notifyTopupPaid({
    invoice: order.invoice,
    tokens: `${Number(order.tokens).toLocaleString("id-ID")}`,
    resellerId: order.resellerId,
    amount: order.amount,
    paidAt: order.paidAt,
  });

  revalidatePath("/dashboard/transactions");
  return {
    ok: true,
    data: {
      delivered: `${Number(order.tokens).toLocaleString("id-ID")} token masuk ke saldo ${order.reseller.name} (${order.tier.label})`,
    },
  };
}
