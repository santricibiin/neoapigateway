"use server";

import { revalidatePath } from "next/cache";
import { createShopOrder, getOrderByInvoice, cancelShopOrder } from "@/lib/shop-order";
import { claimPaymentEvent, fulfillOrder } from "@/lib/payment-matcher";
import type { ActionResult } from "@/types";

export async function createOrder(formData: FormData) {
  const tokenId = Number(formData.get("tokenId"));
  const phone = String(formData.get("phone") || "").trim() || undefined;
  const qty = Number(formData.get("qty") || "1");

  if (!Number.isInteger(tokenId) || tokenId < 1) {
    return { ok: false, error: "Produk tidak valid" } as const;
  }

  const result = await createShopOrder({ tokenId, phone, qty });
  if (!result.ok) return { ok: false, error: result.error } as const;

  revalidatePath(`/order/${tokenId}`);
  return { ok: true, data: result } as const;
}

export async function checkOrderStatus(
  invoice: string
): Promise<ActionResult<{ status: string; paidAt: Date | null; amount: number; delivered: string | null }>> {
  const order = await getOrderByInvoice(invoice);
  if (!order) return { ok: false, error: "Transaksi tidak ditemukan" };
  return {
    ok: true,
    data: {
      status: order.status,
      paidAt: order.paidAt,
      amount: order.amount,
      delivered: order.delivered,
    },
  };
}

export async function cancelOrder(invoice: string): Promise<ActionResult> {
  const res = await cancelShopOrder(invoice);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/order");
  return { ok: true };
}

export { claimPaymentEvent, fulfillOrder };
