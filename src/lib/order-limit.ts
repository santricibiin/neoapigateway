/**
 * Batas order pending per device (server-side, tidak bisa dibypass dari browser).
 * Identitas device:
 *  - Web checkout  : daftar invoice di cookie httpOnly neo_orders
 *  - Member buy    : buyerQuotaToken (token member, kuat)
 *  - Bot Telegram  : telegramUserId (kuat)
 */
import { prisma } from "@/lib/prisma";

export const MAX_PENDING_ORDERS = 3;

async function countPending(extra: {
  invoice?: { in: string[] };
  telegramUserId?: string;
  buyerQuotaToken?: string;
}): Promise<number> {
  return prisma.paymentOrder.count({
    where: {
      status: "pending",
      expiresAt: { gt: new Date() },
      ...extra,
    },
  });
}

export async function checkPendingByInvoices(invoices: string[]): Promise<boolean> {
  if (!invoices.length) return true;
  return (await countPending({ invoice: { in: invoices } })) < MAX_PENDING_ORDERS;
}

export async function checkPendingByBuyerToken(buyerQuotaToken: string): Promise<boolean> {
  return (await countPending({ buyerQuotaToken })) < MAX_PENDING_ORDERS;
}

export async function checkPendingByTelegram(telegramUserId: string): Promise<boolean> {
  return (await countPending({ telegramUserId })) < MAX_PENDING_ORDERS;
}
