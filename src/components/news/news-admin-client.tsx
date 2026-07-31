"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, FilePenLine, Megaphone, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createNews, deleteNews, toggleNews, updateNews } from "@/app/actions/news";

type NewsItem = { id: number; title: string; content: string; active: boolean; createdAt: string; updatedAt: string };

export function NewsAdminClient({ initialNews }: { initialNews: NewsItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(item: NewsItem) {
    setEditing(item);
    setError(null);
    setFormOpen(true);
  }

  async function save(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = editing ? await updateNews(editing.id, formData) : await createNews(formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal menyimpan berita");
    setFormOpen(false);
    router.refresh();
  }

  async function changeStatus(item: NewsItem) {
    const result = await toggleNews(item.id, !item.active);
    if (!result.ok) setError(result.error || "Gagal mengubah status");
    router.refresh();
  }

  async function remove(item: NewsItem) {
    if (!window.confirm(`Hapus berita "${item.title}"?`)) return;
    const result = await deleteNews(item.id);
    if (!result.ok) setError(result.error || "Gagal menghapus berita");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-lavender shadow-neo-sm"><Megaphone className="h-5 w-5" /></span><div><h1 className="text-2xl font-black">Berita Member</h1><p className="text-sm font-semibold text-base-ink/55">Atur pesan popup di dashboard member</p></div></div>
        <Button type="button" variant="sun" onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Berita</Button>
      </div>
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {initialNews.map((item, index) => (
          <motion.article key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm">
            <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-accent-sky/20"><circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
            <div className="relative flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full border-2 border-base-ink px-2.5 py-1 text-[10px] font-extrabold uppercase ${item.active ? "bg-accent-mint" : "bg-base-bg"}`}>{item.active ? "Aktif" : "Nonaktif"}</span><h2 className="mt-3 text-lg font-black">{item.title}</h2></div><span className="font-mono text-[10px] font-bold text-base-ink/40">#{item.id}</span></div>
            <p className="relative mt-2 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-base-ink/65">{item.content}</p>
            <p className="relative mt-4 text-[10px] font-bold uppercase tracking-wide text-base-ink/40">{new Date(item.updatedAt).toLocaleString("id-ID")}</p>
            <div className="relative mt-4 flex flex-wrap gap-2 border-t-2 border-base-ink/15 pt-4">
              <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}><FilePenLine className="h-4 w-4" /> Edit</Button>
              <Button type="button" size="sm" variant={item.active ? "sun" : "mint"} onClick={() => void changeStatus(item)}>{item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{item.active ? "Nonaktifkan" : "Aktifkan"}</Button>
              <Button type="button" size="sm" className="bg-red-200 text-base-ink" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /> Hapus</Button>
            </div>
          </motion.article>
        ))}
      </div>
      {!initialNews.length ? <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center"><Megaphone className="mx-auto h-10 w-10 text-base-ink/25" /><p className="mt-3 font-black">Belum ada berita</p><p className="text-sm font-semibold text-base-ink/45">Buat berita pertama untuk member.</p></div> : null}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Berita" : "Tambah Berita"} className="max-h-[90vh] overflow-y-auto">
        <form action={save} className="space-y-4">
          <Input name="title" label="Judul" defaultValue={editing?.title || ""} minLength={3} maxLength={120} placeholder="Judul berita" required />
          <label className="block text-sm font-bold">Isi berita<textarea name="content" defaultValue={editing?.content || ""} minLength={3} maxLength={5000} rows={8} placeholder="Tulis pesan untuk member..." className="mt-1.5 w-full resize-y rounded-neo border-2 border-base-ink bg-white px-4 py-3 text-sm font-semibold leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" required /></label>
          <label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="h-5 w-5 accent-black" /> Tampilkan ke member</label>
          {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Berita"}</Button>
        </form>
      </Modal>
    </div>
  );
}
