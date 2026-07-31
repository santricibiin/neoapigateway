"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, ReceiptText, Search, TriangleAlert, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { updateTransactionStatus } from "@/app/actions/transactions";

type Transaction = { id: number; reference: string; buyerName: string; buyerEmail: string; productName: string; productSku: string; categoryName: string; qty: number; unitPrice: number; amount: number; status: string; failureReason: string | null; createdAt: string; expiresAt: string | null; paidAt: string | null };
const PAGE_SIZE = 10;
const statuses = ["all", "pending", "processing", "paid", "failed", "expired", "cancelled"];

const statusStyle: Record<string, string> = { pending: "bg-accent-sun", processing: "bg-accent-sky", paid: "bg-accent-mint", failed: "bg-red-200", expired: "bg-orange-200", cancelled: "bg-base-bg" };

export function TransactionAdminClient({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [action, setAction] = useState<{ item: Transaction; next: "paid" | "failed" | "cancelled" } | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return initialTransactions.filter((item) => (status === "all" || item.status === status) && (!term || `${item.reference} ${item.buyerName} ${item.buyerEmail} ${item.productName} ${item.productSku}`.toLowerCase().includes(term))); }, [initialTransactions, query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totals = useMemo(() => ({ total: initialTransactions.length, paid: initialTransactions.filter((item) => item.status === "paid").length, pending: initialTransactions.filter((item) => item.status === "pending").length, revenue: initialTransactions.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0) }), [initialTransactions]);

  function filter(next: string) {
    setStatus(next);
    setPage(1);
  }

  async function confirmAction() {
    if (!action) return;
    setLoading(true);
    setError(null);
    const result = await updateTransactionStatus(action.item.id, action.item.status, action.next, reason);
    setLoading(false);
    if (!result.ok) return setError(result.error || "Gagal memperbarui transaksi");
    setAction(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-lavender shadow-neo-sm"><ReceiptText className="h-5 w-5" /></span><div><h1 className="text-2xl font-black">Transaksi</h1><p className="text-sm font-semibold text-base-ink/55">Pantau pembayaran dan status pesanan</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Total transaksi" value={totals.total.toLocaleString("id-ID")} color="bg-accent-sky" /><Summary label="Lunas" value={totals.paid.toLocaleString("id-ID")} color="bg-accent-mint" /><Summary label="Menunggu" value={totals.pending.toLocaleString("id-ID")} color="bg-accent-sun" /><Summary label="Pendapatan" value={`Rp ${totals.revenue.toLocaleString("id-ID")}`} color="bg-accent-lavender" /></div>
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-2 lg:grid-cols-[1fr_220px]"><label className="flex h-11 items-center gap-2 rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm"><Search className="h-4 w-4 text-base-ink/45" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari invoice, pembeli, email, produk..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></label><select value={status} onChange={(event) => filter(event.target.value)} className="rounded-neo border-2 border-base-ink bg-white px-3 text-sm font-bold shadow-neo-sm">{statuses.map((item) => <option key={item} value={item}>{item === "all" ? "Semua status" : item}</option>)}</select></div>
      <div className="overflow-hidden rounded-neo border-2 border-base-ink bg-white shadow-neo"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left"><thead className="bg-base-ink text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Pembeli</th><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y-2 divide-base-ink/15">{visible.map((item, index) => <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.025 }} className="hover:bg-accent-sky/10"><td className="px-4 py-3"><p className="font-mono text-xs font-black">{item.reference}</p><p className="text-[10px] font-bold text-base-ink/40">ID #{item.id}</p></td><td className="px-4 py-3"><p className="text-sm font-black">{item.buyerName}</p><p className="text-xs font-semibold text-base-ink/50">{item.buyerEmail}</p></td><td className="px-4 py-3"><p className="text-sm font-black">{item.productName}</p><p className="font-mono text-[10px] font-bold text-base-ink/45">{item.productSku} · {item.qty}x</p></td><td className="px-4 py-3 text-sm font-black">Rp {item.amount.toLocaleString("id-ID")}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border-2 border-base-ink px-2.5 py-1 text-[10px] font-black uppercase ${statusStyle[item.status] || "bg-base-bg"}`}>{item.status}</span></td><td className="px-4 py-3 text-xs font-bold">{new Date(item.createdAt).toLocaleString("id-ID")}</td><td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDetail(item)}><Eye className="h-4 w-4" /></Button>{!["paid", "cancelled"].includes(item.status) ? <Button size="sm" variant="mint" onClick={() => { setError(null); setAction({ item, next: "paid" }); }}><CheckCircle2 className="h-4 w-4" /></Button> : null}{["pending", "processing"].includes(item.status) ? <Button size="sm" className="bg-red-200 text-base-ink" onClick={() => { setError(null); setAction({ item, next: "failed" }); }}><XCircle className="h-4 w-4" /></Button> : null}</div></td></motion.tr>)}</tbody></table></div>{!visible.length ? <div className="py-16 text-center"><ReceiptText className="mx-auto h-9 w-9 text-base-ink/20" /><p className="mt-3 font-black">Transaksi tidak ditemukan</p></div> : null}</div>
      {filtered.length ? <div className="flex flex-col items-center justify-between gap-3 sm:flex-row"><p className="text-xs font-bold text-base-ink/50">Menampilkan {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /> Sebelum</Button><span className="flex items-center rounded-neo border-2 border-base-ink bg-accent-sun px-3 text-xs font-black">{page}/{totalPages}</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Lanjut <ChevronRight className="h-4 w-4" /></Button></div></div> : null}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Detail Transaksi">{detail ? <div className="space-y-2"><Detail label="Invoice" value={detail.reference} mono /><Detail label="Pembeli" value={detail.buyerName} /><Detail label="Email" value={detail.buyerEmail} /><Detail label="Produk" value={`${detail.productName} (${detail.productSku})`} /><Detail label="Kategori" value={detail.categoryName} /><Detail label="Jumlah" value={`${detail.qty} x Rp ${detail.unitPrice.toLocaleString("id-ID")}`} /><Detail label="Total" value={`Rp ${detail.amount.toLocaleString("id-ID")}`} accent /><Detail label="Status" value={detail.status} /><Detail label="Dibuat" value={new Date(detail.createdAt).toLocaleString("id-ID")} />{detail.paidAt ? <Detail label="Dibayar" value={new Date(detail.paidAt).toLocaleString("id-ID")} /> : null}{detail.failureReason ? <Detail label="Alasan gagal" value={detail.failureReason} /> : null}</div> : null}</Modal>
      <Modal open={Boolean(action)} onClose={() => setAction(null)} title={action?.next === "paid" ? "Konfirmasi Pembayaran" : "Tandai Gagal"}>{action ? <div className="space-y-4"><div className={`rounded-neo border-2 border-base-ink p-4 ${action.next === "paid" ? "bg-accent-mint" : "bg-red-200"}`}><p className="font-black">{action.item.reference}</p><p className="text-sm font-bold">{action.item.buyerName} · {action.item.productName}</p><p className="mt-1 text-lg font-black">Rp {action.item.amount.toLocaleString("id-ID")}</p></div>{action.next === "paid" ? <p className="text-sm font-bold text-base-ink/60">Produk stok angka akan otomatis dikurangi {action.item.qty} dan jumlah terjual bertambah.</p> : <label className="block text-sm font-bold">Alasan<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1.5 w-full rounded-neo border-2 border-base-ink p-3 shadow-neo-sm outline-none" /></label>}{error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}<Button className="w-full" variant={action.next === "paid" ? "mint" : "primary"} disabled={loading} onClick={() => void confirmAction()}>{loading ? "Memproses..." : action.next === "paid" ? "Ya, Tandai Lunas" : "Ya, Tandai Gagal"}</Button></div> : null}</Modal>
    </div>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return <motion.div whileHover={{ y: -3 }} className={`rounded-neo border-2 border-base-ink p-4 shadow-neo-sm ${color}`}><p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">{label}</p><p className="mt-1 text-xl font-black">{value}</p></motion.div>;
}

function Detail({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return <div className={`flex items-start justify-between gap-3 rounded-neo border-2 border-base-ink px-3 py-2 ${accent ? "bg-accent-sun" : "bg-base-bg"}`}><span className="text-[10px] font-black uppercase text-base-ink/45">{label}</span><span className={`break-all text-right text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</span></div>;
}
