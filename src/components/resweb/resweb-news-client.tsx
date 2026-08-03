"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FilePenLine, Megaphone, Plus, Radio, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveResWebNews, deleteResWebNews } from "@/app/actions/resweb-news";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type NewsItem = { id: number; title: string; content: string; active: boolean; createdAt: string; updatedAt: string };

export function ReswebNewsClient({ initialNews }: { initialNews: NewsItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function show(item: NewsItem | null) {
    setEditing(item);
    setError(null);
    setOpen(true);
  }

  async function save(formData: FormData) {
    setSaving(true);
    const result = await saveResWebNews(editing?.id ?? null, formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal menyimpan berita");
    setOpen(false);
    router.refresh();
  }

  async function remove(item: NewsItem) {
    if (!window.confirm(`Hapus berita "${item.title}"?`)) return;
    const result = await deleteResWebNews(item.id);
    if (!result.ok) setError(result.error || "Gagal menghapus berita");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-lavender p-5 shadow-neo sm:p-7">
        <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/30"><circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><span className="inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Radio className="h-3 w-3" /> Siaran Member</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">Berita reseller Anda.</h1><p className="mt-1 text-sm font-bold text-base-ink/60">Hanya tampil untuk member yang Anda buat.</p></div>
          <Button type="button" variant="sun" onClick={() => show(null)}><Plus className="h-4 w-4" /> Tambah Berita</Button>
        </div>
      </motion.section>

      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {initialNews.map((item, index) => (
          <motion.article key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm">
            <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 text-accent-sky/15"><path d="M50 6 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" /></svg>
            <div className="relative"><span className={`inline-flex rounded-full border-2 border-base-ink px-2.5 py-1 text-[10px] font-black uppercase ${item.active ? "bg-accent-mint" : "bg-base-bg"}`}>{item.active ? "Aktif" : "Draft"}</span><h2 className="mt-3 text-xl font-black">{item.title}</h2><p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-base-ink/65">{item.content}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-base-ink/40">{new Date(item.updatedAt).toLocaleString("id-ID")}</p><div className="mt-4 flex gap-2 border-t-2 border-base-ink/10 pt-4"><Button type="button" size="sm" variant="outline" onClick={() => show(item)}><FilePenLine className="h-4 w-4" /> Edit</Button><Button type="button" size="sm" className="bg-red-200" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /> Hapus</Button></div></div>
          </motion.article>
        ))}
      </div>
      {!initialNews.length ? <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center"><Megaphone className="mx-auto h-10 w-10 text-base-ink/25" /><p className="mt-3 font-black">Belum ada berita</p><p className="text-sm font-semibold text-base-ink/45">Kirim info pertama untuk member Anda.</p></div> : null}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Berita" : "Tambah Berita"} className="max-h-[90vh] overflow-y-auto">
        <form action={save} className="space-y-4">
          <Input name="title" label="Judul" defaultValue={editing?.title || ""} minLength={3} maxLength={120} required />
          <label className="block text-sm font-bold">Isi berita<textarea name="content" defaultValue={editing?.content || ""} minLength={3} maxLength={5000} rows={8} className="mt-1.5 w-full resize-y rounded-neo border-2 border-base-ink bg-white px-4 py-3 text-sm font-semibold shadow-neo-sm outline-none" required /></label>
          <label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="h-5 w-5 accent-black" /> Tampilkan ke member</label>
          {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Berita"}</Button>
        </form>
      </Modal>
    </div>
  );
}
