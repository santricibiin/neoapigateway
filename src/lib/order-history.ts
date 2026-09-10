"use client";

/**
 * Riwayat pesanan user di localStorage (per-browser, max 50 item).
 * Dipakai bersama oleh page order (tulis) dan page pay (update status).
 */

export interface OrderHistoryItem {
  invoice: string;
  productName: string;
  amount: number;
  createdAt: number;
  status: string;
  delivered?: string;
  paidAt?: string;
}

const HISTORY_KEY = "neo-order-history";

export function readOrderHistory(): OrderHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeHistory(items: OrderHistoryItem[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // ignore quota
  }
}

export function saveOrderHistory(item: OrderHistoryItem) {
  const items = readOrderHistory().filter((i) => i.invoice !== item.invoice);
  items.unshift(item);
  writeHistory(items);
}

export function updateOrderHistory(invoice: string, status: string, delivered?: string) {
  const items = readOrderHistory();
  const idx = items.findIndex((i) => i.invoice === invoice);
  if (idx === -1) return;
  items[idx].status = status;
  if (delivered) items[idx].delivered = delivered;
  if (status === "paid") items[idx].paidAt = new Date().toISOString();
  writeHistory(items);
}
