"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { createOrder } from "@/app/actions/payment";
import { copyText } from "@/lib/copy";
import {
  ArrowLeft,
  Loader2,
} from "lucide-react";

// Custom SVG Icons
const ShoppingCartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M2 2h1.5l.3 1.5M7 13h10l4-8H5.5M7 13L5.5 3.5M7 13l-2 6h14l-2-6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 9l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const CopyIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 10h-5a2 2 0 00-2 2v0a2 2 0 002 2h5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17" cy="12" r="1" fill="currentColor"/>
  </svg>
);

const ReceiptIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface Product {
  id: number;
  name: string;
  model: string;
  description: string;
  price: number;
  sku: string | null;
  category: string;
  stockMode: string;
  stock: number;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface OrderHistoryItem {
  invoice: string;
  productName: string;
  amount: number;
  createdAt: number;
  status: string;
  delivered?: string;
  paidAt?: string;
}

const HISTORY_KEY = "neo-order-history";

function readHistory(): OrderHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeHistory(items: OrderHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // ignore quota
  }
}

function saveOrderHistory(item: OrderHistoryItem) {
  const items = readHistory().filter((i) => i.invoice !== item.invoice);
  items.unshift(item);
  writeHistory(items);
}

function updateOrderHistory(invoice: string, status: string, delivered?: string) {
  const items = readHistory();
  const idx = items.findIndex((i) => i.invoice === invoice);
  if (idx === -1) return;
  items[idx].status = status;
  if (delivered) items[idx].delivered = delivered;
  if (status === "paid") items[idx].paidAt = new Date().toISOString();
  writeHistory(items);
}

export function OrderClient({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<{
    invoice: string;
    amount: number;
    uniqueCode: number;
    qrisPayload: string;
    provider: string;
    expiresAt: string;
    ttlMinutes: number;
  } | null>(null);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [delivered, setDelivered] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("tokenId", String(product.id));
    formData.set("qty", String(qty));

    const res = await createOrder(formData);
    setLoading(false);

    if (!res.ok || !res.data) {
      setError(res.error ?? "Gagal membuat order");
      return;
    }

    const o = res.data;
    setOrder({
      invoice: o.invoice,
      amount: o.amount,
      uniqueCode: o.uniqueCode,
      qrisPayload: o.qrisPayload,
      provider: o.provider,
      expiresAt: o.expiresAt.toISOString(),
      ttlMinutes: o.ttlMinutes,
    });
    setStatus("pending");
    setDelivered(null);
    setPaidAt(null);
    setModalOpen(true);

    saveOrderHistory({
      invoice: o.invoice,
      productName: product.name,
      amount: o.amount,
      createdAt: Date.now(),
      status: "pending",
    });

    try {
      const url = await QRCode.toDataURL(o.qrisPayload, { width: 512, margin: 2 });
      setQrUrl(url);
    } catch {
      setError("Gagal membuat kode QR");
    }
  }

  useEffect(() => {
    if (!order) return;

    const expires = new Date(order.expiresAt);
    setCountdown(formatCountdown(expires));

    const timer = setInterval(() => {
      setCountdown(formatCountdown(expires));
    }, 1000);

    const check = async () => {
      try {
        const r = await fetch(`/api/payment/status/${order.invoice}`);
        const data = await r.json();
        if (data.ok) {
          setStatus(data.status);
          if (data.delivered) setDelivered(data.delivered);
          if (data.paidAt) setPaidAt(data.paidAt);
          if (data.status === "paid") {
            updateOrderHistory(order.invoice, "paid", data.delivered || undefined);
          }
        }
      } catch (err) {
        console.error("status poll error", err);
      }
    };

    check();
    const poller = setInterval(check, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [order]);

  async function copyAmount() {
    if (!order) return;
    await copyText(String(order.amount));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyDelivered() {
    if (!delivered) return;
    await copyText(delivered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isPaid = status === "paid";
  const isExpired = status === "expired" || status === "failed";

  function openHistory() {
    setHistory(readHistory());
    setHistoryOpen(true);
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col gap-4 overflow-x-hidden px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <FloatingShapes />
      <Link href="/products" className="relative inline-flex items-center gap-2 text-sm font-bold text-base-ink/70 hover:text-base-ink">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Produk
      </Link>

      <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-base-ink/50">
          {product.category} · {product.model}
        </div>
        <h1 className="text-xl font-extrabold sm:text-2xl">{product.name}</h1>
        {product.description && (
          <p className="mt-2 text-sm text-base-ink/70">{product.description}</p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold">{formatRupiah(product.price)}</div>
          {product.sku && (
            <div className="rounded-neo border-2 border-base-ink bg-base-bg px-2 py-1 text-xs font-bold">
              {product.sku}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
        <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <ShoppingCartIcon />
            Jumlah
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-neo border-2 border-base-ink bg-base-bg font-bold shadow-neo-sm"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-neo border-2 border-base-ink bg-base-surface py-2 text-center font-bold shadow-neo-sm"
            />
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-neo border-2 border-base-ink bg-base-bg font-bold shadow-neo-sm"
            >
              +
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-neo border-2 border-base-ink bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WalletIcon />}
          {loading ? "Membuat Invoice..." : "Lanjutkan Pembayaran"}
        </Button>

        {order && !isPaid && !modalOpen && (
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setModalOpen(true)}>
            <ClockIcon />
            Lihat Invoice
          </Button>
        )}

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={openHistory}>
          <ReceiptIcon />
          Riwayat Pesanan
        </Button>
      </form>

      <Modal
        open={modalOpen && !!order}
        onClose={() => setModalOpen(false)}
        title={isPaid ? "Pembayaran Berhasil" : isExpired ? "Invoice Kedaluwarsa" : "Scan QRIS untuk Bayar"}
        className="max-w-md max-h-[90vh] overflow-y-auto"
      >
        {order && (
          <div className="relative flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              {!isPaid && !isExpired && (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex w-full flex-col items-center gap-4"
                >
                  <div className="w-full rounded-neo border-2 border-base-ink bg-accent-sun p-3 text-center shadow-neo-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-base-ink/60">No. Invoice</div>
                    <div className="mt-0.5 break-all font-mono text-sm font-extrabold">{order.invoice}</div>
                    <p className="mt-1.5 text-[10px] font-bold text-base-ink/70">
                      ⚠️ Simpan nomor invoice untuk cek pesanan
                    </p>
                  </div>

                  <div className="rounded-neo border-2 border-base-ink bg-white p-3 shadow-neo">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QRIS" className="h-48 w-48 max-w-full sm:h-56 sm:w-56" />
                    ) : (
                      <div className="flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
                        <Loader2 className="h-8 w-8 animate-spin text-base-ink/40" />
                      </div>
                    )}
                  </div>

                  <div className="w-full rounded-neo border-2 border-base-ink bg-base-bg p-4 text-center shadow-neo-sm">
                    <div className="text-xs font-bold uppercase text-base-ink/50">Total yang harus dibayar</div>
                    <div className="mt-1 text-2xl font-extrabold">{formatRupiah(order.amount)}</div>
                    <div className="mt-1 text-xs font-semibold text-base-ink/60">
                      Harga {formatRupiah(order.amount - order.uniqueCode)} + kode unik {formatRupiah(order.uniqueCode)}
                    </div>
                    <button
                      onClick={copyAmount}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-1.5 text-xs font-bold shadow-neo-sm"
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                      {copied ? "Tersalin" : "Salin Nominal"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-base-ink/70">
                    <ClockIcon />
                    Berlaku {countdown}
                  </div>

                  <div className="text-center text-xs text-base-ink/60">
                    Bayar tepat sesuai nominal. Pembayaran akan dicek otomatis.
                  </div>
                </motion.div>
              )}

              {isPaid && (
                <motion.div
                  key="paid"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex w-full flex-col items-center gap-3"
                >
                  <div className="flex w-full flex-col items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint p-6 text-center shadow-neo">
                    <CheckCircleIcon />
                    <h3 className="text-xl font-extrabold">Pembayaran Berhasil!</h3>
                  </div>

                  <div className="w-full rounded-neo border-2 border-base-ink bg-base-surface p-4 shadow-neo">
                    <div className="mb-3 flex items-center gap-2 border-b-2 border-base-ink/10 pb-2">
                      <ReceiptIcon className="h-4 w-4" />
                      <span className="text-sm font-extrabold uppercase tracking-wide">Invoice</span>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-base-ink/60">No. Invoice</dt>
                        <dd className="font-mono font-bold">{order.invoice}</dd>
                      </div>
                      {paidAt && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-semibold text-base-ink/60">Tanggal</dt>
                          <dd className="font-bold">
                            {new Date(paidAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-base-ink/60">Produk</dt>
                        <dd className="text-right font-bold">{product.name}</dd>
                      </div>
                      {product.sku && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-semibold text-base-ink/60">SKU</dt>
                          <dd className="font-mono font-bold">{product.sku}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-base-ink/60">Qty</dt>
                        <dd className="font-bold">{qty}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="font-semibold text-base-ink/60">Harga Satuan</dt>
                        <dd className="font-bold">{formatRupiah(order.amount - order.uniqueCode)}</dd>
                      </div>
                      {order.uniqueCode > 0 && (
                        <div className="flex justify-between gap-2">
                          <dt className="font-semibold text-base-ink/60">Kode Unik</dt>
                          <dd className="font-bold">{formatRupiah(order.uniqueCode)}</dd>
                        </div>
                      )}
                      <div className="mt-2 flex justify-between gap-2 border-t-2 border-base-ink/10 pt-2">
                        <dt className="font-extrabold">Total Dibayar</dt>
                        <dd className="text-lg font-extrabold">{formatRupiah(order.amount)}</dd>
                      </div>
                    </dl>
                  </div>

                  {delivered && (
                    <div className="w-full rounded-neo border-2 border-base-ink bg-base-bg p-4 shadow-neo-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
                          <ShoppingCartIcon />
                          Detail Produk
                        </span>
                        <button
                          onClick={copyDelivered}
                          className="inline-flex items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
                        >
                          <CopyIcon className="h-3 w-3" />
                          {copied ? "Tersalin" : "Salin"}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{delivered}</pre>
                    </div>
                  )}

                  <Link href="/products" className="w-full">
                    <Button variant="primary" className="w-full">
                      Kembali Belanja
                    </Button>
                  </Link>
                </motion.div>
              )}

              {isExpired && (
                <motion.div
                  key="expired"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex w-full flex-col items-center gap-3 rounded-neo border-2 border-base-ink bg-accent-sun p-6 text-center shadow-neo"
                >
                  <XCircleIcon />
                  <h3 className="text-xl font-extrabold">Invoice Kedaluwarsa</h3>
                  <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-base-ink/60">No. Invoice</div>
                    <div className="mt-0.5 break-all font-mono text-sm font-extrabold">{order.invoice}</div>
                  </div>
                  <p className="text-sm text-base-ink/70">
                    Silakan buat order baru jika ingin membayar.
                  </p>
                  <Link href={`/track/${order.invoice}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      Cek Pesanan
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setOrder(null)}>
                    Tutup
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Riwayat Pesanan"
        className="w-[calc(100vw-2rem)] max-w-sm"
      >
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-base-ink/60">
            Belum ada riwayat pesanan.
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {history.map((item) => (
              <Link
                key={item.invoice}
                href={`/track/${item.invoice}`}
                className="block rounded-neo border-2 border-base-ink bg-base-bg p-3 shadow-neo-sm transition-shadow hover:shadow-neo"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="break-all font-mono text-xs font-bold">{item.invoice}</span>
                  <span
                    className={`shrink-0 rounded-neo border-2 border-base-ink px-2 py-0.5 text-[10px] font-bold ${
                      item.status === "paid"
                        ? "bg-accent-mint"
                        : item.status === "expired" || item.status === "failed"
                          ? "bg-accent-sun"
                          : "bg-base-surface"
                    }`}
                  >
                    {item.status === "paid"
                      ? "Lunas"
                      : item.status === "expired" || item.status === "failed"
                        ? "Kedaluwarsa"
                        : "Pending"}
                  </span>
                </div>
                <div className="mt-1 break-words text-sm font-bold">{item.productName}</div>
                <div className="mt-0.5 break-words text-xs text-base-ink/60">
                  {formatRupiah(item.amount)} ·{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
