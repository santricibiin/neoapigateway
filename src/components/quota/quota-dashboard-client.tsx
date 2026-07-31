"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, Boxes, Copy, Eye, EyeOff, Gauge, KeyRound, LockKeyhole, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuotaDashboardView } from "@/lib/quota-dashboard";
import { cn } from "@/lib/utils";
import { MemberNewsPopup } from "@/components/news/member-news-popup";

type Meta = {
  id: string | number;
  name: string;
  status: string;
  pinSet: boolean;
  pinLockedUntil: string | null;
};

type Tab = "quota" | "models" | "usage" | "contact" | "tutorial";

const tabs: Array<[Tab, string]> = [
  ["quota", "Kuota"],
  ["models", "Model"],
  ["usage", "Usage"],
  ["contact", "Kontak"],
  ["tutorial", "Tutorial"],
];

const tabIcons = {
  quota: Gauge,
  models: Boxes,
  usage: BarChart3,
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

export function QuotaDashboardClient({ token, brandName }: { token: string; brandName: string }) {
  const storageKey = `quota_at_${token}`;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<QuotaDashboardView | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quota");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  if (loading) return <QuotaShell><p className="font-extrabold">Memuat dashboard...</p></QuotaShell>;

  if (!meta || (!data && error && !meta)) {
    return <QuotaShell><Alert>{error || "Dashboard tidak ditemukan"}</Alert></QuotaShell>;
  }

  if (!data) {
    return (
      <QuotaShell>
        <Header brandName={brandName} name={meta.name} status={meta.status} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /> Masuk PIN</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm font-semibold text-base-ink/60">Dashboard dilindungi PIN 6 digit.</p>
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
                {unlocking ? "Membuka..." : "Buka dashboard"}
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
      <MemberNewsPopup />
      <Header brandName={brandName} name={data.name} status={data.status} />
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-bold text-base-ink/50">ID #{data.id}</p>
        <Button type="button" variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4" /> Kunci lagi</Button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-neo border-2 border-base-ink bg-white p-2 shadow-neo sm:grid-cols-5">
        {tabs.map(([id, label]) => {
          const Icon = tabIcons[id];
          return (
            <motion.button key={id} type="button" onClick={() => setTab(id)} whileHover={{ y: -2 }} whileTap={{ y: 1 }} className={cn("relative flex items-center justify-center gap-2 overflow-hidden rounded-neo border-2 border-base-ink px-3 py-2.5 text-xs font-extrabold uppercase", tab === id ? "bg-accent-sky" : "bg-base-bg")}>
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
            <Stat label="Sisa" value={formatTokens(data.remainingTokens)} color="bg-accent-sky" />
            <Stat label="Terpakai" value={formatTokens(data.usage.total_tokens)} color="bg-accent-sun" />
            <Stat label="Maksimal" value={formatTokens(data.maxTokens)} color="bg-white" />
          </div>
          <Card>
            <CardHeader><CardTitle>Pemakaian</CardTitle></CardHeader>
            <CardContent>
              <div className="relative h-5 overflow-hidden rounded-full border-2 border-base-ink bg-base-bg">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.9, ease: "easeOut" }} className="relative h-full bg-accent-lavender">
                  <motion.span animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} className="absolute inset-y-0 w-1/3 skew-x-[-25deg] bg-white/35" />
                </motion.div>
              </div>
              <p className="mt-2 text-sm font-bold">{percentage}% terpakai · {data.usage.requests.toLocaleString("id-ID")} request</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Mini label="Prompt" value={data.usage.prompt_tokens.toLocaleString("id-ID")} />
                <Mini label="Completion" value={data.usage.completion_tokens.toLocaleString("id-ID")} />
                <Mini label="Cached" value={data.usage.cachedTokens.toLocaleString("id-ID")} />
                <Mini label="Valid days" value={data.validDays == null ? "-" : String(data.validDays)} />
              </div>
              <p className="mt-3 text-xs font-bold text-base-ink/50">Berakhir: {data.expiresAt ? new Date(data.expiresAt).toLocaleString("id-ID") : "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> API Key</CardTitle></CardHeader>
            <CardContent>
              <code className="block break-all rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold">{showKey ? data.key : data.keyMasked}</code>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showKey ? "Sembunyikan" : "Tampilkan"}</Button>
                <Button type="button" size="sm" onClick={() => copy("key", data.key)}><Copy className="h-4 w-4" />{copied === "key" ? "Tersalin" : "Copy key"}</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Base URL</CardTitle></CardHeader>
            <CardContent>
              <code className="block break-all font-mono text-sm font-bold">{data.baseUrl}</code>
              <Button type="button" size="sm" className="mt-3" onClick={() => copy("base", data.baseUrl)}><Copy className="h-4 w-4" />{copied === "base" ? "Tersalin" : "Copy Base URL"}</Button>
              <p className="mt-3 text-xs font-bold text-base-ink/50">{data.baseUrl}/models · {data.baseUrl}/chat/completions</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {tab === "models" ? (
        <motion.div key="models" variants={reveal} initial="hidden" animate="visible">
          <h2 className="mb-3 text-xl font-extrabold">{data.models.length} Model</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.models.map((model, index) => (
              <motion.button key={model.id} type="button" onClick={() => copy(`model:${model.id}`, model.id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} whileHover={{ y: -5, rotate: index % 2 ? 0.5 : -0.5 }} whileTap={{ y: 1 }} className={cn("relative min-h-36 overflow-hidden rounded-neo border-2 border-base-ink p-4 text-left shadow-neo-sm", index % 3 === 0 ? "bg-accent-sky" : index % 3 === 1 ? "bg-accent-sun" : "bg-white")}>
                <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 text-base-ink/10"><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
                <div className="mb-5 flex justify-between text-[10px] font-extrabold uppercase"><span>{model.enabled ? "Aktif" : "Nonaktif"}</span><span>{model.multiplier || data.modelMultipliers[model.id] || 1}x</span></div>
                <p className="break-all font-mono text-sm font-extrabold">{model.id}</p>
                <p className="mt-3 text-[10px] font-bold uppercase text-base-ink/50">{copied === `model:${model.id}` ? "Tersalin" : model.vision ? "Vision · klik untuk copy" : "Text · klik untuk copy"}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : null}

      {tab === "usage" ? (
        <motion.div key="usage" variants={reveal} initial="hidden" animate="visible"><Card>
          <CardHeader><CardTitle>Usage per model</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2 sm:grid-cols-4"><Mini label="Total" value={formatTokens(data.usage.total_tokens)} /><Mini label="Input" value={formatTokens(data.usage.prompt_tokens)} /><Mini label="Output" value={formatTokens(data.usage.completion_tokens)} /><Mini label="Request" value={data.usage.requests.toLocaleString("id-ID")} /></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b-2 border-base-ink"><tr><th className="py-2 pr-3">Model</th><th className="py-2 pr-3 text-right">Total</th><th className="py-2 pr-3 text-right">Input</th><th className="py-2 pr-3 text-right">Output</th><th className="py-2 text-right">Request</th></tr></thead>
                <tbody>{usageRows.map((row) => <tr key={row.id} className="border-b border-base-ink/15"><td className="py-2 pr-3 font-mono font-bold">{row.id}</td><td className="py-2 pr-3 text-right">{row.total.toLocaleString("id-ID")}</td><td className="py-2 pr-3 text-right">{row.prompt.toLocaleString("id-ID")}</td><td className="py-2 pr-3 text-right">{row.completion.toLocaleString("id-ID")}</td><td className="py-2 text-right">{row.requests.toLocaleString("id-ID")}</td></tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card></motion.div>
      ) : null}

      {tab === "contact" ? (
        <motion.div key="contact" variants={reveal} initial="hidden" animate="visible"><Card className="relative overflow-hidden bg-accent-skySoft">
          <motion.svg animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 text-base-ink/10"><path d="M50 4 61 36 95 37 68 57 77 91 50 71 23 91 32 57 5 37 39 36Z" fill="currentColor" /></motion.svg>
          <CardHeader><CardTitle>Kontak CS</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-sm font-semibold text-base-ink/60">Butuh bantuan? Hubungi customer service melalui Telegram.</p>
            <a href="https://t.me/wafasukataro" target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sky px-4 py-3 font-extrabold shadow-neo-sm"><MessageCircle className="h-5 w-5" /> Buka Telegram CS</a>
          </CardContent>
        </Card></motion.div>
      ) : null}

      {tab === "tutorial" ? <motion.div key="tutorial" variants={reveal} initial="hidden" animate="visible"><Tutorial copy={copy} copied={copied} data={data} /></motion.div> : null}
    </QuotaShell>
  );
}

function Tutorial({ copy, copied, data }: { copy: (label: string, value: string) => Promise<void>; copied: string | null; data: QuotaDashboardView }) {
  const command = "npx --yes @buatprem/autosetup@latest";
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Setup OpenCode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Step number="1" title="Buka terminal">Gunakan Terminal, PowerShell, atau CMD.</Step>
          <Step number="2" title="Jalankan perintah"><code className="mt-2 block break-all rounded-neo border-2 border-base-ink bg-base-bg p-3 font-mono text-sm font-bold">{command}</code><Button type="button" size="sm" className="mt-2" onClick={() => copy("command", command)}>{copied === "command" ? "Tersalin" : "Salin perintah"}</Button></Step>
          <Step number="3" title="Isi data API">Gunakan Base URL dan API key dari tab Kuota.</Step>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Setup 9Router</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Step number="1" title="Install">Jalankan <code className="font-mono font-bold">npm install -g 9router</code>.</Step>
          <Step number="2" title="Tambah provider">Pilih OpenAI Compatible. Base URL: <code className="break-all font-mono font-bold">{data.baseUrl}</code>.</Step>
          <Step number="3" title="Tambah key">Masukkan API key dari tab Kuota, lalu import model dari <code className="font-mono font-bold">/models</code>.</Step>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotaShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-base-bg p-4 sm:p-8">
      <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full text-base-ink/[0.045]"><defs><pattern id="quota-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs><rect width="100%" height="100%" fill="url(#quota-grid)" /></svg>
      <motion.svg animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }} viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -right-28 -top-28 h-80 w-80 text-accent-sky/35"><path d="M100 8 120 72 188 72 133 112 154 178 100 138 46 178 67 112 12 72 80 72Z" fill="currentColor" /></motion.svg>
      <motion.svg animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} viewBox="0 0 160 160" aria-hidden className="pointer-events-none fixed -bottom-20 -left-20 h-64 w-64 text-accent-sun/40"><rect x="30" y="30" width="100" height="100" rx="18" fill="currentColor" stroke="currentColor" strokeWidth="4" /></motion.svg>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={cn("relative mx-auto w-full", wide ? "max-w-5xl" : "max-w-lg")}>{children}</motion.div>
    </main>
  );
}

function Header({ brandName, name, status }: { brandName: string; name: string; status: string }) {
  return <header className="relative mb-5 overflow-hidden rounded-neo border-2 border-base-ink bg-accent-lavender p-5 shadow-neo sm:p-6"><svg viewBox="0 0 200 100" aria-hidden className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-white/25"><path d="M35 5 75 95 115 5 155 95 195 5" fill="none" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" /></svg><div className="relative"><p className="text-xs font-extrabold uppercase tracking-[0.22em]">{brandName} · Dashboard</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{name}</h1><span className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-white px-3 py-1 text-xs font-extrabold capitalize"><motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className={cn("h-2 w-2 rounded-full", status === "active" ? "bg-green-500" : "bg-red-400")} />{status}</span></div></header>;
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return <motion.div whileHover={{ y: -4, rotate: 0.5 }} className={cn("relative overflow-hidden rounded-neo border-2 border-base-ink p-4 shadow-neo-sm", color)}><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 text-base-ink/10"><circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="10" /></svg><p className="relative text-[10px] font-extrabold uppercase tracking-widest text-base-ink/50">{label}</p><p className="relative mt-1 text-2xl font-black">{value}</p></motion.div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-2 rounded-neo border-2 border-base-ink bg-base-bg px-3 py-2"><span className="text-[10px] font-extrabold uppercase text-base-ink/50">{label}</span><span className="break-all text-right font-mono text-sm font-bold">{value}</span></div>;
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{children}</p>;
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div className="flex gap-3 rounded-neo border-2 border-base-ink bg-white p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky font-extrabold">{number}</span><div className="min-w-0"><p className="font-extrabold">{title}</p><div className="mt-1 text-sm font-semibold text-base-ink/60">{children}</div></div></div>;
}
