"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown } from "lucide-react";
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
        whileHover={{ y: -2 }}
        whileTap={{ y: 2 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-base-bg px-3 py-2 shadow-neo-sm"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-mint">
          <User className="h-4 w-4 text-base-ink" strokeWidth={2.5} />
        </span>
        <span className="hidden text-sm font-bold sm:inline">Admin</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-neo border-2 border-base-ink bg-base-surface p-2 shadow-neo-lg"
          >
            <div className="mb-2 rounded-neo border-2 border-base-ink bg-accent-lavender px-3 py-2">
              <div className="text-sm font-bold">Super Admin</div>
              <div className="text-xs text-base-ink/70">ID: {adminId}</div>
            </div>
            <form action={logoutAdmin}>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 2 }}
                type="submit"
                className="flex w-full items-center gap-3 rounded-neo border-2 border-base-ink bg-red-100 px-3 py-2.5 text-sm font-semibold text-red-700 shadow-neo-sm transition-colors hover:bg-red-200"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                Keluar
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
