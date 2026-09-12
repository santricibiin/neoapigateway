"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, LayoutDashboard, Newspaper, Sparkles, Boxes, Settings, Code, ChevronLeft, PanelLeftClose, PanelLeftOpen, TrendingUp } from "lucide-react";
import { logoutResWeb } from "@/app/actions/resweb-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: typeof Wallet };

const navSections: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [{ href: "/res", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operasional",
    items: [
      { href: "/res/topup", label: "Topup", icon: Wallet },
      { href: "/res/models", label: "Model", icon: Boxes },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { href: "/res/news", label: "Berita", icon: Newspaper },
      { href: "/res/api-docs", label: "API Docs", icon: Code },
      { href: "/res/settings", label: "Setting", icon: Settings },
    ],
  },
];

const COLLAPSED_KEY = "neo-resweb-sidebar-collapsed";

export function ReswebShell({
  reseller,
  children,
}: {
  reseller: { id: number; name: string; email: string; balance: number; active: boolean } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-base-bg">
      {/* Dekorasi latar */}
      <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -left-24 top-24 h-80 w-80 text-accent-sky/[0.08]"><circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="24" /></svg>
      <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -bottom-20 -right-20 h-72 w-72 text-accent-sand/15"><path d="M100 18 183 172H17Z" fill="currentColor" /></svg>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-base-line bg-base-surface/95 shadow-neo-sm backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggle}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface text-base-ink/60 shadow-neo-sm transition-colors hover:text-base-ink lg:inline-flex"
              aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
              title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={2.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={2.5} />}
            </motion.button>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-terra shadow-neo-sm">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{reseller?.name ?? "Reseller"}</p>
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-base-ink/50">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${reseller?.active ? "bg-accent-sageDeep" : "bg-accent-terraDeep"}`} />
                Reseller Web{reseller?.active ? "" : " (nonaktif)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-neo border border-base-line bg-accent-sageSoft px-3 py-1.5 sm:flex">
              <TrendingUp className="h-4 w-4 text-accent-sageDeep" strokeWidth={2.5} />
              <div className="text-right">
                <p className="text-[9px] font-black uppercase text-base-ink/50">Saldo Token</p>
                <p className="font-mono text-sm font-black tabular-nums">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-neo border border-base-line bg-base-bg px-2.5 py-1.5 sm:hidden">
              <Wallet className="h-4 w-4 text-accent-sageDeep" strokeWidth={2.5} />
              <p className="font-mono text-sm font-black tabular-nums">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</p>
            </div>
            <form action={() => logoutResWeb()}>
              <Button type="submit" size="sm" variant="outline">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Sidebar desktop */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-3 left-3 top-20 z-40 hidden flex-col overflow-hidden rounded-neo border border-base-line bg-base-ink shadow-neo-lg lg:flex"
      >
        <div className={cn("flex items-center border-b border-white/10 px-4 pb-3 pt-4", collapsed ? "justify-center" : "gap-2.5")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo bg-accent-terra">
            <Wallet className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <AnimatePresence>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <p className="truncate text-sm font-extrabold text-white">Reseller Center</p>
                <p className="truncate text-[9px] font-bold uppercase tracking-widest text-white/40">{reseller?.email}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 [scrollbar-width:thin]">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              <AnimatePresence>
                {!collapsed && section.title ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/35"
                  >
                    {section.title}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center rounded-neo font-semibold transition-colors duration-150",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2 text-sm",
                          active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="resweb-active-menu"
                            className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-accent-terra"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? "text-accent-terra" : "text-white/50 group-hover:text-white/80"
                          )}
                          strokeWidth={2.5}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex items-center gap-2.5 border-t border-white/10 px-3.5 py-3 text-xs font-bold text-white/50 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center"
          )}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </motion.span>
          {!collapsed && <span>Sembunyikan menu</span>}
        </button>
      </motion.aside>

      <main
        className={`relative p-4 pb-24 transition-[margin] duration-300 ease-out sm:p-5 sm:pb-24 lg:p-6 lg:pb-6 ${
          collapsed ? "lg:ml-[88px]" : "lg:ml-[276px]"
        }`}
      >
        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-6 gap-1 border-t border-base-line bg-base-surface px-2 py-1.5 lg:hidden">
        {navSections.flatMap((s) => s.items).map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 rounded-neo py-1 text-[10px] font-bold", active ? "text-base-ink" : "text-base-ink/45")}>
              <motion.span whileTap={{ scale: 0.9 }} className={cn("flex h-8 w-8 items-center justify-center rounded-neo border border-base-ink", active ? "bg-accent-terra text-white shadow-neo-sm" : "bg-transparent")}>
                <item.icon className="h-4 w-4" strokeWidth={2.5} />
              </motion.span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
