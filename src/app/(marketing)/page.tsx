"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, BadgeDollarSign, Cpu, ShieldCheck, Sparkles, ArrowRight, Terminal, Copy, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy";
import { ModelShowcase } from "@/components/landing/model-showcase";
import { useBrand } from "@/lib/use-brand";
import { useT } from "@/lib/lang";

const API_BASE = process.env.NEXT_PUBLIC_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const features = [
  {
    title: "Akses Cepat",
    description:
      "Token API AI aktif instan setelah pembayaran. Langsung pakai tanpa menunggu.",
    accent: "bg-accent-sky",
    icon: Zap,
  },
  {
    title: "Harga Terjangkau",
    description:
      "Mulai dari paket kecil hingga enterprise. Pilih sesuai kebutuhan proyekmu.",
    accent: "bg-accent-sun",
    icon: BadgeDollarSign,
  },
  {
    title: "Multi Model AI",
    description:
      "Dukungan berbagai model AI populer dalam satu token. Fleksibel untuk semua use case.",
    accent: "bg-accent-mint",
    icon: Cpu,
  },
  {
    title: "Aman & Stabil",
    description:
      "Infrastruktur andal dengan uptime tinggi. Data dan transaksi terjaga aman.",
    accent: "bg-accent-lavender",
    icon: ShieldCheck,
  },
];

const codeExamples = [
  {
    label: "cURL",
    lang: "bash",
    code: `curl -X POST ${API_BASE}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-xxxYOUR_TOKENxxx" \\
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "user", "content": "Halo, apa kabar?"}
    ]
  }'`,
  },
  {
    label: "Python",
    lang: "python",
    code: `from openai import OpenAI

client = OpenAI(
    base_url="${API_BASE}/v1",
    api_key="sk-xxxYOUR_TOKENxxx"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "Halo!"}]
)
print(response.choices[0].message.content)`,
  },
  {
    label: "Node.js",
    lang: "javascript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${API_BASE}/v1",
  apiKey: "sk-xxxYOUR_TOKENxxx"
});

const res = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Halo!" }]
});
console.log(res.choices[0].message.content);`,
  },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "10K+", label: "Token Terjual" },
  { value: "Realtime", label: "Model AI" },
  { value: "24/7", label: "Dukungan" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const brand = useBrand();
  const t = useT();
  const siteName = brand?.siteName ?? "Neo API Gateway";

  async function handleCopy() {
    await copyText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative flex flex-col gap-16 overflow-hidden">
      {/* Decorative SVGs */}
      <svg className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 text-base-ink/[0.03]" viewBox="0 0 200 200" fill="currentColor" aria-hidden>
        <circle cx="100" cy="100" r="80" />
      </svg>
      <svg className="pointer-events-none absolute top-40 -left-24 h-64 w-64 text-accent-sky/20" viewBox="0 0 200 200" fill="currentColor" aria-hidden>
        <rect x="40" y="40" width="120" height="120" transform="rotate(15 100 100)" />
      </svg>
      <svg className="pointer-events-none absolute top-96 right-10 h-48 w-48 text-accent-sun/20" viewBox="0 0 200 200" fill="currentColor" aria-hidden>
        <polygon points="100,20 180,180 20,180" />
      </svg>

      {/* Hero */}
      <section className="relative flex flex-col items-center gap-8 pt-10 text-center lg:flex-row lg:justify-center lg:gap-12 lg:text-left">
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-base-ink/[0.04]" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative flex max-w-2xl flex-col items-center gap-6 lg:items-start">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-neo border-2 border-base-ink bg-accent-sun px-4 py-1.5 text-sm font-bold shadow-neo-sm"
          >
            <Sparkles className="mr-1.5 inline-block h-4 w-4" />
            {t("API Gateway · Multi Model · OpenAI Compatible")}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"
          >
            {t("Satu Token. Semua Model AI.")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-xl text-lg text-base-ink/70"
          >
            {siteName} {t("menghubungkan proyekmu ke berbagai model AI populer lewat satu endpoint yang kompatibel dengan OpenAI API.")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/products">
              <Button variant="primary" size="lg">
                {t("Order Token")}
              </Button>
            </Link>
            <Link href="/track">
              <Button variant="outline" size="lg">
                <Search className="h-5 w-5" />
                {t("Cek Pesanan")}
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Terminal mock — endpoint /v1/chat/completions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-ink shadow-neo"
          >
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="ml-2 font-mono text-[10px] font-bold text-white/40">sh — api</span>
            </div>
            <div className="space-y-1.5 p-4 font-mono text-[11px] leading-relaxed sm:text-xs">
              <p className="text-white/40">$ curl -X POST \</p>
              <p className="break-all text-accent-sky">{API_BASE}/v1/chat/completions \</p>
              <p className="break-all text-white/60">-H &quot;Authorization: Bearer sk-•••&quot; \</p>
              <p className="break-all text-white/60">-d &quot;{'{'}&quot;model&quot;: &quot;claude-opus-5&quot;{'}'}&quot;</p>
              <p className="text-accent-mint">200 OK · 1.2s</p>
              <p className="flex items-center gap-1.5 text-white/40">
                $ <span className="inline-block h-3.5 w-2 animate-pulse bg-accent-mint/70" />
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Model AI Showcase */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <ModelShowcase />
      </motion.section>

      {/* Features */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div key={feature.title} variants={item} className="h-full">
              <div className="flex h-full flex-col rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo-sm transition-shadow hover:shadow-neo">
                <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center border-2 border-base-ink ${feature.accent}`}>
                  <Icon className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
                </span>
                <h3 className="text-lg font-extrabold">{t(feature.title)}</h3>
                <p className="mt-1 text-sm text-base-ink/60">{t(feature.description)}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.section>

      {/* How to Connect — Code Examples */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-1 text-xs font-bold shadow-neo-sm">
            <Terminal className="h-3.5 w-3.5" />
            Quick Start
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t("Cara Menyambungkan")}</h2>
          <p className="mt-2 text-base-ink/60">
            {t("Kompatibel dengan OpenAI SDK. Ganti")} <code className="rounded bg-base-ink/10 px-1 font-mono text-xs">base_url</code> & <code className="rounded bg-base-ink/10 px-1 font-mono text-xs">api_key</code>{t("saja.")}
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-neo border-2 border-base-ink bg-base-ink shadow-neo">
          {/* Tabs */}
          <div className="flex items-stretch overflow-x-auto border-b-2 border-base-ink/30">
            <div className="flex shrink-0">
              {codeExamples.map((ex, i) => (
                <button
                  key={ex.label}
                  onClick={() => setActiveTab(i)}
                  className={`whitespace-nowrap px-3 py-2.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
                    activeTab === i
                      ? "bg-base-surface text-base-ink"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => void handleCopy()}
              className="ml-auto flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white/70 transition-colors hover:text-white sm:px-4"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden xs:inline sm:inline">{copied ? t("Tersalin") : t("Salin")}</span>
            </button>
          </div>
          {/* Code */}
          <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed sm:p-4 sm:text-sm">
            <code className="font-mono text-accent-mint">{codeExamples[activeTab].code}</code>
          </pre>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-neo border-2 border-base-ink bg-base-surface p-5 text-center shadow-neo-sm"
          >
            <div className="text-2xl font-extrabold sm:text-3xl">{stat.value}</div>
            <div className="mt-1 text-sm font-semibold text-base-ink/60">{t(stat.label)}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* CTA — ramping, sejajar horizontal */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center justify-between gap-4 rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo-sm sm:flex-row sm:gap-6"
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun">
            <Zap className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold sm:text-xl">{t("Siap mulai?")}</h2>
            <p className="mt-0.5 text-sm text-base-ink/60">
              {t("Beli token, dapat API key, langsung integrasi.")}
            </p>
          </div>
        </div>
        <Link href="/products" className="w-full shrink-0 sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            {t("Order Sekarang")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.section>
    </div>
  );
}
