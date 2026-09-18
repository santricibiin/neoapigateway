"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, WalletCards, LayoutDashboard, Newspaper, Sparkles, Boxes, Settings, Code2, PanelLeftClose, PanelLeftOpen, TrendingUp } from "lucide-react";
import { logoutResWeb } from "@/app/actions/resweb-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/resweb/res-lang";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useT } from "@/lib/lang";

type NavItem = { href: string; label: string; icon: typeof WalletCards };

const navSections: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [{ href: "/res", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operasional",
    items: [
      { href: "/res/topup", label: "Topup", icon: WalletCards },
      { href: "/res/models", label: "Model", icon: Boxes },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { href: "/res/news", label: "Berita", icon: Newspaper },
      { href: "/res/api-docs", label: "API Docs", icon: Code2 },
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
  const t = useT();
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
      <header className="sticky top-0 z-50 border-b border-base-line bg-base-surface/90 shadow-neo-sm backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
              <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={toggle}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface text-base-ink/55 shadow-neo-sm transition-colors hover:border-stone-400 hover:text-base-ink lg:inline-flex"
              aria-label={collapsed ? t("Buka sidebar") : t("Tutup sidebar")}
              title={collapsed ? t("Buka sidebar") : t("Tutup sidebar")}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={2.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={2.5} />}
            </motion.button>
            {/* Brand dalam kotak menyatu */}
            <div className="flex min-w-0 items-center gap-2.5 rounded-neo border border-base-line bg-base-bg px-3 py-1.5 shadow-neo-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] shadow-neo-sm">
                <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight">{reseller?.name ?? "Reseller"}</p>
                <p className="flex items-center gap-1 text-[10px] font-bold leading-tight text-base-ink/50">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${reseller?.active ? "bg-accent-sageDeep" : "bg-accent-terraDeep"}`} />
                  Reseller Web{reseller?.active ? "" : ` ${t("(nonaktif)")}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitch />
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 rounded-neo border border-base-line bg-base-bg px-3 py-1.5 shadow-neo-sm sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-neo bg-accent-sageSoft">
                <TrendingUp className="h-4 w-4 text-accent-sageDeep" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-base-ink/45">Saldo Token</p>
                <p className="font-mono text-sm font-black leading-tight tabular-nums">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-neo border border-base-line bg-base-bg px-2.5 py-1.5 shadow-neo-sm sm:hidden">
              <WalletCards className="h-4 w-4 text-accent-sageDeep" strokeWidth={2.5} />
              <p className="font-mono text-sm font-black tabular-nums">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</p></div>
            <form action={() => logoutResWeb()}>
              <Button type="submit" size="sm" variant="outline">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Keluar")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Sidebar desktop */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-3 left-3 top-20 z-40 hidden flex-col overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-lg lg:flex"
      >
        <div className={cn("flex items-center border-b border-base-line px-4 pb-3 pt-4", collapsed ? "justify-center" : "gap-2.5")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] shadow-neo-sm">
            <WalletCards className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
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
                <p className="truncate text-sm font-extrabold">Reseller Center</p>
                <p className="truncate text-[9px] font-bold uppercase tracking-widest text-base-ink/45">{reseller?.email}</p>
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
                    className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-base-ink/35"
                  >
                    {t(section.title)}
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
                        title={collapsed ? t(item.label) : undefined}
                        className={cn(
                          "group relative flex items-center rounded-neo font-semibold transition-colors duration-150",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2 text-sm",
                          active ? "bg-accent-sageSoft text-base-ink" : "text-base-ink/55 hover:bg-accent-sky/30 hover:text-base-ink"
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
                            "h-4.5 w-4.5 shrink-0 transition-colors",
                            active ? "text-accent-terra" : "text-base-ink/40 group-hover:text-base-ink/70"
                          )}
                          strokeWidth={3}
                        />
                        {!collapsed && <span className="truncate">{t(item.label)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-base-line p-2.5">
          <form action={() => logoutResWeb()}>
            <button
              type="submit"
              className={cn(
                "flex w-full items-center rounded-neo font-semibold text-base-ink/50 transition-colors hover:bg-accent-terraSoft hover:text-accent-terraDeep",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2 text-sm"
              )}
              title={collapsed ? t("Keluar") : undefined}
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" strokeWidth={2.75} />
              {!collapsed && <span className="truncate">{t("Keluar")}</span>}
            </button>
          </form>
        </div>
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
                <item.icon className="h-4.5 w-4.5" strokeWidth={3} />
              </motion.span>
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
