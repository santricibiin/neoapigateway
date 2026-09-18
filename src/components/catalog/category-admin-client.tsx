"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Archive, FolderOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createCategory, deleteCategory, updateCategory } from "@/app/actions/categories";

type CategoryItem = { id: number; name: string; active: boolean; productCount: number; createdAt: string };

function LoaderIcon() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

export function CategoryAdminClient({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(
    () => initialCategories.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())),
    [initialCategories, query]
  );

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

  async function remove() {
    if (!confirming) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteCategory(confirming.id);
      if (!result.ok) setError(result.error || "Gagal menghapus kategori");
      setConfirming(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-neo border border-base-line bg-accent-sun shadow-neo-sm">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black">Kategori Produk</h1>
            <p className="text-sm font-semibold text-base-ink/55">Kelompokkan produk agar katalog rapi</p>
          </div>
        </div>
        <Button variant="sun" onClick={() => show(null)}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <label className="flex h-11 max-w-xl items-center gap-2 rounded-neo border border-base-line bg-base-surface px-3 shadow-neo-sm">
        <Search className="h-4 w-4 text-base-ink/45" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari kategori..."
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
        />
      </label>

      {error ? (
        <p className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{error}</p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
          <div className="divide-y divide-base-line">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-base-bg/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 sm:flex-1">
                  <p className="truncate font-extrabold">{item.name}</p>
                  <p className="text-xs font-bold text-base-ink/45">{item.productCount} produk · #{item.id}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span
                    className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-base-line px-2 py-0.5 text-[10px] font-black uppercase ${
                      item.active ? "bg-accent-sageSoft text-accent-sageDeep" : "bg-base-bg text-base-muted"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-accent-sageDeep" : "bg-stone-400"}`} />
                    {item.active ? "Aktif" : "Nonaktif"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => show(item)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-accent-terraSoft hover:text-accent-terraDeep"
                      onClick={() => { setError(null); setConfirming(item); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-neo border border-dashed border-base-line bg-base-surface py-16 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-base-ink/20" />
          <p className="mt-3 font-black">Kategori tidak ditemukan</p>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Kategori" : "Tambah Kategori"}>
        <form action={save} className="space-y-4">
          <Input name="name" label="Nama kategori" defaultValue={editing?.name || ""} maxLength={100} required />
          <label className="flex items-center gap-3 rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="h-5 w-5 accent-black" />
            Kategori aktif
          </label>
          {error ? (
            <p className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Kategori"}
          </Button>
        </form>
      </Modal>

      <Modal open={Boolean(confirming)} onClose={() => setConfirming(null)} title="Hapus Kategori">
        {confirming ? (
          <div className="space-y-4">
            {/* Kartu konteks kategori */}
            <div className="rounded-neo border border-base-line bg-base-bg p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-extrabold">{confirming.name}</p>
                <span className="shrink-0 rounded-neo border border-base-line bg-base-surface px-2 py-0.5 font-mono text-[10px] font-bold text-base-muted">
                  #{confirming.id}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-neo border border-base-line px-1.5 py-0.5 text-[10px] font-bold ${
                    confirming.active ? "bg-accent-sageSoft text-accent-sageDeep" : "bg-base-surface text-base-muted"
                  }`}
                >
                  {confirming.active ? "Aktif" : "Nonaktif"}
                </span>
                <span className="rounded-neo border border-base-line bg-base-surface px-1.5 py-0.5 text-[10px] font-bold text-base-ink/60">
                  {confirming.productCount} produk
                </span>
              </div>
            </div>

            {/* Peringatan sesuai isi kategori */}
            <div className="flex items-start gap-3 rounded-neo border border-base-line bg-accent-terraSoft p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-base-surface">
                <AlertTriangle className="h-5 w-5 text-accent-terraDeep" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="font-black">
                  {confirming.productCount > 0
                    ? `Kategori masih berisi ${confirming.productCount} produk.`
                    : "Kategori kosong dan aman dihapus."}
                </p>
                <p className="mt-1 text-sm font-semibold text-base-ink/60">
                  {confirming.productCount > 0
                    ? "Nonaktifkan atau pindahkan produknya terlebih dahulu — kategori berisi produk tidak bisa dihapus."
                    : "Kategori akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirming(null)} disabled={deleting}>
                Batal
              </Button>
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                onClick={() => void remove()}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-neo bg-[#A85A2E] px-4 py-2.5 text-sm font-extrabold text-white shadow-neo-sm transition-colors hover:bg-[#C2703D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? <LoaderIcon /> : <Trash2 className="h-4 w-4" strokeWidth={2.5} />}
                {deleting ? "Memproses..." : "Hapus Kategori"}
              </motion.button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
