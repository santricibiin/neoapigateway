"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { useT } from "@/lib/lang";
import { Clock, Headphones, MessageCircle, Send, ShieldCheck, Zap } from "lucide-react";

interface Cs {
  telegram: string | null;
  whatsapp: string | null;
}

export function ContactClient({ cs, siteName }: { cs: Cs; siteName: string | null }) {
  const t = useT();

  const channels = [
    {
      key: "telegram",
      icon: Send,
      titleId: "Telegram",
      handle: cs.telegram ? `@${cs.telegram}` : null,
      href: cs.telegram ? `https://t.me/${cs.telegram}` : null,
      descId: "Respon cepat untuk pertanyaan produk & pembelian.",
      accent: "bg-accent-skySoft",
    },
    {
      key: "whatsapp",
      icon: MessageCircle,
      titleId: "WhatsApp",
      handle: cs.whatsapp ? `+${cs.whatsapp}` : null,
      href: cs.whatsapp ? `https://wa.me/${cs.whatsapp}` : null,
      descId: "Chat langsung untuk bantuan pesanan & kendala teknis.",
      accent: "bg-accent-sageSoft",
    },
  ];

  const faqs = [
    {
      q: "Berapa lama produk dikirim setelah pembayaran?",
      a: "Produk terkirim otomatis dalam hitungan detik setelah pembayaran terdeteksi — 24 jam.",
    },
    {
      q: "Pembayaran apa saja yang diterima?",
      a: "QRIS — bisa dibayar dari semua e-wallet dan m-banking (DANA, GoPay, OVO, BCA, dll).",
    },
    {
      q: "Bagaimana cara cek status pesanan?",
      a: "Buka halaman Cek Pesanan dan masukkan nomor invoice Anda.",
    },
  ];

  return (
    <div className="relative flex min-h-[70vh] flex-col gap-10 overflow-x-hidden py-6 sm:py-10">
      <FloatingShapes />

      {/* Hero */}
      <section className="relative flex flex-col items-center gap-3 pt-4 text-center sm:pt-8">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-neo border border-base-line bg-accent-sun shadow-neo-sm px-4 py-1.5 text-sm font-bold"
        >
          <Headphones className="mr-1.5 inline-block h-4 w-4" />
          {t("Kontak")}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
        >
          {t("Hubungi Kami")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-sm text-base-ink/70 sm:text-base"
        >
          {t("Ada pertanyaan sebelum membeli, atau butuh bantuan dengan pesanan Anda? Tim kami siap membantu.")}
        </motion.p>
      </section>

      {/* Kanal CS */}
      <section className="relative mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-2">
        {channels.map((ch, i) => {
          const Icon = ch.icon;
          return (
            <motion.div
              key={ch.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
              whileHover={{ y: -3 }}
              className="flex flex-col rounded-neo border border-base-line bg-base-surface p-6 shadow-neo-sm transition-shadow hover:shadow-neo"
            >
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-neo border border-base-line ${ch.accent}`}>
                <Icon className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <h2 className="mt-4 text-xl font-extrabold">{ch.titleId}</h2>
              {ch.handle ? (
                <>
                  <p className="mt-1 font-mono text-sm font-bold text-base-ink/60">{ch.handle}</p>
                  <p className="mt-2 text-sm font-semibold text-base-ink/55">{t(ch.descId)}</p>
                  <div className="mt-4 flex-1" />
                  <a href={ch.href!} target="_blank" rel="noreferrer">
                    <Button variant="primary" size="md" className="w-full">
                      <Icon className="h-4 w-4" />
                      {t("Chat Sekarang")}
                    </Button>
                  </a>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-base-ink/45">{t("Belum tersedia.")}</p>
                  <div className="mt-4 flex-1" />
                  <Button variant="outline" size="md" className="w-full" disabled>
                    {t("Belum tersedia.")}
                  </Button>
                </>
              )}
            </motion.div>
          );
        })}
      </section>

      {/* Jam operasional + jaminan */}
      <section className="relative mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {[
          { icon: Clock, titleId: "Jam Operasional", descId: "Setiap hari, 08.00 - 22.00 WIB" },
          { icon: Zap, titleId: "Respon Cepat", descId: "Balasan rata-rata di bawah 15 menit" },
          { icon: ShieldCheck, titleId: "Aman", descId: "Transaksi terpantau otomatis 24 jam" },
        ].map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.titleId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.08 }}
              className="flex flex-col items-center gap-2 rounded-neo border border-base-line bg-base-surface p-5 text-center shadow-neo-sm"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-sandSoft">
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <p className="text-sm font-extrabold">{t(f.titleId)}</p>
              <p className="text-xs font-semibold text-base-ink/55">{t(f.descId)}</p>
            </motion.div>
          );
        })}
      </section>

      {/* FAQ ringkas */}
      <section className="relative mx-auto w-full max-w-4xl">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t("Pertanyaan Umum")}</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.55 + i * 0.08 }}
              className="rounded-neo border border-base-line bg-base-surface p-4 shadow-neo-sm"
            >
              <p className="font-extrabold">{t(f.q)}</p>
              <p className="mt-1 text-sm font-semibold text-base-ink/60">{t(f.a)}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-base-ink/55">
          {t("Masih ada pertanyaan? Jangan ragu menghubungi kami di atas.")}{" "}
          <Link href="/products" className="font-extrabold text-accent-terraDeep hover:underline">
            {t("atau lihat produknya dulu")}
          </Link>
        </p>
      </section>
    </div>
  );
}
