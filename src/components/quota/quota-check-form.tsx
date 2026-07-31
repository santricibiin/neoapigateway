"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Gauge, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Result =
  | { ok: false; error: string }
  | { ok: true; name: string; status: string; keyMasked: string; maxTokens: number; usedTokens: number; remainingTokens: number; expiresAt: string | null; validDays: number | null; baseUrl: string; tag: string | null };

function format(value: number) {
  return value.toLocaleString("id-ID");
}

export function QuotaCheckForm() {
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/quota/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, error: "Gagal terhubung ke server" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
    <Card className="relative overflow-hidden">
      <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-accent-sky/25"><circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
      <CardHeader><CardTitle className="relative flex items-center gap-2"><Gauge className="h-5 w-5" /> Cek Kuota</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input type={show ? "text" : "password"} autoComplete="off" placeholder="sk-..." value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="font-mono" minLength={12} required />
            <button type="button" onClick={() => setShow((value) => !value)} className="rounded-neo border-2 border-base-ink bg-base-bg px-3 shadow-neo-sm">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <Button type="submit" className="w-full" disabled={loading || apiKey.trim().length < 12}>{loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="h-4 w-4 rounded-full border-2 border-white border-t-transparent" /> : <Search className="h-4 w-4" />}{loading ? "Mengecek..." : "Cek kuota"}</Button>
        </form>
        {result && !result.ok ? <p className="mt-4 rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{result.error}</p> : null}
        {result && result.ok ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 space-y-2 border-t-2 border-base-ink pt-4">
            <div className="mb-3 flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-2 font-extrabold shadow-neo-sm"><CheckCircle2 className="h-5 w-5" /> Data ditemukan</div>
            <Row label="Nama" value={result.name} />
            <Row label="Status" value={result.status} />
            <Row label="Key" value={result.keyMasked} mono />
            <Row label="Kuota max" value={format(result.maxTokens)} />
            <Row label="Terpakai" value={format(result.usedTokens)} />
            <Row label="Sisa" value={format(result.remainingTokens)} accent />
            <Row label="Valid days" value={result.validDays == null ? "-" : String(result.validDays)} />
            <Row label="Berakhir" value={result.expiresAt ? new Date(result.expiresAt).toLocaleString("id-ID") : "-"} />
            {result.tag ? <Row label="Tag" value={result.tag} /> : null}
            <Row label="Base URL" value={result.baseUrl} mono />
          </motion.div>
        ) : null}
      </CardContent>
    </Card>
    </motion.div>
  );
}

function Row({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`flex items-start justify-between gap-3 rounded-neo border-2 border-base-ink px-3 py-2 ${accent ? "bg-accent-sky shadow-neo-sm" : "bg-base-bg"}`}><span className="text-[10px] font-extrabold uppercase text-base-ink/50">{label}</span><span className={`break-all text-right text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</span></motion.div>;
}
