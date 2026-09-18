"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { logoutAdmin } from "@/app/actions/auth";

export function DashboardProfileMenu({ adminId }: { adminId: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-neo border border-base-line bg-base-surface py-1.5 pl-1.5 pr-2.5 shadow-neo-sm transition-colors hover:border-stone-400"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] text-sm font-black text-white shadow-neo-sm">
          A
        </span>
        <span className="hidden text-sm font-bold sm:inline">Admin</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-base-ink/50" strokeWidth={2.5} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-lg"
          >
            {/* Kartu identitas */}
            <div className="relative overflow-hidden bg-[#1C1917] p-4">
              <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-white/10">
                <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="10" />
              </svg>
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] text-base font-black text-white">
                  A
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-white">Super Admin</p>
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                    <ShieldCheck className="h-3 w-3 text-accent-terra" strokeWidth={2.5} />
                    ID {adminId} · Akses penuh
                  </p>
                </div>
              </div>
            </div>
            <div className="p-2">
              <form action={logoutAdmin}>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-neo border border-base-line bg-base-surface px-3 py-2.5 text-sm font-bold text-accent-terraDeep shadow-neo-sm transition-colors hover:bg-accent-terraSoft"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.5} />
                  Keluar
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
