"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Users, ShoppingBag, PlusCircle, Copy, Check, Loader2, Eye, EyeOff, ExternalLink, KeyRound, ShieldCheck, Zap, CirclePlus, ChevronLeft, ChevronRight, TrendingUp, CalendarDays, Search, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";
import { useT } from "@/lib/lang";

type Reseller = { id: number; name: string; email: string; balance: number; active: boolean; createdAt: string };
type Member = {
  id: number;
  secretToken: string;
  apiKey: string | null;
  name: string | null;
  keyMasked: string | null;
  tokens: number;
  validDays: number;
  createdAt: string;
  /** Status live dari upstream (aktif/exceeded) — null kalau tidak difilter. */
  status: string | null;
};
const QUOTA_PRESETS = Object.entries(QUOTA_PACKAGES).map(([code, pack]) => ({ code, ...pack }));

function formatTokens(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(0)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("id-ID");
}

/** Animasi angka naik (count-up) untuk stat card. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const riseIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 24 } },
};

const rowIn = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function ReswebDashboardClient({
  reseller,
  members,
  paidTopups,
  totalMembers,
  page,
  totalPages,
  query,
  statusFilter,
}: {
  reseller: Reseller | null;
  members: Member[];
  paidTopups: number;
  totalMembers: number;
  page: number;
  totalPages: number;
  query: string;
  statusFilter: "all" | "active" | "exceeded";
}) {
  const router = useRouter();
  const t = useT();
  const [addModal, setAddModal] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState<Member | null>(null);
  const [packageCode, setPackageCode] = useState("1M");
  const [quotaPackageCode, setQuotaPackageCode] = useState("1M");
  const [creating, setCreating] = useState(false);
  const [addingQuota, setAddingQuota] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string | null; apiKey: string | null; keyMasked: string | null; dashboardUrl: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState(query);
  const selectedPackage = QUOTA_PACKAGES[packageCode as keyof typeof QUOTA_PACKAGES];
  const selectedQuotaPackage = QUOTA_PACKAGES[quotaPackageCode as keyof typeof QUOTA_PACKAGES];

  /** URL dengan kombinasi filter (q/status) + halaman. */
  function pageUrl(p: number, override?: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const q = override?.q !== undefined ? override.q : query;
    const st = override?.status !== undefined ? override.status : statusFilter;
    if (q.trim()) params.set("q", q.trim());
    if (st !== "all") params.set("status", st);
    if (p > 1) params.set("page", String(p));
    return `/res${params.toString() ? `?${params}` : ""}`;
  }

  // Debounce pencarian 400ms → navigasi via window.location (aman dari
  // isu useContext router saat interaksi).
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      window.location.assign(pageUrl(1, { q: search }));
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleAdd() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/res/api/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Gagal membuat member");
      } else {
        setResult(data.member);
        setAddModal(false);
        router.refresh();
      }
    } catch {
      setError("Gagal terhubung ke server");
    }
    setCreating(false);
  }

  async function handleAddQuota() {
    if (!quotaTarget) return;
    setAddingQuota(true);
    setError(null);
    try {
      const response = await fetch("/res/api/add-member-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: quotaTarget.id, packageCode: quotaPackageCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Tambah kuota gagal");
      setQuotaTarget(null);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tambah kuota gagal");
    } finally {
      setAddingQuota(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-neo border border-base-line bg-gradient-to-br from-accent-sky via-accent-sky to-accent-sage/60 p-5 shadow-neo sm:p-8"
      >
        {/* Dekorasi SVG berlapis */}
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          viewBox="0 0 120 120"
          className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 text-white/25"
          aria-hidden
        >
          <path d="M60 5 72 43 112 43 80 67 92 105 60 82 28 105 40 67 8 43 48 43Z" fill="currentColor" />
        </motion.svg>
        <motion.svg
          animate={{ y: [0, -14, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 text-white/20"
          aria-hidden
        >
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="10" />
          <circle cx="50" cy="50" r="16" fill="currentColor" />
        </motion.svg>
        <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-base-ink/[0.04]">
          <defs>
            <pattern id="res-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0v28" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#res-grid)" />
        </svg>

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-base-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-neo-sm"
            >
              <Zap className="h-3 w-3 text-accent-terra" strokeWidth={2.5} /> Reseller Center
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
              className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
            >
              {t("Kelola member, lebih cepat.")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-1 flex items-center gap-1.5 text-sm font-bold text-base-ink/60"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${reseller?.active ? "bg-accent-sageDeep" : "bg-accent-terraDeep"}`} />
              {reseller?.email}
              {reseller?.active ? null : <span className="ml-1 text-accent-terraDeep">(nonaktif)</span>}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="primary" size="lg" onClick={() => { setError(null); setAddModal(true); }}>
              <PlusCircle className="h-4 w-4" /> {t("Buat Token Member")}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold"
        >
          {error}
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("Saldo Token")}
          raw={reseller?.balance ?? 0}
          format={formatTokens}
          icon={<Wallet className="h-5 w-5" strokeWidth={2.5} />}
          color="bg-accent-sageSoft"
          bar="bg-accent-sageDeep"
          trend
        />
        <StatCard
          label={t("Total Member")}
          raw={totalMembers}
          format={(v) => v.toLocaleString("id-ID")}
          icon={<Users className="h-5 w-5" strokeWidth={2.5} />}
          color="bg-accent-skySoft"
          bar="bg-accent-sageDeep"
        />
        <StatCard
          label={t("Total Topup")}
          raw={paidTopups}
          format={(v) => v.toLocaleString("id-ID")}
          icon={<ShoppingBag className="h-5 w-5" strokeWidth={2.5} />}
          color="bg-accent-sandSoft"
          bar="bg-accent-terra"
        />
      </motion.div>

      {/* Members */}
      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-extrabold">{t("Token Member")}</h2>
          {totalMembers > 0 ? (
            <span className="text-xs font-bold text-base-ink/45">
              {totalMembers.toLocaleString("id-ID")} member{totalPages > 1 ? ` · hal. ${page}/${totalPages}` : ""}
            </span>
          ) : null}
        </div>

        {/* Search + filter status */}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex h-11 items-center gap-2 rounded-neo border border-base-line bg-base-surface px-3 shadow-neo-sm focus-within:border-accent-terra">
            <Search className="h-4 w-4 shrink-0 text-base-ink/45" strokeWidth={2.5} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Cari nama member...")}
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-base-ink/35"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 text-xs font-bold text-base-ink/45 hover:text-base-ink"
              >
                Hapus
              </button>
            ) : null}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "all", label: "Semua" },
              { id: "active", label: "Aktif" },
              { id: "exceeded", label: "Exceed" },
            ] as const).map((item) => (
              <Link
                key={item.id}
                href={pageUrl(1, { status: item.id })}
                className={cn(
                  "rounded-neo border border-base-line px-3 py-2 text-center text-xs font-extrabold transition-all active:translate-y-0.5",
                  statusFilter === item.id ? "bg-accent-sageSoft text-accent-sageDeep shadow-neo-sm" : "bg-base-surface hover:bg-accent-sky/20"
                )}
              >
                {t(item.label)}
              </Link>
            ))}
          </div>
        </div>

        {members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-neo border border-dashed border-base-line bg-white py-16 text-center"
          >
            <motion.svg
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto h-12 w-12 text-base-ink/20"
            >
              <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 14c2.2 0 4 1.6 4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </motion.svg>
            <p className="mt-3 font-bold text-base-ink/50">{t("Belum ada member")}</p>
            <p className="mt-1 text-xs font-semibold text-base-ink/40">{t("Klik \"Buat Token Member\" untuk memulai.")}</p>
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="overflow-hidden rounded-neo border border-base-line bg-white shadow-neo-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left">
                  <thead className="bg-base-ink text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3">{t("Member")}</th>
                      <th className="px-4 py-3">{t("Token")}</th>
                      <th className="px-4 py-3">API Key</th>
                      <th className="px-4 py-3">{t("Dashboard")}</th>
                      <th className="px-4 py-3">{t("Dibuat")}</th>
                      <th className="px-4 py-3">{t("Aksi")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-line">
                    {members.map((m) => (
                      <motion.tr key={m.id} variants={rowIn} className="transition-colors hover:bg-accent-sky/10">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-skySoft text-xs font-black">
                              {(m.name || "M").charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-black">{m.name || t("Tanpa nama")}</p>
                                {m.status ? (
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1 rounded-full border border-base-line px-1.5 py-0.5 text-[8px] font-black uppercase",
                                      m.status === "active" ? "bg-accent-sageSoft text-accent-sageDeep" : "bg-accent-terraSoft text-accent-terraDeep"
                                    )}
                                    title={m.status === "active" ? t("Aktif") : t("Kuota terlampaui")}
                                  >
                                    {m.status === "active" ? <Activity className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                                    {m.status === "active" ? t("Aktif") : t("Exceed")}
                                  </span>
                                ) : null}
                              </div>
                              <p className="font-mono text-[10px] text-base-ink/45">{formatTokens(m.tokens)} · {m.validDays}d</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] font-bold">
                          {showKey[m.id] ? m.secretToken : "••••••••"}
                          <button onClick={() => setShowKey((s) => ({ ...s, [m.id]: !s[m.id] }))} className="ml-2 text-base-ink/50 transition-colors hover:text-base-ink">
                            {showKey[m.id] ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] font-bold">
                          {m.apiKey || m.keyMasked || "-"}
                          {(m.apiKey || m.keyMasked) && (
                            <button onClick={() => copy(`m${m.id}`, m.apiKey || m.keyMasked || "")} className="ml-2 text-base-ink/50 transition-colors hover:text-base-ink">
                              {copied === `m${m.id}` ? <Check className="inline h-3 w-3 text-accent-sageDeep" /> : <Copy className="inline h-3 w-3" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/quota/member/${m.secretToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-accent-terraDeep underline decoration-accent-terra/40 underline-offset-2 transition-colors hover:text-accent-terra">
                            {t("Buka")} <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-base-ink/60">
                            <CalendarDays className="h-3 w-3 text-base-ink/35" />
                            {new Date(m.createdAt).toLocaleDateString("id-ID")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button type="button" size="sm" variant="mint" onClick={() => { setQuotaPackageCode("1M"); setError(null); setQuotaTarget(m); }}>
                            <CirclePlus className="h-4 w-4" /> {t("Add Quota")}
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 rounded-neo border border-base-line bg-white p-3 shadow-neo-sm">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => (window.location.assign(pageUrl(page - 1)))}
                >
                  <ChevronLeft className="h-4 w-4" /> {t("Sebelumnya")}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 ? (
                          <span className="px-1 text-xs font-bold text-base-ink/40">…</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => (window.location.assign(pageUrl(p)))}
                          className={cn(
                            "h-8 w-8 rounded-neo border border-base-line text-xs font-black transition-colors",
                            p === page ? "bg-base-ink text-white shadow-neo-sm" : "bg-white hover:bg-accent-sky/40"
                          )}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => (window.location.assign(pageUrl(page + 1)))}
                >
                  {t("Berikutnya")} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Add Member Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={t("Buat Token Member")} className="max-h-[92vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold">{t("Pilih paket token")}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUOTA_PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setPackageCode(p.code)}
                  className={cn(
                    "rounded-neo border border-base-line p-2 text-center text-xs font-black transition-all hover:-translate-y-0.5",
                    packageCode === p.code ? "bg-accent-sageSoft shadow-neo-sm" : "bg-white hover:bg-accent-sky/20"
                  )}
                >
                  {p.code}
                  <span className="block text-[9px] font-normal text-base-ink/60">{p.validDays} hari</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-neo border border-base-line bg-base-bg p-3 text-xs font-bold">
            {t("Saldo Anda")}: <span className="font-mono">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</span> · {t("Akan dipakai")}: <span className="font-mono">{selectedPackage.tokens.toLocaleString("id-ID")}</span> · {t("Masa berlaku")}: {selectedPackage.validDays} {t("hari")}
            {reseller && reseller.balance < selectedPackage.tokens && (
              <p className="mt-1 text-accent-terraDeep">{t("Saldo tidak cukup. Silakan topup dulu.")}</p>
            )}
          </div>
          <Button variant="primary" className="w-full" disabled={creating || !reseller || reseller.balance < selectedPackage.tokens} onClick={() => void handleAdd()}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Membuat...")}</> : <><PlusCircle className="h-4 w-4" /> {t("Buat Member")}</>}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(quotaTarget)} onClose={() => { if (!addingQuota) setQuotaTarget(null); }} title={t("Tambah Kuota Member")} className="max-h-[92vh] overflow-y-auto">
        {quotaTarget ? <div className="space-y-4">
          <div className="relative overflow-hidden rounded-neo border border-base-line bg-accent-skySoft p-4 shadow-neo-sm">
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              viewBox="0 0 100 100"
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white/40"
            >
              <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" />
            </motion.svg>
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border border-base-line bg-white text-base font-black">
                {(quotaTarget.name || "M").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{quotaTarget.name || "Tanpa nama"}</p>
                <p className="font-mono text-xs font-bold text-base-ink/50">Member #{quotaTarget.id}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold">{t("Pilih paket token")}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUOTA_PRESETS.map((pack) => (
                <button
                  key={pack.code}
                  type="button"
                  onClick={() => setQuotaPackageCode(pack.code)}
                  className={cn(
                    "rounded-neo border border-base-line p-2 text-xs font-black transition-all hover:-translate-y-0.5",
                    quotaPackageCode === pack.code ? "bg-accent-sageSoft shadow-neo-sm" : "bg-white"
                  )}
                >
                  {pack.code}
                  <span className="block text-[9px] font-normal text-base-ink/60">{pack.validDays} {t("hari")}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-neo border border-base-line bg-base-bg p-3 text-xs font-bold">
            {t("Saldo Anda")}: <span className="font-mono">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</span> · {t("Dipakai")}: <span className="font-mono">{selectedQuotaPackage.tokens.toLocaleString("id-ID")}</span> · {t("Masa aktif")}: {selectedQuotaPackage.validDays} {t("hari")}
            {reseller && reseller.balance < selectedQuotaPackage.tokens ? <p className="mt-1 text-accent-terraDeep">{t("Saldo tidak cukup. Silakan topup dulu.")}</p> : null}
          </div>
          <Button type="button" className="w-full" disabled={addingQuota || !reseller || reseller.balance < selectedQuotaPackage.tokens} onClick={() => void handleAddQuota()}>
            {addingQuota ? <Loader2 className="h-4 w-4 animate-spin" /> : <CirclePlus className="h-4 w-4" />}
            {addingQuota ? t("Menambahkan...") : t("Konfirmasi Add Quota")}
          </Button>
        </div> : null}
      </Modal>

      {/* Result Modal */}
      <Modal open={Boolean(result)} onClose={() => setResult(null)} title={t("Member Berhasil Dibuat")}>
        {result && (
          <div className="space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="rounded-neo border border-base-line bg-accent-sageSoft p-4 text-center"
            >
              <motion.span
                initial={{ rotate: -30, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-base-line bg-white"
              >
                <KeyRound className="h-6 w-6 text-accent-sageDeep" />
              </motion.span>
              <p className="mt-1 font-extrabold">{t("Token member siap")}</p>
            </motion.div>
            {result.name && <p className="text-sm font-bold">Nama: {result.name}</p>}
            <div className="rounded-neo border border-base-line bg-base-bg p-3">
              <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">API Key</p>
              <p className="break-all font-mono text-xs font-bold">{result.apiKey || result.keyMasked || "-"}</p>
            </div>
            <div className="rounded-neo border border-base-line bg-base-bg p-3">
              <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">{t("Dashboard Member")}</p>
              <p className="break-all font-mono text-xs font-bold">{result.dashboardUrl}</p>
            </div>
            <div className="rounded-neo border border-base-line bg-accent-sun p-3">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-base-ink/55"><ShieldCheck className="h-3.5 w-3.5" /> {t("Kredensial")}</p>
              <p className="text-xs font-bold leading-relaxed">
                {t("Member membuat Password & PIN sendiri saat pertama kali membuka dashboard.")}
              </p>
            </div>
            <a href={result.dashboardUrl} target="_blank" rel="noreferrer" className="block">
              <Button variant="primary" className="w-full">
                <ExternalLink className="h-4 w-4" /> {t("Buka Dashboard Member")}
              </Button>
            </a>
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>{t("Tutup")}</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  raw,
  format,
  icon,
  color,
  bar,
  trend,
}: {
  label: string;
  raw: number;
  format: (v: number) => string;
  icon: React.ReactNode;
  color: string;
  bar: string;
  trend?: boolean;
}) {
  const animated = useCountUp(raw);
  return (
    <motion.div variants={riseIn} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 350, damping: 22 }} className={cn("relative overflow-hidden rounded-neo border border-base-line p-4 shadow-neo-sm", color)}>
      <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-base-ink/[0.05]">
        <path d="M50 5 72 43 112 43 80 67 92 105 60 82 28 105 40 67 8 43 48 43Z" fill="currentColor" />
      </svg>
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-neo border border-base-line bg-white/70">{icon}</span>
      </div>
      <p className="relative mt-1 text-2xl font-black tabular-nums">{format(animated)}</p>
      <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-base-ink/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: raw > 0 ? "100%" : "0%" }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          className={cn("h-full", bar)}
        />
      </div>
      {trend && raw > 0 ? (
        <p className="relative mt-1.5 flex items-center gap-1 text-[10px] font-bold text-base-ink/45">
          <TrendingUp className="h-3 w-3" /> siap dipakai
        </p>
      ) : null}
    </motion.div>
  );
}
