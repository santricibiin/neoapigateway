"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Megaphone, Newspaper, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NewsItem = { id: number; title: string; content: string; createdAt: string; updatedAt: string };
type NewsPayload = { items: NewsItem[]; page: number; total: number; totalPages: number };

export function MemberNewsPopup() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/news?page=${targetPage}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat berita");
      const payload = body as NewsPayload;
      setData(payload);
      setPage(payload.page);
      if (payload.total > 0) setOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memuat berita");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  async function move(nextPage: number) {
    setOpen(true);
    await load(nextPage);
  }

  if (!loading && !data?.total && !error) return null;

  return (
    <>
      {!open && data?.total ? (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sun px-3 py-2.5 font-extrabold shadow-neo sm:px-4 sm:py-3 lg:bottom-7 lg:right-7"
        >
          <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Berita</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-base-ink bg-white px-1 text-[10px]">{data.total}</span>
        </motion.button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-news-title"
            className="fixed inset-0 z-[70] flex items-end justify-center bg-base-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:p-6"
          >
            <button type="button" aria-label="Tutup berita" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />

            <motion.section
              initial={{ opacity: 0, y: 60, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-2 border-b-0 border-base-ink bg-base-bg shadow-[8px_8px_0_0_#0F172A] sm:max-h-[85vh] sm:rounded-neo sm:border-b-2"
            >
              {/* Header */}
              <header className="relative shrink-0 overflow-hidden border-b-2 border-base-ink bg-accent-lavender px-4 py-4 sm:px-6 sm:py-5">
                <motion.svg animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white/30 sm:-right-10 sm:-top-10 sm:h-36 sm:w-36">
                  <path d="M50 4 61 36 95 37 68 57 77 91 50 71 23 91 32 57 5 37 39 36Z" fill="currentColor" />
                </motion.svg>
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm sm:h-11 sm:w-11">
                      <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] sm:text-[10px] sm:tracking-[0.22em]">Info terbaru</p>
                      <h2 id="member-news-title" className="text-xl font-black tracking-tight sm:text-2xl">Berita Member</h2>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-white shadow-neo-sm transition-transform active:translate-y-0.5 sm:h-10 sm:w-10" aria-label="Tutup">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                {data ? <p className="relative mt-2.5 text-[11px] font-bold text-base-ink/65 sm:mt-3 sm:text-xs">{data.total} berita · Halaman {data.page} dari {data.totalPages}</p> : null}
              </header>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
                {loading ? (
                  <div className="flex min-h-48 items-center justify-center">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="h-8 w-8 rounded-full border-4 border-base-ink border-t-accent-lavender sm:h-9 sm:w-9" />
                  </div>
                ) : null}

                {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-4 text-sm font-bold">{error}</p> : null}

                {!loading && data ? (
                  <div className="space-y-2.5 sm:space-y-3">
                    {data.items.map((item, index) => (
                      <motion.article
                        key={item.id}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.055 }}
                        className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-3.5 shadow-neo-sm sm:p-5"
                      >
                        <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 text-accent-sky/15 sm:h-28 sm:w-28">
                          <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="13" />
                        </svg>
                        <div className="relative flex gap-2.5 sm:gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky text-[11px] font-black sm:h-8 sm:w-8 sm:text-xs">
                            {(data.page - 1) * 5 + index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-black leading-snug sm:text-lg">{item.title}</h3>
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] font-semibold leading-relaxed text-base-ink/70 sm:mt-2 sm:text-sm">{item.content}</p>
                            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-base-ink/40 sm:mt-3">{new Date(item.createdAt).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Footer pagination */}
              {data && data.totalPages > 1 ? (
                <footer className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-t-2 border-base-ink bg-white p-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-3 sm:p-4">
                  <Button type="button" variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => void move(page - 1)} className="justify-self-start px-2.5 sm:px-4">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Sebelum</span>
                  </Button>
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                    {Array.from({ length: data.totalPages }, (_, index) => index + 1)
                      .slice(Math.max(0, page - 3), Math.max(5, page + 2))
                      .map((number) => (
                        <button
                          key={number}
                          type="button"
                          onClick={() => void move(number)}
                          className={`h-7 min-w-7 rounded-neo border-2 border-base-ink px-1 text-[11px] font-black sm:h-8 sm:min-w-8 sm:text-xs ${number === page ? "bg-accent-sun shadow-neo-sm" : "bg-base-bg"}`}
                        >
                          {number}
                        </button>
                      ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={loading || page >= data.totalPages} onClick={() => void move(page + 1)} className="justify-self-end px-2.5 sm:px-4">
                    <span className="hidden sm:inline">Lanjut</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </footer>
              ) : null}

              {data && data.totalPages <= 1 ? (
                <footer className="flex shrink-0 items-center justify-center gap-2 border-t-2 border-base-ink bg-white p-2.5 text-xs font-bold text-base-ink/50 sm:p-3">
                  <Newspaper className="h-4 w-4" /> Semua berita sudah ditampilkan
                </footer>
              ) : null}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
