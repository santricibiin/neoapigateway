"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { BarChart3, BookOpen, Boxes, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Gauge, KeyRound, Link2, LockKeyhole, LogOut, MessageCircle, PlusCircle, X, Check, Lock, Clock, Loader2, Search, HelpCircle, Terminal, Send, RotateCcw, ArrowUpCircle, ArrowDownCircle, Play, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuotaDashboardView } from "@/lib/quota-dashboard";
import { cn } from "@/lib/utils";
import { MemberNewsPopup } from "@/components/news/member-news-popup";
import { useLang, useT } from "@/lib/lang";
import { LangSwitch } from "@/components/resweb/res-lang";

type Meta = {
  id: string | number;
  name: string;
  status: string;
  pinSet: boolean;
  pinLockedUntil: string | null;
};

type Tab = "quota" | "models" | "usage" | "playground" | "faq" | "contact" | "tutorial";

interface QuotaProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  tokens: number;
  validDays: number;
  affordable: boolean;
}

const tabs: Array<[Tab, string]> = [
  ["quota", "Kuota"],
  ["models", "Model"],
  ["usage", "Usage"],
  ["playground", "Playground"],
  ["faq", "FAQ"],
  ["contact", "Kontak"],
  ["tutorial", "Tutorial"],
];

const tabIcons = {
  quota: Gauge,
  models: Boxes,
  usage: BarChart3,
  playground: Terminal,
  faq: HelpCircle,
  contact: MessageCircle,
  tutorial: BookOpen,
};

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function formatTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("id-ID");
}

export function QuotaDashboardClient({ token, brandName, hideBuy = false, resellerCs = null }: { token: string; brandName: string; hideBuy?: boolean; resellerCs?: { name: string; waNumber: string | null; telegram: string | null } | null }) {
  const storageKey = `quota_at_${token}`;
  const t = useT();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<QuotaDashboardView | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quota");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showBuyPopup, setShowBuyPopup] = useState(false);
  const [products, setProducts] = useState<QuotaProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadData = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/public/quota/${encodeURIComponent(token)}/data`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Sesi berakhir");
    setData(body as QuotaDashboardView);
  }, [token]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/public/quota/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Token tidak valid");
        if (active) setMeta(body as Meta);
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          try {
            await loadData(saved);
          } catch {
            sessionStorage.removeItem(storageKey);
          }
        }
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Gagal memuat dashboard"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadData, storageKey, token]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setUnlocking(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/quota/${encodeURIComponent(token)}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = await response.json();
      if (!response.ok || !body.accessToken) throw new Error(body.error || "PIN ditolak");
      sessionStorage.setItem(storageKey, body.accessToken);
      await loadData(body.accessToken);
      setPin("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal membuka dashboard");
    } finally {
      setUnlocking(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(storageKey);
    setData(null);
    setShowKey(false);
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("error");
    }
    window.setTimeout(() => setCopied(null), 1500);
  }

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/public/quota/${encodeURIComponent(token)}/products`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setProducts(data.products || []);
      }
    } catch {}
    setLoadingProducts(false);
  }

  function openBuyPopup() {
    if (!products.length) loadProducts();
    setShowBuyPopup(true);
  }

  const usageRows = useMemo(() => {
    if (!data) return [];
    const rows = Object.entries(data.usageByModel).map(([id, usage]) => ({
      id,
      total: Number(usage.total_tokens || 0),
      prompt: Number(usage.prompt_tokens || 0),
      completion: Number(usage.completion_tokens || 0),
      requests: Number(usage.requests || 0),
    }));
    if (rows.length) return rows.sort((a, b) => b.total - a.total);
    return data.models.map((model) => ({ id: model.id, total: 0, prompt: 0, completion: 0, requests: 0 }));
  }, [data]);

  if (loading) return <QuotaShell><p className="font-extrabold">{t("Memuat dashboard...")}</p></QuotaShell>;

  if (!meta || (!data && error && !meta)) {
    return <QuotaShell><Alert>{error || t("Dashboard tidak ditemukan")}</Alert></QuotaShell>;
  }

  if (!data) {
    return (
      <QuotaShell>
        <Header brandName={brandName} name={meta.name} status={meta.status} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /> {t("Masuk PIN")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm font-semibold text-base-ink/60">{t("Dashboard dilindungi PIN 6 digit.")}</p>
            {meta.pinLockedUntil ? <Alert>PIN terkunci sampai {String(meta.pinLockedUntil)}</Alert> : null}
            <form onSubmit={unlock} className="mt-4 space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              {error ? <Alert>{error}</Alert> : null}
              <Button type="submit" className="w-full" disabled={unlocking || pin.length !== 6}>
                {unlocking ? t("Membuka...") : t("Buka dashboard")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </QuotaShell>
    );
  }

  const percentage = data.maxTokens > 0 ? Math.min(100, Math.round((data.usage.total_tokens / data.maxTokens) * 100)) : 0;

  return (
    <QuotaShell wide>
      <MemberNewsPopup token={hideBuy ? token : undefined} />
      <Header brandName={brandName} name={data.name} status={data.status} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-bold text-base-ink/50">ID #{data.id}</p>
        <div className="flex items-center gap-2">
          {!hideBuy ? (
            <Button type="button" variant="sun" size="sm" className="px-2.5 py-1.5 text-xs" onClick={openBuyPopup}>
              <PlusCircle className="h-3.5 w-3.5" /> {t("Tambah Kuota")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="px-2.5 py-1.5 text-xs" onClick={logout}><LogOut className="h-3.5 w-3.5" /> {t("Kunci lagi")}</Button>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-neo border border-base-line bg-white p-2 shadow-neo sm:grid-cols-4 md:grid-cols-7">
        {tabs.map(([id, label]) => {
          const Icon = tabIcons[id];
          return (
            <motion.button key={id} type="button" onClick={() => setTab(id)} whileHover={{ y: -2 }} whileTap={{ y: 1 }} className={cn("relative flex items-center justify-center gap-2 overflow-hidden rounded-neo border border-base-line px-3 py-2.5 text-xs font-extrabold uppercase", tab === id ? "bg-accent-sky" : "bg-base-bg")}>
              {tab === id ? <motion.span layoutId="active-quota-tab" className="absolute inset-0 bg-accent-sky" transition={{ type: "spring", stiffness: 400, damping: 30 }} /> : null}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </motion.button>
          );
        })}
      </div>

      {tab === "quota" ? (
        <motion.div key="quota" variants={reveal} initial="hidden" animate="visible" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("Sisa")} value={formatTokens(data.remainingTokens)} color="bg-accent-sky" />
            <Stat label={t("Terpakai")} value={formatTokens(data.usage.total_tokens)} color="bg-accent-sun" />
            <Stat label={t("Maksimal")} value={formatTokens(data.maxTokens)} color="bg-white" />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><CardTitle>{t("Pemakaian")}</CardTitle></CardHeader>
              <CardContent>
                <div className="relative h-5 overflow-hidden rounded-full border border-base-line bg-base-bg">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.9, ease: "easeOut" }} className="relative h-full bg-accent-lavender">
                    <motion.span animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} className="absolute inset-y-0 w-1/3 skew-x-[-25deg] bg-white/35" />
                  </motion.div>
                </div>
                <p className="mt-2 text-sm font-bold">{percentage}% terpakai · {data.usage.requests.toLocaleString("id-ID")} request</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Mini label="Prompt" value={data.usage.prompt_tokens.toLocaleString("id-ID")} />
                  <Mini label="Completion" value={data.usage.completion_tokens.toLocaleString("id-ID")} />
                  <Mini label="Cached" value={data.usage.cachedTokens.toLocaleString("id-ID")} />
                  <Mini label="Valid days" value={data.validDays == null ? "-" : String(data.validDays)} />
                </div>
                <p className="mt-3 text-xs font-bold text-base-ink/50">Berakhir: {data.expiresAt ? new Date(data.expiresAt).toLocaleString("id-ID") : "-"}</p>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Card className="flex flex-col">
                <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> API Key</CardTitle></CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <code className="block break-all rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold">{showKey ? data.key : data.keyMasked}</code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showKey ? t("Sembunyikan") : t("Tampilkan")}</Button>
                    <Button type="button" size="sm" onClick={() => copy("key", data.key)}><Copy className="h-4 w-4" />{copied === "key" ? t("Tersalin") : t("Copy key")}</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="flex flex-col">
                <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Base URL</CardTitle></CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <code className="block break-all rounded-neo border border-base-line bg-base-bg p-3 font-mono text-sm font-bold">{data.baseUrl}</code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => copy("base", data.baseUrl)}><Copy className="h-4 w-4" />{copied === "base" ? t("Tersalin") : t("Copy Base URL")}</Button>
                  </div>
                  <p className="mt-3 break-all text-xs font-bold text-base-ink/50">{data.baseUrl}/models · {data.baseUrl}/chat/completions</p>
                </CardContent>
              </Card>
              <SecurityCard
                token={token}
                onSession={(accessToken) => {
                  sessionStorage.setItem(storageKey, accessToken);
                }}
                onDataChanged={async () => {
                  const saved = sessionStorage.getItem(storageKey);
                  if (saved) await loadData(saved);
                }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}

      {showBuyPopup && !hideBuy ? (
        <BuyQuotaPopup
          token={token}
          products={products}
          loading={loadingProducts}
          onClose={() => {
            setShowBuyPopup(false);
          }}
          onRefreshProducts={loadProducts}
        />
      ) : null}

      {tab === "models" ? (
        <motion.div key="models" variants={reveal} initial="hidden" animate="visible">
          <ModelsTable models={data.models} multipliers={data.modelMultipliers} copy={copy} copied={copied} />
        </motion.div>
      ) : null}

      {tab === "usage" ? (
        <motion.div key="usage" variants={reveal} initial="hidden" animate="visible"><Card>
          <CardHeader><CardTitle>{t("Usage per model")}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2 sm:grid-cols-4"><Mini label="Total" value={formatTokens(data.usage.total_tokens)} /><Mini label="Input" value={formatTokens(data.usage.prompt_tokens)} /><Mini label="Output" value={formatTokens(data.usage.completion_tokens)} /><Mini label="Request" value={data.usage.requests.toLocaleString("id-ID")} /></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-base-line"><tr><th className="py-2 pr-3">Model</th><th className="py-2 pr-3 text-right">Total</th><th className="py-2 pr-3 text-right">Input</th><th className="py-2 pr-3 text-right">Output</th><th className="py-2 text-right">Request</th></tr></thead>
                <tbody>{usageRows.map((row) => <tr key={row.id} className="border-b border-base-ink/15"><td className="py-2 pr-3 font-mono font-bold">{row.id}</td><td className="py-2 pr-3 text-right">{row.total.toLocaleString("id-ID")}</td><td className="py-2 pr-3 text-right">{row.prompt.toLocaleString("id-ID")}</td><td className="py-2 pr-3 text-right">{row.completion.toLocaleString("id-ID")}</td><td className="py-2 text-right">{row.requests.toLocaleString("id-ID")}</td></tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card></motion.div>
      ) : null}

      {tab === "playground" ? (
        <motion.div key="playground" variants={reveal} initial="hidden" animate="visible"><Playground data={data} copy={copy} copied={copied} /></motion.div>
      ) : null}

      {tab === "faq" ? (
        <motion.div key="faq" variants={reveal} initial="hidden" animate="visible"><FaqSection /></motion.div>
      ) : null}

      {tab === "contact" ? (
        <motion.div key="contact" variants={reveal} initial="hidden" animate="visible"><ContactCs resellerCs={resellerCs} /></motion.div>
      ) : null}

      {tab === "tutorial" ? <motion.div key="tutorial" variants={reveal} initial="hidden" animate="visible"><Tutorial copy={copy} copied={copied} data={data} /></motion.div> : null}
    </QuotaShell>
  );
}

const MODELS_PER_PAGE = 10;
const gradeRank: Record<string, number> = { A: 0, B: 1, C: 2 };

function gradeStyle(grade: string) {  switch (grade.toUpperCase()) {
    case "A":
      return "bg-accent-mint";
    case "B":
      return "bg-accent-sun";
    case "C":
      return "bg-accent-lavender";
    default:
      return "bg-base-bg";
  }
}

type ModelRow = QuotaDashboardView["models"][number];

function ModelsTable({
  models,
  multipliers,
  copy,
  copied,
}: {
  models: ModelRow[];
  multipliers: Record<string, number>;
  copy: (label: string, value: string) => Promise<void>;
  copied: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: models.length,
      active: models.filter((model) => model.enabled).length,
      inactive: models.filter((model) => !model.enabled).length,
    }),
    [models]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models
      .filter((model) => {
        if (filter === "active" && !model.enabled) return false;
        if (filter === "inactive" && model.enabled) return false;
        return !q || model.id.toLowerCase().includes(q);
      })
      .sort(
        (a, b) =>
          Number(b.enabled) - Number(a.enabled) ||
          (gradeRank[a.grade?.toUpperCase()] ?? 3) - (gradeRank[b.grade?.toUpperCase()] ?? 3) ||
          a.id.localeCompare(b.id)
      );
  }, [models, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MODELS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * MODELS_PER_PAGE, safePage * MODELS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">{stats.total} Model</h2>
          <p className="text-xs font-bold text-base-ink/50">{stats.active} tersedia · {stats.inactive} out of stock</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-base-ink/45" />
          <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama model..." />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", "Semua", stats.total],
          ["active", "Tersedia", stats.active],
          ["inactive", "Out of Stock", stats.inactive],
        ] as Array<["all" | "active" | "inactive", string, number]>).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-neo border border-base-line px-3 py-1.5 text-[11px] font-black uppercase transition-colors",
              filter === value ? "bg-base-ink text-white shadow-neo-sm" : "bg-white hover:bg-accent-sky/25"
            )}
          >
            {label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", filter === value ? "bg-white/25" : "bg-base-bg")}>{count}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-base-line bg-accent-sky">
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Nama Model</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Vision</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Multiplier</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Grade</th>
                <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider">Copy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((model, index) => {
                const multiplier = model.multiplier || multipliers[model.id] || 1;
                return (
                  <motion.tr
                    key={model.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn("border-b border-base-ink/15 last:border-b-0", index % 2 ? "bg-base-bg/50" : "bg-white", !model.enabled && "opacity-70")}
                  >
                    <td className="px-3 py-2.5">
                      <span className="break-all font-mono text-[13px] font-extrabold">{model.id}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {model.vision ? (
                        <span title="Vision (text + image)" className="inline-flex items-center gap-1 rounded-full border border-base-line bg-accent-mint px-2 py-0.5 text-[9px] font-black uppercase">
                          <Eye className="h-3 w-3" /> Vision
                        </span>
                      ) : (
                        <span title="Text only" className="inline-flex items-center gap-1 rounded-full border border-base-line/25 bg-base-bg px-2 py-0.5 text-[9px] font-black uppercase text-base-ink/45">
                          <EyeOff className="h-3 w-3" /> Text
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("inline-block rounded-neo border border-base-line px-2 py-0.5 font-mono text-xs font-black", multiplier > 1 ? "bg-accent-sun" : "bg-white")}>{multiplier}x</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-neo border border-base-line text-xs font-black", gradeStyle(model.grade))}>{model.grade || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {model.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-base-line bg-accent-mint px-2 py-0.5 text-[9px] font-black uppercase">
                          <Check className="h-3 w-3" strokeWidth={3} /> Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-base-line bg-accent-terraSoft px-2 py-0.5 text-[9px] font-black uppercase">
                          <PackageX className="h-3 w-3" /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void copy(`model:${model.id}`, model.id)}
                        className="inline-flex items-center gap-1 rounded-neo border border-base-line bg-white px-2 py-1 text-[10px] font-black uppercase shadow-neo-sm transition-colors hover:bg-accent-sky/40"
                      >
                        {copied === `model:${model.id}` ? <Check className="h-3 w-3" strokeWidth={3} /> : <Copy className="h-3 w-3" />}
                        {copied === `model:${model.id}` ? "Ok" : "Copy"}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center font-bold text-base-ink/45">Model tidak ditemukan.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-base-ink/50">
            Menampilkan {(safePage - 1) * MODELS_PER_PAGE + 1}–{Math.min(safePage * MODELS_PER_PAGE, filtered.length)} dari {filtered.length} model
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-neo border border-base-line bg-white font-black shadow-neo-sm disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={3} />
            </button>
            {pageNumbers(safePage, totalPages).map((item, index) =>
              item === "…" ? (
                <span key={`gap-${index}`} className="px-1 text-xs font-black text-base-ink/40">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item as number)}
                  className={cn(
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-neo border border-base-line px-2 text-xs font-black shadow-neo-sm",
                    item === safePage ? "bg-accent-sky" : "bg-white hover:bg-accent-sky/30"
                  )}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-neo border border-base-line bg-white font-black shadow-neo-sm disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

const GRADE_INFO: Array<{ grade: string; title: string; body: string }> = [
  {
    grade: "A",
    title: "Kualitas unggulan",
    body: "Berasal dari layanan ternama dengan kualitas dan performa yang baik.",
  },
  {
    grade: "B",
    title: "Performa terbatas",
    body: "Berasal dari layanan baru atau layanan dengan batas request per menit yang sangat kecil, sehingga performanya mungkin kurang optimal.",
  },
  {
    grade: "C",
    title: "Pilihan ekonomis",
    body: "Performa layanan sangat rendah, tetapi tersedia dengan harga lebih murah.",
  },
];

type ChatCompletionResult = {
  content: string;
  usage: Record<string, number> | null;
  raw: unknown;
};

const QUOTA_SAMPLE_RESPONSE: Record<string, unknown> = {
  object: "quota",
  id: 1,
  name: "melati",
  status: "active",
  maxTokens: 50000000,
  remainingTokens: 47500000,
  usagePercent: 5,
  usage: {
    prompt_tokens: 1500000,
    completion_tokens: 1000000,
    total_tokens: 2500000,
    cached_tokens: 0,
    requests: 42,
  },
  validDays: 14,
  expiresAt: "2026-02-01T00:00:00.000Z",
  createdAt: "2026-01-18T00:00:00.000Z",
  penaltyActive: false,
  penaltyUntil: null,
  penaltyReason: null,
};

function Playground({
  data,
  copy,
  copied,
}: {
  data: QuotaDashboardView;
  copy: (label: string, value: string) => Promise<void>;
  copied: string | null;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ChatCompletionResult | null>(null);
  const [meta, setMeta] = useState<{ lastRequest: string; duration: number; statusCode: string }>({ lastRequest: "", duration: 0, statusCode: "" });

  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaResult, setQuotaResult] = useState<Record<string, unknown> | { error: string } | null>(null);
  const [quotaMeta, setQuotaMeta] = useState<{ duration: number; statusCode: string }>({ duration: 0, statusCode: "" });

  const chatBase = data.baseUrl.replace(/\/$/, "");

  function buildBodyTemplate(model: string) {
    return JSON.stringify(
      {
        model: model || "glm-5.2",
        messages: [{ role: "user", content: "Say hello in 5 words" }],
        max_tokens: 100,
      },
      null,
      2
    );
  }

  async function loadPlaygroundModels() {
    setLoadingModels(true);
    try {
      const res = await fetch(`${chatBase}/models`, { headers: { Authorization: `Bearer ${data.key}` } });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.data)) setModels(body.data.map((m: { id: string }) => m.id));
      }
      setSelectedModel((current) => {
        const next = current || models[0] || "";
        if (!current && next) setBodyText(buildBodyTemplate(next));
        return next;
      });
    } catch {}
    setLoadingModels(false);
  }

  function selectModel(model: string) {
    setSelectedModel(model);
    setBodyText(buildBodyTemplate(model));
  }

  async function testChatCompletion() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
      setBodyError(null);
    } catch (reason) {
      setBodyError(reason instanceof Error ? `Invalid JSON: ${reason.message}` : "Invalid JSON");
      return;
    }
    setSending(true);
    setResponse(null);
    setMeta({ lastRequest: "", duration: 0, statusCode: "" });
    const sentBody = JSON.stringify(parsed, null, 2);
    const start = Date.now();
    try {
      const res = await fetch(`${chatBase}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.key}` },
        body: JSON.stringify(parsed),
      });
      const duration = Date.now() - start;
      setMeta({ lastRequest: sentBody, duration, statusCode: String(res.status) });
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const err = await res.json();
          message = err.error?.message || err.error || message;
        } catch {}
        setResponse({ content: "", usage: null, raw: { error: message } });
      } else {
        const result = await res.json();
        setResponse({
          content: result.choices?.[0]?.message?.content || "No response",
          usage: result.usage || null,
          raw: result,
        });
      }
    } catch (reason) {
      setMeta({ lastRequest: sentBody, duration: Date.now() - start, statusCode: "" });
      setResponse({ content: "", usage: null, raw: { error: reason instanceof Error ? reason.message : "Network error" } });
    } finally {
      setSending(false);
    }
  }

  async function testQuotaCheck() {
    setQuotaLoading(true);
    setQuotaResult(null);
    setQuotaMeta({ duration: 0, statusCode: "" });
    const start = Date.now();
    try {
      const res = await fetch(`${chatBase}/quota`, { headers: { Authorization: `Bearer ${data.key}` } });
      setQuotaMeta({ duration: Date.now() - start, statusCode: String(res.status) });
      const result = await res.json();
      if (!res.ok) {
        setQuotaResult({ error: result.error?.message || result.error || `Failed to fetch quota (${res.status})` });
      } else {
        setQuotaResult(result);
      }
    } catch (reason) {
      setQuotaMeta({ duration: Date.now() - start, statusCode: "" });
      setQuotaResult({ error: reason instanceof Error ? reason.message : "Network error" });
    } finally {
      setQuotaLoading(false);
    }
  }

  const playgroundCurl = `curl -X POST ${chatBase}/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${data.key}" \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
  const quotaCurl = `curl ${chatBase}/quota \\\n  -H "Authorization: Bearer ${data.key}"`;
  const quotaRaw = quotaResult && "error" in quotaResult ? null : (quotaResult as Record<string, unknown> | null);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-neo border border-base-line bg-accent-lavender p-5 shadow-neo">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 text-white/35">
          <path d="M50 5 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" />
        </motion.svg>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-base-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            <Terminal className="h-3 w-3" /> API Playground
          </span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">Test API langsung.</h1>
          <p className="mt-1 text-sm font-bold text-base-ink/60">Coba chat completion dan cek kuota dengan API key Anda.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> POST /chat/completions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">cURL Example</label>
              <Button type="button" variant="outline" size="sm" className="px-2.5 py-1 text-xs" onClick={() => void copy("playground-curl", playgroundCurl)}>
                <Copy className="h-3.5 w-3.5" />{copied === "playground-curl" ? "Tersalin" : "Copy"}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 text-xs font-mono font-bold text-emerald-300">{playgroundCurl}</pre>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-base-ink/50">Model</label>
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    disabled={loadingModels || !models.length}
                    onChange={(event) => selectModel(event.target.value)}
                    className="w-full rounded-neo border border-base-line bg-white px-3 py-2 text-sm font-bold focus:outline-none disabled:opacity-50"
                  >
                    {!models.length ? <option value="">{loadingModels ? "Memuat model..." : "Model tidak tersedia"}</option> : null}
                    {models.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-2.5 py-1 text-xs" onClick={() => void loadPlaygroundModels()} disabled={loadingModels}>
                    <RotateCcw className="h-3.5 w-3.5" />{loadingModels ? "..." : "Muat"}
                  </Button>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">Request Body (JSON)</label>
                  <button type="button" onClick={() => selectModel(selectedModel)} className="text-xs font-bold text-base-ink/50 underline underline-offset-2 hover:text-base-ink">
                    Reset
                  </button>
                </div>
                <textarea
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  spellCheck={false}
                  rows={12}
                  className="w-full resize-y rounded-neo border border-base-line bg-base-bg p-3 font-mono text-xs font-bold focus:outline-none"
                />
                {bodyError ? <p className="mt-1 rounded-neo border border-base-line bg-accent-terraSoft p-2 text-xs font-bold">{bodyError}</p> : null}
              </div>
              <Button type="button" variant="primary" className="w-full" disabled={sending || !!bodyError} onClick={() => void testChatCompletion()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Mengirim..." : "Send Request"}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-neo border border-base-line bg-base-ink p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><ArrowUpCircle className="h-3.5 w-3.5" /> Request Sent</span>
                  {meta.lastRequest ? <span className="font-mono text-[10px] text-slate-500">{meta.statusCode} · {meta.duration}ms</span> : null}
                </div>
                {meta.lastRequest ? (
                  <pre className="max-h-40 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300">{meta.lastRequest}</pre>
                ) : (
                  <p className="py-3 text-center text-xs text-slate-500">Belum ada request terkirim.</p>
                )}
              </div>
              <div className="rounded-neo border border-base-line bg-base-ink p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <ArrowDownCircle className="h-3.5 w-3.5" /> Response
                    {response && "error" in (response.raw as Record<string, unknown>) ? <span className="rounded-full bg-[#B4522E] px-2 py-0.5 text-[9px] font-black text-white">Error</span> : response && meta.statusCode ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">{meta.statusCode}</span> : null}
                  </span>
                  {response?.usage ? <span className="font-mono text-[10px] text-slate-500">{Number(response.usage.total_tokens || 0).toLocaleString("id-ID")} tokens</span> : null}
                </div>
                {sending ? (
                  <div className="py-4 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-xs text-slate-500">Mengirim request...</p>
                  </div>
                ) : !response ? (
                  <p className="py-4 text-center text-xs text-slate-500">Response akan tampil di sini setelah mengirim.</p>
                ) : "error" in (response.raw as Record<string, unknown>) ? (
                  <p className="rounded border-2 border-red-500 bg-red-950 p-2 text-xs font-bold text-red-300">{String((response.raw as Record<string, unknown>).error)}</p>
                ) : (
                  <>
                    <div className="rounded border border-slate-700 bg-slate-900 p-2">
                      <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Assistant Response</p>
                      <div className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-xs text-slate-200">{response.content}</div>
                    </div>
                    <details open className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-slate-500">Raw JSON Response</summary>
                      <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-900 p-2 font-mono text-[10px] leading-relaxed text-slate-300">{JSON.stringify(response.raw, null, 2)}</pre>
                    </details>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> GET /quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold text-base-ink/60">
            Cek status quota API key Anda secara programatik. Kirim API key di header <code className="rounded border border-base-line bg-base-bg px-1.5 py-0.5 font-mono text-xs font-bold">Authorization: Bearer &lt;API_KEY&gt;</code>. Cocok untuk monitoring pemakaian token dari script atau aplikasi.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">cURL Example</label>
                  <Button type="button" variant="outline" size="sm" className="px-2.5 py-1 text-xs" onClick={() => void copy("quota-curl", quotaCurl)}>
                    <Copy className="h-3.5 w-3.5" />{copied === "quota-curl" ? "Tersalin" : "Copy"}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 text-xs font-mono font-bold text-emerald-300">{quotaCurl}</pre>
              </div>
              <Button type="button" variant="sun" className="w-full" disabled={quotaLoading} onClick={() => void testQuotaCheck()}>
                {quotaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {quotaLoading ? "Mengecek..." : "Test Check Quota"}
              </Button>
            </div>
            <div className="rounded-neo border border-base-line bg-base-ink p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <ArrowDownCircle className="h-3.5 w-3.5" /> Response
                  {quotaResult && "error" in quotaResult ? <span className="rounded-full bg-[#B4522E] px-2 py-0.5 text-[9px] font-black text-white">Error</span> : quotaRaw ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">{quotaMeta.statusCode}</span> : null}
                </span>
                {quotaMeta.duration ? <span className="font-mono text-[10px] text-slate-500">{quotaMeta.statusCode} · {quotaMeta.duration}ms</span> : null}
              </div>
              {quotaLoading ? (
                <div className="py-4 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  <p className="mt-2 text-xs text-slate-500">Mengecek quota...</p>
                </div>
              ) : !quotaResult ? (
                <>
                  <p className="mb-1 text-xs text-slate-500">Contoh response:</p>
                  <pre className="font-mono text-[10px] leading-relaxed text-slate-500">{JSON.stringify(QUOTA_SAMPLE_RESPONSE, null, 2)}</pre>
                </>
              ) : "error" in quotaResult ? (
                <p className="rounded border-2 border-red-500 bg-red-950 p-2 text-xs font-bold text-red-300">{String(quotaResult.error)}</p>
              ) : (
                <>
                  <div className="rounded border border-slate-700 bg-slate-900 p-2">
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Status</span><span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase", quotaRaw?.status === "active" ? "border-emerald-400 bg-emerald-950 text-emerald-300" : "border-red-400 bg-red-950 text-red-300")}>{String(quotaRaw?.status)}</span></div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Used / Max</span><span className="font-mono text-slate-200">{formatTokens(Number((quotaRaw?.usage as Record<string, unknown>)?.total_tokens || 0))} / {quotaRaw?.maxTokens ? formatTokens(Number(quotaRaw.maxTokens)) : "Unlimited"}</span></div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Remaining</span><span className="font-mono text-slate-200">{formatTokens(Number(quotaRaw?.remainingTokens || 0))}</span></div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Requests</span><span className="font-mono text-slate-200">{String((quotaRaw?.usage as Record<string, unknown>)?.requests || 0)}</span></div>
                  </div>
                  <details open className="mt-2">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500">Raw JSON Response</summary>
                    <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-900 p-2 font-mono text-[10px] leading-relaxed text-slate-300">{JSON.stringify(quotaResult, null, 2)}</pre>
                  </details>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqSection() {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-neo border border-base-line bg-accent-sun p-5 shadow-neo">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 text-white/30">
          <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="12" />
        </motion.svg>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-base-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            <HelpCircle className="h-3 w-3" /> Bantuan
          </span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">Frequently Asked Questions</h1>
          <p className="mt-1 text-sm font-bold text-base-ink/60">Penjelasan multiplier, grade model, dan cara perhitungan token.</p>
        </div>
      </div>

      <CollapsibleCard title="Apa itu Model Multiplier?" defaultOpen>
        <div className="space-y-3 text-sm font-semibold text-base-ink/70">
          <p>
            <span className="font-black text-base-ink">Model Multiplier</span> adalah pengali konsumsi token untuk setiap model. Secara default semua model
            menggunakan multiplier <span className="font-black text-base-ink">1x</span>, artinya token yang terpakai dihitung 1:1 terhadap quota Anda.
          </p>
          <p>
            Jika sebuah model diatur ke multiplier <span className="font-black text-base-ink">1.5x</span>, maka setiap token yang dikonsumsi akan dihitung 1.5 kali
            lipat terhadap quota. Contoh: upstream menghitung 1.000 token, maka quota Anda berkurang <span className="font-black text-base-ink">1.500 token</span>.
          </p>
          <p>
            Multiplier ditampilkan di kolom <span className="font-black text-base-ink">Multiplier</span> pada tab <span className="font-black text-base-ink">Model</span>,
            misalnya <code className="rounded border border-base-line bg-base-bg px-1.5 py-0.5 font-mono text-xs font-bold text-base-ink">glm-5.2-debug (1.5x)</code>.
            Model dengan nilai <span className="font-black text-base-ink">1x</span> berarti tanpa pengali tambahan.
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Apa arti Grade Model?" defaultOpen={false}>
        <div className="space-y-3 text-sm font-semibold text-base-ink/70">
          <p>
            Grade membantu Anda memilih model berdasarkan kualitas dan performa layanan. Grade tidak menilai kemampuan dasar model secara mutlak; pengalaman dapat
            berubah sesuai kondisi layanan.
          </p>
          <div className="grid gap-2">
            {GRADE_INFO.map((item) => (
              <div key={item.grade} className="flex gap-3 rounded-neo border border-base-line bg-white p-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line text-base font-black", gradeStyle(item.grade))}>
                  {item.grade}
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-base-ink">{item.title}</p>
                  <p className="mt-0.5 text-sm font-semibold text-base-ink/60">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-neo border border-base-line bg-accent-skySoft p-3">
            <p className="font-extrabold text-base-ink">Analogi paling mudah memahami Grade A &amp; B</p>
            <p className="mt-1 text-sm font-semibold text-base-ink/70">
              Grade A itu analoginya barangnya diambil dari toko-toko besar seperti hypermart, indomarco dan lainnya. Sedangkan Grade B analoginya diambil dari toko
              grosir kecil. Bisa jadi Grade B kualitasnya bagus, tapi tetap diberi Grade B karena sumbernya bukan dari toko besar.
            </p>
          </div>
          <p>
            Untuk yang concern soal <span className="font-black text-base-ink">privacy dan keamanan</span>, saran kami pakai model
            <span className="font-black text-base-ink"> Grade A</span> saja. Lebih aman dari risiko cloaking dan lainnya.
          </p>
          <p>
            Untuk <span className="font-black text-base-ink">Grade B</span>, kualitas tidak bisa dijamin, tapi kami bisa memberi kompensasi kerugian berupa
            <span className="font-black text-base-ink"> tambahan token</span> kalau kualitas Grade B-nya sangat buruk.
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Bagaimana token dan quota dihitung?" defaultOpen={false}>
        <div className="space-y-3 text-sm font-semibold text-base-ink/70">
          <p>
            Setelah setiap request berhasil, sistem membaca data penggunaan dari respons model: <span className="font-black text-base-ink">prompt token</span>
            {" "}(pesan/instruksi yang dikirim) dan <span className="font-black text-base-ink">completion token</span> (jawaban model). Keduanya dijumlahkan menjadi
            total token, lalu dicatat ke usage akun dan riwayat per model.
          </p>
          <p>
            Jika upstream tidak mengirim data prompt token yang lengkap, sistem memakai estimasi minimum dari isi pesan agar pemakaian tetap tercatat. Untuk request
            gambar, estimasi token gambar dari konfigurasi model juga ikut diperhitungkan. Cache token dicatat sebagai informasi penggunaan, tetapi quota utama tetap
            memakai total token yang ditagihkan model.
          </p>
          <div className="rounded-neo border border-base-line bg-accent-sun p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/60">Rumus sederhana</p>
            <p className="mt-1 font-mono text-sm font-black text-base-ink">(prompt token + completion token) × multiplier model</p>
          </div>
          <p>
            Hasilnya dibulatkan lalu dikurangi dari quota. Saat total penggunaan mencapai quota, API key menjadi
            <span className="font-black text-base-ink"> exceeded</span> dan request berikutnya ditolak sampai quota ditambah.
          </p>

          <p className="pt-1 font-extrabold text-base-ink">Simulasi mudah</p>
          <p>
            Misal quota awal Anda <span className="font-black text-base-ink">1.000.000 token</span>. Anda mengirim request dengan
            <span className="font-black text-base-ink"> 800 prompt token</span> dan model menjawab <span className="font-black text-base-ink">1.200 completion token</span>.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-neo border border-base-line bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">Model 1x</p>
              <p className="mt-1 font-mono text-xs font-bold text-base-ink">(800 + 1.200) × 1 = 2.000 token</p>
              <p className="mt-1 text-xs font-bold text-base-ink/60">Sisa quota: 1.000.000 − 2.000 = <span className="font-black text-base-ink">998.000</span></p>
            </div>
            <div className="rounded-neo border border-base-line bg-accent-skySoft p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">Model 1,5x</p>
              <p className="mt-1 font-mono text-xs font-bold text-base-ink">(800 + 1.200) × 1,5 = 3.000 token</p>
              <p className="mt-1 text-xs font-bold text-base-ink/60">Sisa quota: 1.000.000 − 3.000 = <span className="font-black text-base-ink">997.000</span></p>
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

/**
 * Kartu Keamanan: ganti PIN + rotasi API key.
 * accessToken dibaca dari sessionStorage (key `quota_at_<token>`, sama seperti unlock).
 */
function SecurityCard({
  token,
  onSession,
  onDataChanged,
}: {
  token: string;
  onSession: (accessToken: string) => void;
  onDataChanged: () => Promise<void> | void;
}) {
  const t = useT();
  const storageKey = `quota_at_${token}`;
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);
  const [regenErr, setRegenErr] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem(storageKey) || ""}`,
    };
  }

  async function submitChangePin(event: React.FormEvent) {
    event.preventDefault();
    setPinErr(null);
    setPinMsg(null);
    if (newPin !== confirmPin) {
      setPinErr(t("PIN baru dan ulanginya tidak sama"));
      return;
    }
    setPinBusy(true);
    try {
      const res = await fetch(`/api/public/quota/${encodeURIComponent(token)}/change-pin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ oldPin, newPin }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Gagal mengganti PIN");
      if (typeof body.accessToken === "string" && body.accessToken) onSession(body.accessToken);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setPinMsg(t("PIN berhasil diganti"));
    } catch (e) {
      setPinErr(e instanceof Error ? e.message : "Gagal mengganti PIN");
    } finally {
      setPinBusy(false);
    }
  }

  async function regenerateKey() {
    if (!window.confirm(t("Ganti API key? Key lama langsung tidak bisa dipakai — semua aplikasi harus update ke key baru."))) return;
    setRegenErr(null);
    setRegenMsg(null);
    setRegenBusy(true);
    try {
      const res = await fetch(`/api/public/quota/${encodeURIComponent(token)}/regenerate-key`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Gagal mengganti API key");
      await onDataChanged();
      const until = body.cooldownAt ? ` · ${t("ganti lagi")} ${new Date(body.cooldownAt).toLocaleTimeString("id-ID")}` : "";
      setRegenMsg(t("API key baru dibuat") + (body.keyMasked ? `: ${body.keyMasked}` : "") + until);
    } catch (e) {
      setRegenErr(e instanceof Error ? e.message : "Gagal mengganti API key");
    } finally {
      setRegenBusy(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /> {t("Keamanan")}</CardTitle></CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <form onSubmit={submitChangePin} className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">{t("Ganti PIN")}</p>
          <Input
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder={t("PIN lama")}
            value={oldPin}
            onChange={(event) => setOldPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder={t("PIN baru")}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <Input
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder={t("Ulangi PIN baru")}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={pinBusy || oldPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
          >
            {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} {t("Ganti PIN")}
          </Button>
          {pinMsg ? <p className="text-xs font-bold text-emerald-600">{pinMsg}</p> : null}
          {pinErr ? <p className="text-xs font-bold text-red-600">{pinErr}</p> : null}
        </form>
        <div className="border-t border-base-line pt-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">{t("Ganti API Key")}</p>
          <p className="mt-1 text-xs font-semibold text-base-ink/60">{t("Rotasi API key jadi yang baru. Key lama langsung mati.")}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" disabled={regenBusy} onClick={regenerateKey}>
            {regenBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} {t("Ganti API Key")}
          </Button>
          {regenMsg ? <p className="mt-2 break-all text-xs font-bold text-emerald-600">{regenMsg}</p> : null}
          {regenErr ? <p className="mt-2 text-xs font-bold text-red-600">{regenErr}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactCs({ resellerCs }: { resellerCs: { name: string; waNumber: string | null; telegram: string | null } | null }) {  const wa = resellerCs?.waNumber;
  const tg = resellerCs?.telegram;
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Halo, saya butuh bantuan soal kuota API saya.")}` : null;
  const tgHref = tg ? `https://t.me/${tg}` : null;
  return (
    <Card className="relative overflow-hidden bg-accent-skySoft">
      <motion.svg animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 text-base-ink/10"><path d="M50 4 61 36 95 37 68 57 77 91 50 71 23 91 32 57 5 37 39 36Z" fill="currentColor" /></motion.svg>
      <CardHeader><CardTitle>Kontak CS</CardTitle></CardHeader>
      <CardContent>
        {waHref || tgHref ? (
          <>
            <p className="mb-4 text-sm font-semibold text-base-ink/60">
              Butuh bantuan? Hubungi: <span className="font-black">{resellerCs?.name}</span>
            </p>
            {waHref ? (
              <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-neo border border-base-line bg-accent-mint px-4 py-3 font-extrabold shadow-neo-sm">
                <MessageCircle className="h-5 w-5" /> WhatsApp {resellerCs?.name}
              </a>
            ) : null}
            {tgHref ? (
              <a href={tgHref} target="_blank" rel="noreferrer" className={`inline-flex w-full items-center justify-center gap-2 rounded-neo border border-base-line bg-accent-sky px-4 py-3 font-extrabold shadow-neo-sm ${waHref ? "mt-2" : ""}`}>
                <MessageCircle className="h-5 w-5" /> Telegram {resellerCs?.name}
              </a>
            ) : null}
          </>
        ) : (
          <p className="text-sm font-semibold text-base-ink/60">Kontak CS belum tersedia. Silakan hubungi reseller tempat Anda membeli.</p>
        )}
      </CardContent>
    </Card>
  );
}

type HermesOs = "linux" | "windows" | "macos";

function HermesSetup({ copy, copied, data }: { copy: (label: string, value: string) => Promise<void>; copied: string | null; data: QuotaDashboardView }) {
  const [os, setOs] = useState<HermesOs>("linux");
  const [showKey, setShowKey] = useState(false);

  const baseUrl = data.baseUrl.replace(/\/$/, "");
  const origin = baseUrl.replace(/\/v1$/, "");
  const apiKey = data.key || "";
  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${"•".repeat(18)}${apiKey.slice(-4)}` : "API_KEY_KAMU";

  const build = useCallback(
    (key: string) => ({
      linux: [
        {
          id: "hermes-linux",
          label: "Terminal (bash)",
          command: `BASE_URL="${baseUrl}" API_KEY="${key}" bash <(curl -fsSL ${origin}/docs/linux.sh)`,
        },
      ],
      macos: [
        {
          id: "hermes-macos",
          label: "Terminal (bash)",
          command: `BASE_URL="${baseUrl}" API_KEY="${key}" bash <(curl -fsSL ${origin}/docs/macos.sh)`,
        },
      ],
      windows: [
        {
          id: "hermes-win-ps",
          label: "PowerShell",
          command: `$env:BASE_URL="${baseUrl}"; $env:API_KEY="${key}"; iex (irm ${origin}/docs/windows.ps1)`,
        },
        {
          id: "hermes-win-cmd",
          label: "CMD",
          command: `set "BASE_URL=${baseUrl}" && set "API_KEY=${key}" && powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm ${origin}/docs/windows.ps1)"`,
        },
      ],
    }),
    [baseUrl, origin]
  );

  const realBlocks = build(apiKey)[os];
  const shownBlocks = build(showKey ? apiKey : maskedKey)[os];

  const osTabs: Array<[HermesOs, string]> = [
    ["linux", "Linux / VPS"],
    ["windows", "Windows"],
    ["macos", "macOS"],
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-base-ink/60">
        Base URL dan API key di bawah sudah terisi otomatis dari akun kamu. Tinggal salin lalu tempel di terminal.
      </p>

      <div className="grid grid-cols-3 gap-2 rounded-neo border border-base-line bg-base-bg p-2">
        {osTabs.map(([id, label]) => (
          <motion.button
            key={id}
            type="button"
            onClick={() => setOs(id)}
            whileHover={{ y: -2 }}
            whileTap={{ y: 1 }}
            className={cn(
              "rounded-neo border border-base-line px-2 py-2 text-[11px] font-extrabold uppercase",
              os === id ? "bg-accent-sky" : "bg-white"
            )}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowKey((value) => !value)}>
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showKey ? "Sembunyikan API key" : "Tampilkan API key"}
        </Button>
      </div>

      {shownBlocks.map((block, index) => (
        <div key={block.id} className="rounded-neo border border-base-line bg-white p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-base-ink/50">{block.label}</p>
          <code className="mt-2 block whitespace-pre-wrap break-all rounded-neo border border-base-line bg-base-bg p-3 font-mono text-xs font-bold">
            {block.command}
          </code>
          <Button type="button" size="sm" className="mt-2" onClick={() => copy(block.id, realBlocks[index].command)}>
            <Copy className="h-4 w-4" />
            {copied === block.id ? "Tersalin" : "Salin perintah"}
          </Button>
        </div>
      ))}

      <div className="rounded-neo border border-base-line bg-accent-sunSoft p-3">
        <p className="text-xs font-bold text-base-ink/70">
          Script bersifat idempotent — aman dijalankan berulang. Hermes akan diinstall otomatis bila belum ada, lalu Base URL
          dan API key kamu langsung dipasang. Setelah selesai, jalankan <code className="font-mono font-extrabold">hermes</code>.
        </p>
      </div>
    </div>
  );
}

function Tutorial({ copy, copied, data }: { copy: (label: string, value: string) => Promise<void>; copied: string | null; data: QuotaDashboardView }) {
  const command = "npx --yes @buatprem/autosetup@latest";
  return (
    <div className="space-y-4">
      <CollapsibleCard title="Setup Hermes" defaultOpen={false}>
        <HermesSetup copy={copy} copied={copied} data={data} />
      </CollapsibleCard>

      <CollapsibleCard title="Setup VSCode" defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-base-ink/60">Tonton panduan setup VSCode di bawah ini:</p>
          <div className="overflow-hidden rounded-neo border border-base-line shadow-neo-sm">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/JsrCHUkFuH4"
                title="Setup VSCode"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Setup OpenCode" defaultOpen={false}>
        <div className="space-y-3">
          <Step number="1" title="Buka terminal">Gunakan Terminal, PowerShell, atau CMD.</Step>
          <Step number="2" title="Jalankan perintah"><code className="mt-2 block break-all rounded-neo border border-base-line bg-base-bg p-3 font-mono text-sm font-bold">{command}</code><Button type="button" size="sm" className="mt-2" onClick={() => copy("command", command)}>{copied === "command" ? "Tersalin" : "Salin perintah"}</Button></Step>
          <Step number="3" title="Isi data API">Gunakan Base URL dan API key dari tab Kuota.</Step>
          <div className="overflow-hidden rounded-neo border border-base-line shadow-neo-sm">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/yMuxkKcuGww"
                title="Setup OpenCode"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Setup 9Router" defaultOpen={false}>
        <div className="space-y-3">
          <Step number="1" title="Install">Jalankan <code className="font-mono font-bold">npm install -g 9router</code>.</Step>
          <Step number="2" title="Tambah provider">Pilih OpenAI Compatible. Base URL: <code className="break-all font-mono font-bold">{data.baseUrl}</code>.</Step>
          <Step number="3" title="Tambah key">Masukkan API key dari tab Kuota, lalu import model dari <code className="font-mono font-bold">/models</code>.</Step>
          <div className="overflow-hidden rounded-neo border border-base-line shadow-neo-sm">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/tu-F3AjxPmc"
                title="Setup 9Router"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

function CollapsibleCard({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-left sm:p-5">
        <CardTitle className="flex items-center gap-2">
          {title}
        </CardTitle>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-bg">
          {open ? <ChevronUp className="h-4 w-4" strokeWidth={2.5} /> : <ChevronDown className="h-4 w-4" strokeWidth={2.5} />}
        </span>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          <CardContent className="pt-0">{children}</CardContent>
        </motion.div>
      )}
    </Card>
  );
}

function QuotaShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className={cn("relative min-h-screen overflow-hidden bg-base-bg p-3 sm:p-5", wide ? "lg:p-6" : "sm:p-8")}>
      <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full text-base-ink/[0.045]"><defs><pattern id="quota-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs><rect width="100%" height="100%" fill="url(#quota-grid)" /></svg>
      <motion.svg animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }} viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -right-28 -top-28 h-80 w-80 text-accent-sky/35"><path d="M100 8 120 72 188 72 133 112 154 178 100 138 46 178 67 112 12 72 80 72Z" fill="currentColor" /></motion.svg>
      <motion.svg animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} viewBox="0 0 160 160" aria-hidden className="pointer-events-none fixed -bottom-20 -left-20 h-64 w-64 text-accent-sun/40"><rect x="30" y="30" width="100" height="100" rx="18" fill="currentColor" stroke="currentColor" strokeWidth="4" /></motion.svg>
      <div className="relative mx-auto w-full">
        <div className="mb-2 flex justify-end">
          <LangSwitch />
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={cn("relative mx-auto w-full", wide ? "max-w-none" : "max-w-lg")}>{children}</motion.div>
    </main>
  );
}

function Header({ brandName, name, status }: { brandName: string; name: string; status: string }) {
  return <header className="relative mb-5 overflow-hidden rounded-neo border border-base-line bg-accent-lavender p-5 shadow-neo sm:p-6"><svg viewBox="0 0 200 100" aria-hidden className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-white/25"><path d="M35 5 75 95 115 5 155 95 195 5" fill="none" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" /></svg><div className="relative"><p className="text-xs font-extrabold uppercase tracking-[0.22em]">{brandName} · Dashboard</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{name}</h1><span className="mt-3 inline-flex items-center gap-2 rounded-full border border-base-line bg-white px-3 py-1 text-xs font-extrabold capitalize"><motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className={cn("h-2 w-2 rounded-full", status === "active" ? "bg-accent-sage" : "bg-[#C96A4A]")} />{status}</span></div></header>;
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return <motion.div whileHover={{ y: -4, rotate: 0.5 }} className={cn("relative overflow-hidden rounded-neo border border-base-line p-4 shadow-neo-sm", color)}><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 text-base-ink/10"><circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="10" /></svg><p className="relative text-[10px] font-extrabold uppercase tracking-widest text-base-ink/50">{label}</p><p className="relative mt-1 text-2xl font-black">{value}</p></motion.div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-2 rounded-neo border border-base-line bg-base-bg px-3 py-2"><span className="text-[10px] font-extrabold uppercase text-base-ink/50">{label}</span><span className="break-all text-right font-mono text-sm font-bold">{value}</span></div>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{children}</p>;
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div className="flex gap-3 rounded-neo border border-base-line bg-white p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-sky font-extrabold">{number}</span><div className="min-w-0"><p className="font-extrabold">{title}</p><div className="mt-1 text-sm font-semibold text-base-ink/60">{children}</div></div></div>;
}

type PayMethods = { qris: boolean; binancepay: boolean; usdtNetworks: string[] };
type PayMethodChoice = { kind: "qris" } | { kind: "binancepay" } | { kind: "usdt"; network: string };

function BuyQuotaPopup({
  token,
  products,
  loading,
  onClose,
  onRefreshProducts,
}: {
  token: string;
  products: QuotaProduct[];
  loading: boolean;
  onClose: () => void;
  onRefreshProducts?: () => Promise<void> | void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<QuotaProduct | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payMethods, setPayMethods] = useState<PayMethods | null>(null);
  const [method, setMethod] = useState<PayMethodChoice>({ kind: "qris" });
  const [usdtRate, setUsdtRate] = useState(0);

  function usdtPrice(idr: number) {
    if (!usdtRate) return null;
    return (idr / usdtRate).toFixed(2);
  }

  // Payment state
  const [invoice, setInvoice] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<"idr" | "usdt">("idr");
  const [payInfo, setPayInfo] = useState<{ method: string; content: string } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [grace, setGrace] = useState(false);
  const timersRef = useRef<{ timer?: ReturnType<typeof setInterval>; poller?: ReturnType<typeof setInterval> }>({});

  // Ambil metode pembayaran yang tersedia
  useEffect(() => {
    void fetch("/api/public/pay-methods", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (data.ok) {
          setPayMethods(data.methods);
          if (typeof data.usdtRate === "number" && data.usdtRate > 0) setUsdtRate(data.usdtRate);
          if (data.methods.qris) setMethod({ kind: "qris" });
          else if (data.methods.binancepay) setMethod({ kind: "binancepay" });
          else if (data.methods.usdtNetworks?.length) setMethod({ kind: "usdt", network: data.methods.usdtNetworks[0] });
        }
      })
      .catch(() => {});
  }, []);

  function clearTimers() {
    if (timersRef.current.timer) clearInterval(timersRef.current.timer);
    if (timersRef.current.poller) clearInterval(timersRef.current.poller);
    timersRef.current = {};
  }

  // Bersihkan semua interval saat popup ditutup/unmount
  useEffect(() => clearTimers, []);

  async function handleOrder() {
    if (!selected) return;
    setOrdering(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/quota/${encodeURIComponent(token)}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          payMethod: method.kind,
          network: method.kind === "usdt" ? method.network : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Gagal membuat pesanan");
        setOrdering(false);
        return;
      }
      setInvoice(data.invoice);
      setAmount(data.amount);
      setCurrency(data.currency ?? "idr");
      setPayInfo({ method: data.payMethod ?? method.kind, content: String(data.qrisPayload || "") });
      setPaid(false);
      setExpired(false);
      setGrace(false);
      setQrFailed(false);

      try {
        const url = await QRCode.toDataURL(String(data.qrisPayload || ""), { width: 400, margin: 2 });
        setQrUrl(url);
      } catch {
        setQrFailed(true);
      }

      // Countdown — lewat TTL masuk masa tunggu notifikasi, bukan langsung expired
      const expires = new Date(data.expiresAt);
      const tick = () => {
        const diff = Math.max(0, expires.getTime() - Date.now());
        if (diff <= 0) {
          setCountdown("00:00");
          setGrace(true);
          return true;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
        return false;
      };
      tick();
      const timer = setInterval(() => {
        if (tick()) clearInterval(timer);
      }, 1000);

      // Poll status — berhenti total saat paid/expired/failed final
      const poll = async () => {
        try {
          const r = await fetch(`/api/payment/status/${data.invoice}`);
          const st = await r.json();
          if (st.ok && st.status === "paid") {
            setPaid(true);
            setGrace(false);
            clearTimers();
          }
          if (st.ok && (st.status === "expired" || st.status === "failed")) {
            setExpired(true);
            setGrace(false);
            clearTimers();
          }
        } catch {}
      };
      poll();
      const poller = setInterval(poll, 3000);
      timersRef.current = { timer, poller };
    } catch {
      setError("Gagal membuat pesanan");
    }
    setOrdering(false);
  }

  function reset() {
    clearTimers();
    setSelected(null);
    setInvoice(null);
    setAmount(0);
    setCurrency("idr");
    setPayInfo(null);
    setQrUrl(null);
    setQrFailed(false);
    setPaid(false);
    setExpired(false);
    setGrace(false);
    setError(null);
    void onRefreshProducts?.();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-base-ink/50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header dengan SVG */}
        <div className="relative flex items-center justify-between border-b border-base-line bg-accent-sky p-4">
          <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 text-base-ink/10">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" />
            <path d="M50 20 L60 45 L85 45 L65 60 L72 85 L50 70 L28 85 L35 60 L15 45 L40 45 Z" fill="currentColor" />
          </svg>
          <div className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-white shadow-neo-sm">
              <PlusCircle className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-extrabold">
                {paid ? t("Kuota Bertambah") : invoice ? t("Scan QRIS") : t("Tambah Kuota")}
              </h2>
              <p className="text-xs font-semibold text-base-ink/65">
                {paid ? t("Token telah ditambahkan") : invoice ? t("Bayar sesuai nominal") : t("Pilih paket token")}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="relative flex h-9 w-9 items-center justify-center rounded-neo border border-base-line bg-white shadow-neo-sm">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Phase 1: Select product */}
          {!invoice && !paid && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.svg animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} viewBox="0 0 50 50" className="h-8 w-8 text-base-ink/40">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray="31.4 94.2" />
                  </motion.svg>
                </div>
              ) : products.length === 0 ? (
                <p className="py-12 text-center text-sm font-bold text-base-ink/50">{t("Belum ada paket tersedia.")}</p>
              ) : (
                <div className="grid gap-2">
                  {products.map((product, i) => {
                    const isSelected = selected?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={!product.affordable}
                        onClick={() => product.affordable && setSelected(product)}
                        className={cn(
                          "relative flex items-center justify-between gap-3 rounded-neo border-2 p-3 text-left transition-all",
                          !product.affordable
                            ? "cursor-not-allowed border-base-ink/20 bg-base-bg opacity-50"
                            : isSelected
                              ? "border-base-ink bg-accent-sky shadow-neo-sm"
                              : "border-base-ink bg-white hover:bg-accent-sky/30"
                        )}
                      >
                        <svg viewBox="0 0 100 100" aria-hidden className={cn("pointer-events-none absolute -right-3 -top-3 h-16 w-16", i % 3 === 0 ? "text-accent-sun/20" : i % 3 === 1 ? "text-accent-lavender/20" : "text-accent-sky/20")}>
                          <polygon points="50,10 90,90 10,90" fill="currentColor" />
                        </svg>
                        <div className="relative flex items-center gap-3">
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border border-base-line text-xs font-black", i % 3 === 0 ? "bg-accent-sun" : i % 3 === 1 ? "bg-accent-lavender" : "bg-accent-mint")}>
                            {product.sku}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold">{product.name}</p>
                            <p className="text-xs font-semibold text-base-ink/55">
                              {formatTokens(product.tokens)} token · {product.validDays} hari
                            </p>
                          </div>
                        </div>
                        <div className="relative flex flex-col items-end gap-0.5">
                          {!product.affordable ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                              <Lock className="h-3 w-3" /> Stok habis
                            </span>
                          ) : isSelected ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-base-line bg-accent-mint">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          ) : null}
                          <span className="font-mono text-sm font-extrabold">Rp{product.price.toLocaleString("id-ID")}</span>
                          {usdtPrice(product.price) && (
                            <span className="font-mono text-[10px] font-bold text-base-ink/45">≈ {usdtPrice(product.price)} USDT</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Pilihan metode pembayaran */}
              {payMethods && (payMethods.binancepay || payMethods.usdtNetworks.length > 0) && (
                <div className="mt-3 rounded-neo border border-base-line bg-base-bg p-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-base-ink/50">{t("Metode Pembayaran")}</p>
                  <div className="flex flex-wrap gap-2">
                    {payMethods.qris && (
                      <button type="button" onClick={() => setMethod({ kind: "qris" })} className={cn("rounded-neo border-2 px-3 py-1.5 text-xs font-black", method.kind === "qris" ? "border-base-ink bg-accent-sky" : "border-base-line bg-white")}>
                        QRIS
                      </button>
                    )}
                    {payMethods.binancepay && (
                      <button type="button" onClick={() => setMethod({ kind: "binancepay" })} className={cn("rounded-neo border-2 px-3 py-1.5 text-xs font-black", method.kind === "binancepay" ? "border-base-ink bg-accent-sun" : "border-base-line bg-white")}>
                        Binance Pay
                      </button>
                    )}
                    {payMethods.usdtNetworks.map((net) => (
                      <button key={net} type="button" onClick={() => setMethod({ kind: "usdt", network: net })} className={cn("rounded-neo border-2 px-3 py-1.5 text-xs font-black", method.kind === "usdt" && method.network === net ? "border-base-ink bg-accent-mint" : "border-base-line bg-white")}>
                        USDT {net}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="mt-3 rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{error}</p>}
            </>
          )}

          {/* Phase 2: QRIS Payment */}
          {invoice && !paid && !expired && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full rounded-neo border border-base-line bg-accent-sun p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-base-ink/60">No. Invoice</div>
                <div className="mt-0.5 break-all font-mono text-sm font-extrabold">{invoice}</div>
              </div>
              <div className="rounded-neo border border-base-line bg-white p-3 shadow-neo-sm">
                {qrUrl ? (
                  <img src={qrUrl} alt={currency === "usdt" ? "Address" : "QRIS"} className="h-48 w-48" />
                ) : qrFailed ? (
                  <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 p-3 text-center">
                    <p className="text-xs font-black uppercase text-red-500">{t("QR gagal dibuat")}</p>
                    <Button type="button" variant="outline" size="sm" onClick={reset}>{t("Coba Lagi")}</Button>
                  </div>
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-base-ink/40" />
                  </div>
                )}
              </div>
              {currency === "usdt" && payInfo && (
                <div className="w-full rounded-neo border border-base-line bg-base-bg p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-base-ink/50">
                    {payInfo.method === "binancepay" ? "UID Binance Pay (Transfer USDT ke UID)" : `Alamat USDT ${payInfo.method?.toUpperCase?.() ?? ""}`}
                  </div>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(payInfo.content).catch(() => {})} className="mt-1 w-full break-all rounded-neo border border-base-line bg-white p-2 font-mono text-xs font-extrabold">
                    {payInfo.content}
                  </button>
                  <p className="mt-1 text-[10px] font-bold text-base-ink/45">{t("Klik untuk copy")} · {t("Kirim tepat sesuai nominal di bawah")}</p>
                </div>
              )}
              <div className="w-full rounded-neo border border-base-line bg-base-bg p-4 text-center">
                <div className="text-xs font-bold uppercase text-base-ink/50">{t("Total Bayar")}</div>
                <div className="mt-1 text-2xl font-extrabold">
                  {currency === "usdt" ? `${(amount / 100).toFixed(2)} USDT` : `Rp${amount.toLocaleString("id-ID")}`}
                </div>
              </div>
              {grace ? (
                <>
                  <p className="rounded-neo border border-base-line bg-accent-sun p-3 text-center text-xs font-bold">
                    {t("Waktu pembayaran habis. Jika sudah bayar, tunggu konfirmasi otomatis (verifikasi bisa makan waktu beberapa menit).")}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={reset}>{t("Buat Pesanan Baru")}</Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-base-ink/70">
                  <Clock className="h-4 w-4" /> {t("Berlaku")} {countdown}
                </div>
              )}
              <p className="text-center text-xs text-base-ink/55">{t("Bayar tepat sesuai nominal. Kuota otomatis bertambah setelah pembayaran terverifikasi.")}</p>
            </div>
          )}

          {/* Phase 3: Expired */}
          {invoice && expired && !paid && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <svg viewBox="0 0 100 100" className="h-16 w-16 text-red-400">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
                <path d="M30 30 L70 70 M70 30 L30 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
              <h3 className="text-lg font-extrabold">{t("Invoice Kedaluwarsa")}</h3>
              <p className="text-sm text-base-ink/60">{t("Silakan buat pesanan baru.")}</p>
              <Button type="button" variant="primary" onClick={reset}>{t("Buat Pesanan Baru")}</Button>
            </div>
          )}

          {/* Phase 4: Paid */}
          {paid && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                <svg viewBox="0 0 100 100" className="h-16 w-16 text-green-500">
                  <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="5" />
                  <path d="M30 50 L45 65 L72 35" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <h3 className="text-lg font-extrabold">{t("Kuota Bertambah!")}</h3>
              <p className="text-sm text-base-ink/60">{t("Token telah ditambahkan ke akun Anda. Dashboard akan dimuat ulang.")}</p>
              <Button type="button" variant="primary" onClick={() => window.location.reload()}>{t("Muat Ulang Dashboard")}</Button>
            </div>
          )}
        </div>

        {/* Footer — Order button */}
        {!invoice && !paid && products.length > 0 && (
          <div className="border-t border-base-line p-4">
            <Button type="button" variant="primary" size="lg" className="w-full" disabled={!selected || ordering} onClick={handleOrder}>
              {ordering ? t("Memproses...") : selected ? `Order — Rp${selected.price.toLocaleString("id-ID")}${usdtPrice(selected.price) ? ` · ${usdtPrice(selected.price)} USDT` : ""}` : t("Pilih paket dulu")}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
