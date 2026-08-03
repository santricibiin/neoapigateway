"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { Wallet, Sparkles, Loader2, Clock, CheckCircle2, XCircle, RefreshCw, Copy, Check, ReceiptText, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Tier = { id: number; code: string; label: string; tokens: number; validDays: number; price: number; sortOrder: number };
type Order = { id: string; invoice: string; amount: number; tokens: number; status: string; tierLabel: string; expiresAt: string; createdAt: string };

function formatTokens(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(0)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("id-ID");
}

function money(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function countdown(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const statusStyle: Record<string, string> = {
  pending: "bg-accent-sun",
  paid: "bg-accent-mint",
  expired: "bg-orange-200",
  failed: "bg-red-200",
};

export function ReswebTopupClient({ tiers, orders: initialOrders }: { tiers: Tier[]; orders: Order[] }) {
  const [creating, setCreating] = useState<number | null>(null);
  const [payment, setPayment] = useState<{ invoice: string; amount: number; qrisPayload: string; expiresAt: string } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);
  const [orders, setOrders] = useState(initialOrders);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(tier: Tier) {
    setCreating(tier.id);
    setError(null);
    try {
      const res = await fetch("/res/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Gagal membuat topup");
        return;
      }
      setPayment({ invoice: data.invoice, amount: data.amount, qrisPayload: data.qrisPayload, expiresAt: data.expiresAt });
      setStatus("pending");
      try {
        const url = await QRCode.toDataURL(data.qrisPayload, { width: 400, margin: 2 });
        setQrUrl(url);
      } catch {}
    } catch {
      setError("Gagal terhubung");
    }
    setCreating(null);
  }

  async function checkStatus() {
    if (!payment) return;
    setChecking(true);
    try {
      const res = await fetch(`/res/api/topup-status?invoice=${encodeURIComponent(payment.invoice)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
        if (data.status === "paid" || data.status === "expired" || data.status === "failed") {
          if (data.status === "paid") {
            // refresh orders
            const r2 = await fetch("/res/api/topup", { cache: "no-store" });
            const d2 = await r2.json();
            if (d2.ok) setOrders(d2.orders);
          }
        }
      }
    } catch {}
    setChecking(false);
  }

  useEffect(() => {
    if (!payment) return;
    if (status === "paid" || status === "expired" || status === "failed") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const poller = setInterval(() => void checkStatus(), 4000);
    return () => { clearInterval(timer); clearInterval(poller); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, status]);

  async function copyAmount() {
    if (!payment) return;
    try {
      await navigator.clipboard.writeText(String(payment.amount));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const isPaid = status === "paid";
  const isExpired = status === "expired" || status === "failed";

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-sun p-5 shadow-neo sm:p-7">
        <motion.svg animate={{ rotate: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-white/35"><path d="M50 5 60 38 94 39 67 58 76 91 50 72 24 91 33 58 6 39 40 38Z" fill="currentColor" /></motion.svg>
        <div className="relative flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-neo border-2 border-base-ink bg-white shadow-neo-sm"><ScanLine className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em]">QRIS Instant</p><h1 className="text-3xl font-black sm:text-4xl">Isi saldo token.</h1><p className="mt-1 text-sm font-bold text-base-ink/60">Pilih paket, scan, saldo masuk otomatis.</p></div></div>
      </motion.section>

      {error && <div className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(t.sortOrder, 8) * 0.04 }}
            whileHover={{ y: -6, rotate: -0.4 }}
            className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm"
          >
            <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 text-accent-mint/25"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-black">{t.label}</p>
                <p className="text-xs font-bold text-base-ink/45">{formatTokens(t.tokens)} token · {t.validDays} hari</p>
              </div>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div className="my-4 border-y-2 border-dashed border-base-ink/20 py-3">
              <p className="text-2xl font-black">{money(t.price)}</p>
            </div>
            <Button variant="primary" className="relative w-full" disabled={creating !== null} onClick={() => void create(t)}>
              {creating === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Pilih Paket
            </Button>
          </motion.div>
        ))}
        {!tiers.length && (
          <div className="col-span-full rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center">
            <Wallet className="mx-auto h-10 w-10 text-base-ink/20" />
            <p className="mt-3 font-black">Belum ada paket topup aktif</p>
          </div>
        )}
      </div>

      <Modal open={Boolean(payment)} onClose={() => { if (!checking) setPayment(null); }} title={isPaid ? "Pembayaran Berhasil" : isExpired ? "Invoice Kedaluwarsa" : "Scan QRIS"} className="max-w-md">
        {payment && (
          <div className="flex flex-col items-center gap-4">
            {!isPaid && !isExpired && (
              <>
                <div className="w-full rounded-neo border-2 border-base-ink bg-accent-sun p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-base-ink/60">No. Invoice</div>
                  <div className="mt-0.5 break-all font-mono text-sm font-extrabold">{payment.invoice}</div>
                </div>
                <div className="rounded-neo border-2 border-base-ink bg-white p-3">
                  {qrUrl ? <img src={qrUrl} alt="QRIS" className="h-56 w-56" /> : <Loader2 className="h-8 w-8 animate-spin" />}
                </div>
                <div className="w-full rounded-neo border-2 border-base-ink bg-base-bg p-4 text-center">
                  <div className="text-xs font-bold uppercase text-base-ink/50">Total Bayar</div>
                  <div className="mt-1 text-2xl font-extrabold">{money(payment.amount)}</div>
                  <button onClick={copyAmount} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent-sky">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Tersalin" : "Salin nominal"}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-base-ink/70">
                  <Clock className="h-4 w-4" /> Berlaku {countdown(payment.expiresAt)}
                </div>
                <p className="text-center text-xs text-base-ink/55">Bayar tepat sesuai nominal. Status dicek otomatis.</p>
                <div className="flex items-center gap-2 text-xs font-bold text-base-ink/50">
                  {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Cek otomatis tiap 4 detik
                </div>
              </>
            )}
            {isPaid && (
              <div className="flex w-full flex-col items-center gap-3 rounded-neo border-2 border-base-ink bg-accent-mint p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <h3 className="text-xl font-extrabold">Pembayaran Berhasil!</h3>
                <p className="text-sm text-base-ink/70">Saldo token telah ditambahkan ke akun Anda.</p>
                <Button variant="primary" className="w-full" onClick={() => { setPayment(null); setQrUrl(null); }}>Tutup</Button>
              </div>
            )}
            {isExpired && (
              <div className="flex w-full flex-col items-center gap-3 rounded-neo border-2 border-base-ink bg-accent-sun p-6 text-center">
                <XCircle className="h-12 w-12 text-red-500" />
                <h3 className="text-xl font-extrabold">Invoice Kedaluwarsa</h3>
                <p className="text-sm text-base-ink/70">Silakan buat topup baru.</p>
                <Button variant="outline" className="w-full" onClick={() => { setPayment(null); setQrUrl(null); }}>Tutup</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Riwayat */}
      <div className="overflow-hidden rounded-neo border-2 border-base-ink bg-white shadow-neo-sm">
        <div className="flex items-center gap-2 border-b-2 border-base-ink bg-accent-lavender p-4">
          <ReceiptText className="h-5 w-5" /><h2 className="font-extrabold">Riwayat Topup</h2>
        </div>
        <div className="divide-y-2 divide-base-ink/10 sm:hidden">
          {orders.length === 0 ? <p className="p-8 text-center text-sm font-bold text-base-ink/40">Belum ada topup</p> : orders.map((o) => <article key={o.id} className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{o.tierLabel} <span className="text-xs text-base-ink/45">{formatTokens(o.tokens)}</span></p><p className="font-mono text-[10px] font-bold text-base-ink/45">{o.invoice}</p></div><span className={cn("rounded-full border-2 border-base-ink px-2 py-0.5 text-[9px] font-black uppercase", statusStyle[o.status] || "bg-base-bg")}>{o.status}</span></div><div className="flex justify-between text-xs font-bold"><span>{money(o.amount)}</span><span className="text-base-ink/45">{new Date(o.createdAt).toLocaleDateString("id-ID")}</span></div></article>)}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-base-ink text-xs uppercase text-white">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-base-ink/15">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center font-bold text-base-ink/40">Belum ada topup</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-[10px] font-bold">{o.invoice}</td>
                  <td className="px-4 py-3 font-bold">{o.tierLabel} <span className="text-[10px] text-base-ink/45">{formatTokens(o.tokens)}</span></td>
                  <td className="px-4 py-3 font-bold">{money(o.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase", statusStyle[o.status] || "bg-base-bg")}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold">{new Date(o.createdAt).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
