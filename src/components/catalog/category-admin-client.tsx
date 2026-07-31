"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions/categories";

type CategoryItem = { id: number; name: string; active: boolean; productCount: number; createdAt: string };

export function CategoryAdminClient({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(() => initialCategories.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())), [initialCategories, query]);

  function show(item: CategoryItem | null) {
    setEditing(item);
    setError(null);
    setOpen(true);
  }

  async function save(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = editing ? await updateCategory(editing.id, formData) : await createCategory(formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal menyimpan kategori");
    setOpen(false);
    router.refresh();
  }

  async function remove(item: CategoryItem) {
    if (!window.confirm(`Hapus kategori "${item.name}"?`)) return;
    const result = await deleteCategory(item.id);
    if (!result.ok) setError(result.error || "Gagal menghapus kategori");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm"><FolderOpen className="h-5 w-5" /></span><div><h1 className="text-2xl font-black">Kategori Produk</h1><p className="text-sm font-semibold text-base-ink/55">Kelompokkan produk agar katalog rapi</p></div></div><Button variant="sun" onClick={() => show(null)}><Plus className="h-4 w-4" /> Tambah Kategori</Button></div>
      <label className="flex h-11 max-w-xl items-center gap-2 rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm"><Search className="h-4 w-4 text-base-ink/45" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kategori..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /></label>
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, index) => <motion.article key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -3 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm"><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 text-accent-sky/20"><circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase ${item.active ? "bg-accent-mint" : "bg-base-bg"}`}>{item.active ? "Aktif" : "Nonaktif"}</span><h2 className="mt-3 text-xl font-black">{item.name}</h2><p className="mt-1 text-sm font-bold text-base-ink/50">{item.productCount} produk</p></div><span className="font-mono text-[10px] font-bold text-base-ink/35">#{item.id}</span></div><div className="relative mt-5 flex gap-2 border-t-2 border-base-ink/15 pt-4"><Button size="sm" variant="outline" onClick={() => show(item)}><Pencil className="h-4 w-4" /> Edit</Button><Button size="sm" className="bg-red-200 text-base-ink" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /> Hapus</Button></div></motion.article>)}
      </div>
      {!filtered.length ? <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center"><FolderOpen className="mx-auto h-10 w-10 text-base-ink/20" /><p className="mt-3 font-black">Kategori tidak ditemukan</p></div> : null}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Kategori" : "Tambah Kategori"}>
        <form action={save} className="space-y-4"><Input name="name" label="Nama kategori" defaultValue={editing?.name || ""} maxLength={100} required /><label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="h-5 w-5 accent-black" /> Kategori aktif</label>{error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}<Button type="submit" className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Kategori"}</Button></form>
      </Modal>
    </div>
  );
}
