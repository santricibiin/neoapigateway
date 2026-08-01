"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, BadgeDollarSign, Cpu, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "10K+", label: "Token Terjual" },
  { value: "50+", label: "Model AI" },
  { value: "24/7", label: "Dukungan" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div className="relative flex flex-col gap-16 overflow-hidden">
      <svg
        className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 text-base-ink/[0.03]"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="100" cy="100" r="80" />
      </svg>
      <svg
        className="pointer-events-none absolute top-40 -left-24 h-64 w-64 text-accent-sky/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <rect x="40" y="40" width="120" height="120" transform="rotate(15 100 100)" />
      </svg>
      <svg
        className="pointer-events-none absolute top-96 right-10 h-48 w-48 text-accent-sun/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <polygon points="100,20 180,180 20,180" />
      </svg>

      <section className="relative flex flex-col items-center gap-6 pt-10 text-center">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-base-ink/[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern
              id="grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-neo border-2 border-base-ink bg-accent-sun px-4 py-1.5 text-sm font-bold shadow-neo-sm"
        >
          <Sparkles className="mr-1.5 inline-block h-4 w-4" />
          Token API AI · Cepat · Aman · Terjangkau
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"
        >
          Beli Token API AI untuk Proyekmu
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-lg text-base-ink/70"
        >
          Akses berbagai model AI dengan satu token. Aktif instan, harga bersahabat,
          dan infrastruktur stabil untuk semua kebutuhan.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/products">
            <Button variant="primary" size="lg">
              Order Produk
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" size="lg">
              Lihat Paket
            </Button>
          </Link>
        </motion.div>
      </section>

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
              <Card hover className="flex h-full flex-col">
                <CardHeader>
                  <span
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center border-2 border-base-ink ${feature.accent}`}
                  >
                    <Icon className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
                  </span>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-4">
                  <Button variant="sky" size="sm">
                    Selengkapnya
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.section>

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
            <div className="text-2xl font-extrabold sm:text-3xl">
              {stat.value}
            </div>
            <div className="mt-1 text-sm font-semibold text-base-ink/60">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-6 overflow-hidden rounded-neo border-2 border-base-ink bg-accent-lavender p-8 text-center shadow-neo sm:p-12"
      >
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 text-base-ink/10"
          viewBox="0 0 100 100"
          fill="currentColor"
          aria-hidden
        >
          <polygon points="50,5 95,95 5,95" />
        </motion.svg>
        <motion.svg
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 text-base-ink/10"
          viewBox="0 0 100 100"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="50" cy="50" r="45" />
        </motion.svg>
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm">
          <Zap className="h-7 w-7 text-base-ink" strokeWidth={2.5} />
        </span>
        <h2 className="relative text-2xl font-extrabold sm:text-3xl">
          Siap mulai pakai AI?
        </h2>
        <p className="relative max-w-md text-base-ink/80">
          Beli token API AI sekarang dan langsung integrasi ke proyekmu. Proses
          cepat, harga jelas, tanpa ribet.
        </p>
        <Link href="/products" className="relative">
          <Button variant="sun" size="lg">
            Order Sekarang
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </motion.section>
    </div>
  );
}
