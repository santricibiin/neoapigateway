"use client";

import { motion } from "framer-motion";

export function QuotaCheckHero({ brandName }: { brandName: string }) {
  return (
    <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-lavender p-6 shadow-neo">
      <motion.svg animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-9 -top-9 h-32 w-32 text-white/35"><path d="M50 4 61 36 95 37 68 57 77 91 50 71 23 91 32 57 5 37 39 36Z" fill="currentColor" /></motion.svg>
      <motion.svg animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-8 right-24 h-20 w-20 text-accent-sun/70"><circle cx="50" cy="50" r="38" fill="currentColor" stroke="currentColor" strokeWidth="4" /></motion.svg>
      <div className="relative">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em]">{brandName}</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">Cek kuota</h1>
        <p className="mt-2 max-w-sm text-sm font-semibold">Pantau sisa token, pemakaian, dan masa aktif hanya dengan API key member.</p>
      </div>
    </motion.header>
  );
}
