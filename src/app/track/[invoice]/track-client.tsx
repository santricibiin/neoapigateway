"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { copyText } from "@/lib/copy";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Receipt,
  ShoppingCart,
  Loader2,
  Search,
} from "lucide-react";

interface TrackOrder {
  invoice: string;
  status: string;
  amount: number;
  qty: number;
  unitPrice: number;
  productName: string;
  productSku: string | null;
  paidAt: string | null;
  expiresAt: string;
  delivered: string | null;
  createdAt: string;
  product: { id: number; name: string; model: string; sku: string | null; category: string } | null;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  processing: "Memproses",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
};

export function TrackClient({ order: initialOrder }: { order: TrackOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [copied, setCopied] = useState(false);

  const isPaid = order.status === "paid";
  const isExpired = order.status === "expired" || order.status === "failed";
  const isPending = order.status === "pending" || order.status === "processing";

  useEffect(() => {
    if (!isPending) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/payment/status/${order.invoice}`, { cache: "no-store" });
        const data = await r.json();
        if (data.ok) {
          setOrder((prev) => ({
            ...prev,
            status: data.status,
            paidAt: data.paidAt ?? prev.paidAt,
            delivered: data.delivered ?? prev.delivered,
          }));
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [order.invoice, isPending]);

  async function copyDelivered() {
    if (!order.delivered) return;
    await copyText(order.delivered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyInvoice() {
    await copyText(order.invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col gap-4 overflow-x-hidden px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <FloatingShapes />

      <Link href="/track" className="relative inline-flex items-center gap-2 text-sm font-bold text-base-ink/70 hover:text-base-ink">
        <ArrowLeft className="h-4 w-4" />
        Cek Order Lain
      </Link>

      <div className="relative rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
            <Receipt className="h-4 w-4" />
            Invoice
          </span>
          <span
            className={`rounded-neo border-2 border-base-ink px-3 py-1 text-xs font-bold ${
              isPaid
                ? "bg-accent-mint"
                : isExpired
                  ? "bg-accent-sun"
                  : "bg-base-bg"
            }`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
          <span className="font-mono text-sm font-bold">{order.invoice}</span>
          <button
            onClick={copyInvoice}
            className="inline-flex items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          {order.paidAt && (
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-base-ink/60">Tanggal Bayar</dt>
              <dd className="font-bold">
                {new Date(order.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-base-ink/60">Produk</dt>
            <dd className="text-right font-bold">{order.productName}</dd>
          </div>
          {order.productSku && (
            <div className="flex justify-between gap-2">
              <dt className="font-semibold text-base-ink/60">SKU</dt>
              <dd className="font-mono font-bold">{order.productSku}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-base-ink/60">Qty</dt>
            <dd className="font-bold">{order.qty}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-base-ink/60">Harga Satuan</dt>
            <dd className="font-bold">{formatRupiah(order.unitPrice)}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-2 border-t-2 border-base-ink/10 pt-2">
            <dt className="font-extrabold">Total</dt>
            <dd className="text-lg font-extrabold">{formatRupiah(order.amount)}</dd>
          </div>
        </dl>
      </div>

      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-neo border-2 border-base-ink bg-accent-sky p-4 text-center shadow-neo-sm"
        >
          <Clock className="mx-auto h-8 w-8 animate-pulse" />
          <p className="mt-2 text-sm font-bold">Menunggu pembayaran…</p>
          <p className="text-xs text-base-ink/70">Status diperbarui otomatis.</p>
        </motion.div>
      )}

      {isPaid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint p-5 text-center shadow-neo"
        >
          <CheckCircle2 className="h-10 w-10" />
          <h3 className="text-lg font-extrabold">Pembayaran Berhasil</h3>
        </motion.div>
      )}

      {isPaid && order.delivered && (
        <div className="rounded-neo border-2 border-base-ink bg-base-bg p-4 shadow-neo-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
              <ShoppingCart className="h-4 w-4" />
              Detail Produk
            </span>
            <button
              onClick={copyDelivered}
              className="inline-flex items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{order.delivered}</pre>
        </div>
      )}

      {isExpired && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sun p-5 text-center shadow-neo"
        >
          <XCircle className="h-10 w-10" />
          <h3 className="text-lg font-extrabold">Invoice {STATUS_LABEL[order.status]}</h3>
          <p className="text-sm text-base-ink/70">Buat order baru jika ingin membeli.</p>
        </motion.div>
      )}

      {order.product && (
        <Link href={`/order/${order.product.id}`}>
          <Button variant="outline" className="w-full">
            Beli Produk Ini Lagi
          </Button>
        </Link>
      )}

      <Link href="/products">
        <Button variant="primary" className="w-full">
          Kembali ke Katalog
        </Button>
      </Link>
    </div>
  );
}
