"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createShopOrder, getOrderByInvoice, cancelShopOrder } from "@/lib/shop-order";
import { checkPendingByInvoices, MAX_PENDING_ORDERS } from "@/lib/order-limit";
import { ORDER_SCOPE, CANCEL_SCOPE, checkOrderAllowed, recordOrderHit } from "@/lib/order-rate-limit";
import { clientIp } from "@/lib/ip-rate-limit";
import { prisma } from "@/lib/prisma";
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
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { maintenanceEnabled: true, maintenanceText: true },
  });
  if (setting?.maintenanceEnabled) {
    return {
      ok: false,
      error: setting.maintenanceText?.split("\n")[0]?.trim() || "Sistem sedang maintenance. Order ditutup sementara.",
    } as const;
  }

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

  // Rate limit per IP: maks 2 order baru per 15 menit (anti spam create/cancel loop).
  const ip = clientIp(headers());
  const ipAllowed = checkOrderAllowed(ORDER_SCOPE, ip);
  if (!ipAllowed.ok) {
    const mins = Math.ceil(ipAllowed.retryAfterSec / 60);
    return {
      ok: false,
      error: `Terlalu banyak pesanan dibuat. Tunggu ${mins} menit lagi.`,
    } as const;
  }

  // Rate limit server-side: maks 2 order pending per device (cookie httpOnly).
  // Cek DB langsung — tidak bisa dibypass dengan hapus localStorage.
  if (!(await checkPendingByInvoices(readOwnedInvoices()))) {
    return {
      ok: false,
      error: `Anda punya ${MAX_PENDING_ORDERS} pesanan belum dibayar. Lunasi atau batalkan lewat Riwayat sebelum membuat pesanan baru.`,
    } as const;
  }

  const result = await createShopOrder({ tokenId, phone, qty, payMethod, network });
  if (!result.ok) return { ok: false, error: result.error } as const;

  recordOrderHit(ORDER_SCOPE, ip);
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
  // Rate limit per IP: maks 2 cancel per 15 menit (anti spam create/cancel loop).
  const ip = clientIp(headers());
  const ipAllowed = checkOrderAllowed(CANCEL_SCOPE, ip);
  if (!ipAllowed.ok) {
    const mins = Math.ceil(ipAllowed.retryAfterSec / 60);
    return { ok: false, error: `Terlalu banyak pembatalan. Tunggu ${mins} menit lagi.` };
  }
  recordOrderHit(CANCEL_SCOPE, ip);

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

