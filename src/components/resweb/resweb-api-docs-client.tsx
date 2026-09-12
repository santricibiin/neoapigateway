"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, KeyRound, Code, Terminal, ShieldCheck, Zap, PlusCircle, Boxes, Wallet, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  title: string;
  icon: typeof Wallet;
  color: string;
  description: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  bodyExample?: string;
  responseExample: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/reseller/balance",
    title: "Cek Saldo",
    icon: Wallet,
    color: "bg-accent-mint",
    description: "Mendapatkan informasi saldo reseller beserta nama dan email terdaftar.",
    responseExample: `{
  "ok": true,
  "name": "Nama Reseller",
  "email": "reseller@example.com",
  "balance": 10000000
}`,
  },
  {
    method: "GET",
    path: "/api/reseller/models",
    title: "Daftar Model",
    icon: Boxes,
    color: "bg-accent-sky",
    description: "Mendapatkan daftar model AI yang tersedia secara realtime dari upstream, lengkap dengan status aktif/nonaktif.",
    responseExample: `{
  "ok": true,
  "total": 35,
  "active": 15,
  "models": [
    {
      "id": "gpt-4o-mini",
      "enabled": true,
      "vision": false,
      "grade": "B",
      "input": ["text"],
      "output": ["text"]
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/reseller/members",
    title: "Buat Token Member",
    icon: PlusCircle,
    color: "bg-accent-sun",
    description: "Membuat token member baru. Saldo reseller akan berkurang sesuai paket yang dipilih.",
    params: [
      { name: "packageCode", type: "string", required: true, desc: "Kode paket: 1M, 5M, 10M, 20M, 50M, 100M, 200M, 500M, 1B, 2B, 3B, 4B, 5B, 10B" },
    ],
    bodyExample: `{
  "packageCode": "1M"
}`,
    responseExample: `{
  "ok": true,
  "member": {
    "id": 42,
    "secretToken": "a1b2c3d4...",
    "apiKey": "sk-xxxxx",
    "name": "Member Name",
    "keyMasked": "sk-xxx•••xxx",
    "dashboardUrl": "https://.../quota/member/a1b2c3d4",
    "pin": "111111"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/reseller/members/{id}/quota",
    title: "Tambah Kuota Member",
    icon: Zap,
    color: "bg-accent-lavender",
    description: "Menambah kuota token untuk member tertentu milik reseller. Hanya bisa akses member milik reseller sendiri.",
    params: [
      { name: "id", type: "number", required: true, desc: "ID member (dari parameter URL, bukan body)" },
      { name: "packageCode", type: "string", required: true, desc: "Kode paket: 1M, 5M, 10M, 20M, 50M, 100M, 200M, 500M, 1B, 2B, 3B, 4B, 5B, 10B" },
    ],
    bodyExample: `{
  "packageCode": "5M"
}`,
    responseExample: `{
  "ok": true,
  "tokens": 5000000,
  "validDays": 7,
  "balance": 5000000
}`,
  },
];

const PACKAGE_TABLE = [
  { code: "1M", tokens: "1.000.000", days: 7 },
  { code: "5M", tokens: "5.000.000", days: 7 },
  { code: "10M", tokens: "10.000.000", days: 7 },
  { code: "20M", tokens: "20.000.000", days: 7 },
  { code: "50M", tokens: "50.000.000", days: 14 },
  { code: "100M", tokens: "100.000.000", days: 14 },
  { code: "200M", tokens: "200.000.000", days: 21 },
  { code: "500M", tokens: "500.000.000", days: 28 },
  { code: "1B", tokens: "1.000.000.000", days: 28 },
  { code: "2B", tokens: "2.000.000.000", days: 28 },
  { code: "3B", tokens: "3.000.000.000", days: 28 },
  { code: "4B", tokens: "4.000.000.000", days: 28 },
  { code: "5B", tokens: "5.000.000.000", days: 28 },
  { code: "10B", tokens: "10.000.000.000", days: 28 },
];

export function ReswebApiDocsClient({ reseller, baseUrl }: { reseller: { name: string; email: string; apiKey: string | null } | null; baseUrl: string }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, value: string) {
    try {
      navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border border-base-line bg-accent-sky p-5 shadow-neo sm:p-7">
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-base-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Code className="h-3 w-3" /> API Reference</span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Dokumentasi API</h1>
          <p className="mt-1 text-sm font-bold text-base-ink/60">Integrasikan reseller Anda dengan REST API</p>
        </div>
      </motion.section>

      <section className="rounded-neo border border-base-line bg-white p-5 shadow-neo-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-base-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-sun shadow-neo-sm"><KeyRound className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black">Autentikasi</h2>
            <p className="text-xs font-bold text-base-ink/50">API key reseller Anda</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reseller?.apiKey ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-ink">API Key</label>
              <div className="flex gap-2">
                <code className="h-[42px] flex-1 overflow-x-auto whitespace-nowrap rounded-neo border border-base-line bg-base-bg px-4 py-2.5 font-mono text-sm font-bold shadow-neo-sm">
                  {showKey ? reseller.apiKey : "res_" + "•".repeat(20) + reseller.apiKey.slice(-6)}
                </code>
                <button onClick={() => setShowKey((s) => !s)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface shadow-neo-sm transition-shadow hover:shadow-neo" title={showKey ? "Sembunyikan" : "Tampilkan"}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => copy("key", reseller.apiKey!)} className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-mint shadow-neo-sm transition-shadow hover:shadow-neo" title="Salin">
                  {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">
              API key belum diatur. Silakan atur di halaman Setting.
            </div>
          )}

          <div className="rounded-neo border border-base-line bg-base-bg p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-base-ink/45">Cara Penggunaan</p>
            <p className="text-sm font-bold">Semua request harus menyertakan API key pada salah satu header berikut:</p>
            <div className="mt-2 space-y-2">
              <div className="rounded-neo border border-base-line bg-base-surface p-2">
                <p className="text-[10px] font-black uppercase text-base-ink/45">Opsi 1 — Bearer Token</p>
                <code className="block font-mono text-xs font-bold">Authorization: Bearer &lt;api_key&gt;</code>
              </div>
              <div className="rounded-neo border border-base-line bg-base-surface p-2">
                <p className="text-[10px] font-black uppercase text-base-ink/45">Opsi 2 — X-API-Key Header</p>
                <code className="block font-mono text-xs font-bold">X-API-Key: &lt;api_key&gt;</code>
              </div>
            </div>
          </div>

          <div className="rounded-neo border border-base-line bg-base-bg p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-base-ink/45">Base URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-neo border border-base-line bg-base-surface px-3 py-2 font-mono text-xs font-bold">{baseUrl}</code>
              <button onClick={() => copy("base", baseUrl)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface shadow-neo-sm" title="Salin">
                {copied === "base" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Endpoint</h2>
        {ENDPOINTS.map((ep, i) => (
          <motion.div
            key={ep.path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="overflow-hidden rounded-neo border border-base-line bg-white shadow-neo-sm"
          >
            <div className={cn("flex items-center gap-3 border-b border-base-line p-4", ep.color)}>
              <span className="flex h-9 w-9 items-center justify-center rounded-neo border border-base-line bg-white shadow-neo-sm"><ep.icon className="h-4 w-4" /></span>
              <div className="flex-1">
                <h3 className="font-black">{ep.title}</h3>
                <p className="text-xs font-bold text-base-ink/60">{ep.description}</p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex rounded-neo border border-base-line px-2.5 py-1 font-mono text-xs font-black", ep.method === "GET" ? "bg-accent-mint" : "bg-accent-sun")}>{ep.method}</span>
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-neo border border-base-line bg-base-bg px-3 py-1.5 font-mono text-xs font-bold">{baseUrl}{ep.path}</code>
                <button onClick={() => copy(`path-${i}`, `${baseUrl}${ep.path}`)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface shadow-neo-sm" title="Salin URL">
                  {copied === `path-${i}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {ep.params && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-base-ink/45">Parameter</p>
                  <div className="overflow-hidden rounded-neo border border-base-line">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-base-ink text-white">
                        <tr>
                          <th className="px-3 py-2 font-black">Nama</th>
                          <th className="px-3 py-2 font-black">Tipe</th>
                          <th className="px-3 py-2 font-black">Wajib</th>
                          <th className="px-3 py-2 font-black">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-line">
                        {ep.params.map((p) => (
                          <tr key={p.name} className="bg-base-bg">
                            <td className="px-3 py-2 font-mono font-bold">{p.name}</td>
                            <td className="px-3 py-2 font-bold text-base-ink/60">{p.type}</td>
                            <td className="px-3 py-2 font-bold">{p.required ? <span className="text-accent-terraDeep">Ya</span> : "Tidak"}</td>
                            <td className="px-3 py-2 text-base-ink/70">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ep.bodyExample && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-base-ink/45">Request Body</p>
                  <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 font-mono text-xs text-white"><code>{ep.bodyExample}</code></pre>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-base-ink/45">Response</p>
                <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 font-mono text-xs text-white"><code>{ep.responseExample}</code></pre>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="rounded-neo border border-base-line bg-white p-5 shadow-neo-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-base-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-mint shadow-neo-sm"><Terminal className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black">Contoh Request</h2>
            <p className="text-xs font-bold text-base-ink/50">curl command untuk testing</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 font-mono text-xs text-white"><code>{`curl ${baseUrl}/api/reseller/balance \\
  -H "Authorization: Bearer <API_KEY>"`}</code></pre>
          <pre className="overflow-x-auto rounded-neo border border-base-line bg-base-ink p-3 font-mono text-xs text-white"><code>{`curl -X POST ${baseUrl}/api/reseller/members \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"packageCode": "1M"}'`}</code></pre>
        </div>
      </section>

      <section className="rounded-neo border border-base-line bg-white p-5 shadow-neo-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-base-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-lavender shadow-neo-sm"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black">Kode Paket</h2>
            <p className="text-xs font-bold text-base-ink/50">Daftar kode paket yang tersedia</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-base-ink text-xs uppercase text-white">
              <tr>
                <th className="px-4 py-3 font-black">Kode</th>
                <th className="px-4 py-3 font-black">Token</th>
                <th className="px-4 py-3 font-black">Masa Berlaku</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-line">
              {PACKAGE_TABLE.map((p) => (
                <tr key={p.code} className="hover:bg-accent-sky/10">
                  <td className="px-4 py-2.5 font-mono font-black">{p.code}</td>
                  <td className="px-4 py-2.5 font-bold">{p.tokens}</td>
                  <td className="px-4 py-2.5 font-bold text-base-ink/60">{p.days} hari</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-neo border border-base-line bg-accent-terraSoft p-5 shadow-neo-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <h2 className="font-black">Catatan Keamanan</h2>
            <ul className="space-y-1 text-sm font-bold text-base-ink/70">
              <li>Jangan bagikan API key kepada pihak yang tidak berwenang.</li>
              <li>API key hanya bisa digunakan untuk akun reseller Anda sendiri.</li>
              <li>Permintaan ke endpoint member hanya bisa mengakses member milik reseller Anda.</li>
              <li>Saldo akan otomatis terpotong saat membuat token member atau menambah kuota.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
