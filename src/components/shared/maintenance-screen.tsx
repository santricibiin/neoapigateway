"use client";

import { motion } from "framer-motion";
import { Wrench, Clock, Home } from "lucide-react";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { Button } from "@/components/ui/button";

const DEFAULT_TEXT =
  "Kami sedang melakukan pemeliharaan sistem untuk meningkatkan layanan.\nOrder sementara ditutup dan akan segera dibuka kembali.";

export function MaintenanceScreen({ brand, text }: { brand: string; text?: string | null }) {
  const info = (text && text.trim()) || DEFAULT_TEXT;

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <FloatingShapes />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-neo border-2 border-base-line bg-accent-sunSoft shadow-neo"
      >
        <motion.span
          animate={{ rotate: [0, 18, -12, 18, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
          className="block"
        >
          <Wrench className="h-11 w-11" strokeWidth={2.5} />
        </motion.span>
      </motion.div>

      <motion.span
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative mt-6 inline-flex items-center gap-2 rounded-full border-2 border-base-line bg-accent-terraSoft px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-accent-terraDeep shadow-neo-sm"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-terra opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-terra" />
        </span>
        Sedang Maintenance
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative mt-4 text-3xl font-black tracking-tight sm:text-4xl"
      >
        {brand} istirahat sejenak.
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative mt-4 w-full rounded-neo border-2 border-base-line bg-base-surface p-5 text-left shadow-neo sm:p-6"
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-ink/50">
          <Clock className="h-4 w-4" /> Informasi
        </div>
        {info.split("\n").map((line, i) => (
          <p key={i} className={`text-sm leading-relaxed sm:text-base ${i === 0 ? "font-bold" : "font-semibold text-base-ink/70"}`}>
            {line}
          </p>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="relative mt-6"
      >
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          <Home className="h-4 w-4" /> Kembali ke Beranda
        </Button>
      </motion.div>
    </div>
  );
}
