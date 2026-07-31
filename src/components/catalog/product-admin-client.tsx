"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Boxes, CircleDollarSign, PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createProduct, deleteProduct, updateProduct } from "@/app/actions/products";
import { cn } from "@/lib/utils";

type Product = { id: number; categoryId: number | null; categoryName: string; sku: string; name: string; model: string; description: string; price: number; stockMode: string; stock: number; sold: number; active: boolean; transactionCount: number };
type Category = { id: number; name: string };

export function ProductAdminClient({ initialProducts, categories }: { initialProducts: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockMode, setStockMode] = useState("counted");
  const filtered = useMemo(() => initialProducts.filter((item) => { const term = query.trim().toLowerCase(); return (!term || `${item.name} ${item.sku} ${item.model}`.toLowerCase().includes(term)) && (category === "all" || String(item.categoryId) === category) && (status === "all" || (status === "active") === item.active); }), [category, initialProducts, query, status]);

  function show(item: Product | null) {
    setEditing(item);
    setStockMode(item?.stockMode || "counted");
    setError(null);
    setOpen(true);
  }

  async function save(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = editing ? await updateProduct(editing.id, formData) : await createProduct(formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal menyimpan produk");
    setOpen(false);
    router.refresh();
  }

  async function remove(item: Product) {
    if (!window.confirm(`Hapus produk "${item.name}"?`)) return;
    const result = await deleteProduct(item.id);
    if (!result.ok) setError(result.error || "Gagal menghapus produk");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm"><Boxes className="h-5 w-5" /></span><div><h1 className="text-2xl font-black">Produk</h1><p className="text-sm font-semibold text-base-ink/55">Kelola paket, harga, stok, dan model</p></div></div><Button variant="sky" disabled={!categories.length} onClick={() => show(null)}><PackagePlus className="h-4 w-4" /> Tambah Produk</Button></div>
      {!categories.length ? <p className="rounded-neo border-2 border-base-ink bg-accent-sun p-3 text-sm font-bold">Buat kategori aktif sebelum menambahkan produk.</p> : null}
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-2 lg:grid-cols-[1fr_220px_180px]"><label className="flex h-11 items-center gap-2 rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm"><Search className="h-4 w-4 text-base-ink/45" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, SKU, model..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-neo border-2 border-base-ink bg-white px-3 text-sm font-bold shadow-neo-sm"><option value="all">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-neo border-2 border-base-ink bg-white px-3 text-sm font-bold shadow-neo-sm"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, index) => { const available = item.stockMode === "external" || item.stock > 0; return <motion.article key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} whileHover={{ y: -3 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm"><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-accent-lavender/25"><path d="M50 5 95 90H5Z" fill="currentColor" /></svg><div className="relative flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase ${item.active ? "bg-accent-mint" : "bg-base-bg"}`}>{item.active ? "Aktif" : "Nonaktif"}</span><p className="mt-2 font-mono text-[10px] font-bold text-base-ink/45">{item.sku}</p><h2 className="text-xl font-black">{item.name}</h2><p className="text-sm font-bold text-base-ink/50">{item.categoryName} · {item.model}</p></div><CircleDollarSign className="h-6 w-6 shrink-0" /></div><p className="relative mt-4 line-clamp-3 min-h-14 text-sm font-semibold leading-relaxed text-base-ink/65">{item.description || "Tanpa deskripsi"}</p><div className="relative mt-4 grid grid-cols-3 gap-2"><Metric label="Harga" value={`Rp ${item.price.toLocaleString("id-ID")}`} /><Metric label="Stok" value={item.stockMode === "external" ? "External" : item.stock.toLocaleString("id-ID")} /><Metric label="Terjual" value={item.sold.toLocaleString("id-ID")} /></div><div className="relative mt-4 flex items-center justify-between border-t-2 border-base-ink/15 pt-4"><span className={cn("text-xs font-black", available ? "text-green-700" : "text-red-600")}>{available ? "Tersedia" : "Stok habis"}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => show(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" className="bg-red-200 text-base-ink" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /></Button></div></div></motion.article>; })}
      </div>
      {!filtered.length ? <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center"><Boxes className="mx-auto h-10 w-10 text-base-ink/20" /><p className="mt-3 font-black">Produk tidak ditemukan</p></div> : null}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Produk" : "Tambah Produk"} className="max-h-[92vh] overflow-y-auto">
        <form action={save} className="space-y-4"><label className="block text-sm font-bold">Kategori<select name="categoryId" defaultValue={editing?.categoryId || categories[0]?.id} className="mt-1.5 h-11 w-full rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm" required>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Input name="sku" label="SKU / kode" defaultValue={editing?.sku || ""} maxLength={50} required /><Input name="name" label="Nama produk" defaultValue={editing?.name || ""} maxLength={200} required /><Input name="model" label="Model" defaultValue={editing?.model || ""} maxLength={100} required /><Input name="price" label="Harga" type="number" min={0} step={1} defaultValue={editing?.price || 0} required /></div><label className="block text-sm font-bold">Deskripsi<textarea name="description" defaultValue={editing?.description || ""} maxLength={4000} rows={5} className="mt-1.5 w-full resize-y rounded-neo border-2 border-base-ink bg-white px-4 py-3 text-sm font-semibold shadow-neo-sm outline-none" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Mode stok<select name="stockMode" value={stockMode} onChange={(event) => setStockMode(event.target.value)} className="mt-1.5 h-11 w-full rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm"><option value="counted">Stok angka</option><option value="external">External/API</option></select></label><Input name="stock" label="Jumlah stok" type="number" min={0} step={1} defaultValue={editing?.stock || 0} disabled={stockMode === "external"} required={stockMode === "counted"} /></div><label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="h-5 w-5 accent-black" /> Produk aktif</label>{error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}<Button type="submit" className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Produk"}</Button></form>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-neo border-2 border-base-ink bg-base-bg p-2"><p className="text-[9px] font-black uppercase text-base-ink/40">{label}</p><p className="mt-0.5 truncate text-xs font-black">{value}</p></div>;
}
