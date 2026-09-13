"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createShopOrder, getOrderByInvoice, cancelShopOrder } from "@/lib/shop-order";
import { checkPendingByInvoices, MAX_PENDING_ORDERS } from "@/lib/order-limit";
import type { ActionResult } from "@/types";

/**
 * Kepemilikan order web: cookie httpOnly berisi daftar invoice yang dibuat
 * di device ini. Cancel hanya boleh untuk invoice milik device — mencegah
 * orang lain membatalkan order pending milik orang lain hanya dengan
 * menebak invoice.
 */
const ORDERS_COOKIE = "neo_orders";
const ORDERS_COOKIE_MAX = 50;

function readOwnedInvoices(): string[] {
  const raw = cookies().get(ORDERS_COOKIE)?.value || "";
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function addOwnedInvoice(invoice: string) {
  const list = [invoice, ...readOwnedInvoices().filter((i) => i !== invoice)].slice(0, ORDERS_COOKIE_MAX);
  cookies().set(ORDERS_COOKIE, JSON.stringify(list), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

function removeOwnedInvoice(invoice: string) {
  const list = readOwnedInvoices().filter((i) => i !== invoice);
  cookies().set(ORDERS_COOKIE, JSON.stringify(list), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createOrder(formData: FormData) {
  const tokenId = Number(formData.get("tokenId"));
  const phone = String(formData.get("phone") || "").trim() || undefined;
  const qty = Number(formData.get("qty") || "1");
  const payMethodRaw = String(formData.get("payMethod") || "qris");
  const network_ = String(formData.get("network") || "").trim().toUpperCase() || null;

  if (!Number.isInteger(tokenId) || tokenId < 1) {
    return { ok: false, error: "Produk tidak valid" } as const;
  }
  if (!Number.isInteger(qty) || qty < 1) {
    return { ok: false, error: "Jumlah tidak valid" } as const;
  }
  const payMethod =
    payMethodRaw === "binancepay" || payMethodRaw === "usdt" ? payMethodRaw : ("qris" as const);
  const usdtNetworks = ["TRC20", "BEP20", "ERC20", "SOL"] as const;
  const network: (typeof usdtNetworks)[number] | null =
    payMethod === "usdt" && usdtNetworks.includes(network_ as (typeof usdtNetworks)[number])
      ? (network_ as (typeof usdtNetworks)[number])
      : null;
  if (payMethod === "usdt" && !network) {
    return { ok: false, error: "Network USDT tidak valid" } as const;
  }

  // Rate limit server-side: maks 3 order pending per device (cookie httpOnly).
  // Cek DB langsung — tidak bisa dibypass dengan hapus localStorage.
  if (!(await checkPendingByInvoices(readOwnedInvoices()))) {
    return {
      ok: false,
      error: `Anda punya ${MAX_PENDING_ORDERS} pesanan belum dibayar. Lunasi atau batalkan lewat Riwayat sebelum membuat pesanan baru.`,
    } as const;
  }

  const result = await createShopOrder({ tokenId, phone, qty, payMethod, network });
  if (!result.ok) return { ok: false, error: result.error } as const;

  addOwnedInvoice(result.invoice);
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
  // Ownership check: hanya order yang dibuat di device ini (cookie httpOnly).
  // Order dibuat sebelum update ini tidak ada di cookie → tunggu expire otomatis.
  if (!readOwnedInvoices().includes(invoice)) {
    return { ok: false, error: "Pesanan tidak ditemukan di perangkat ini" };
  }
  // Only pending orders can be cancelled; paid/processing/delivering orders are protected.
  const res = await cancelShopOrder(invoice);
  if (!res.ok) return { ok: false, error: res.error };
  removeOwnedInvoice(invoice);
  revalidatePath("/order");
  return { ok: true };
}

