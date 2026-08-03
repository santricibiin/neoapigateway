"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Wallet, LayoutDashboard, Newspaper, Sparkles, Boxes } from "lucide-react";
import { logoutResWeb } from "@/app/actions/resweb-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string; icon: typeof Wallet };

const nav: NavItem[] = [
  { href: "/res", label: "Dashboard", icon: LayoutDashboard },
  { href: "/res/topup", label: "Topup", icon: Wallet },
  { href: "/res/models", label: "Model", icon: Boxes },
  { href: "/res/news", label: "Berita", icon: Newspaper },
];

export function ReswebShell({
  reseller,
  children,
}: {
  reseller: { id: number; name: string; email: string; balance: number; active: boolean } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-base-bg">
      <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -left-24 top-24 h-80 w-80 text-accent-sky/10"><circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="24" /></svg>
      <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none fixed -bottom-20 -right-20 h-72 w-72 text-accent-sun/15"><path d="M100 18 183 172H17Z" fill="currentColor" /></svg>
      <header className="sticky top-0 z-40 border-b-2 border-base-ink bg-base-surface/95 shadow-neo-sm backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm"><Sparkles className="h-4 w-4" /></span><div>
              <p className="text-sm font-black">{reseller?.name ?? "Reseller"}</p>
              <p className="text-[10px] font-bold text-base-ink/50">Reseller Web</p>
            </div></div>
          <div className="flex items-center gap-3">
            <div className="rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-1 text-right">
              <p className="text-[9px] font-black uppercase text-base-ink/50">Saldo</p>
              <p className="font-mono text-sm font-black">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</p>
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

      <aside className="fixed bottom-3 left-3 top-20 z-30 hidden w-60 overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo lg:block">
        <div className="border-b-2 border-base-ink bg-accent-lavender p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em]">Workspace</p><p className="mt-1 text-lg font-black">Reseller Center</p></div>
        <nav className="space-y-2 p-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-neo border-2 border-base-ink px-3 py-2.5 text-sm font-bold transition-all",
                  active ? "bg-accent-sky shadow-neo-sm" : "bg-white hover:-translate-y-0.5 hover:bg-accent-sky/20"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="relative p-4 pb-24 sm:p-6 sm:pb-24 lg:ml-64 lg:p-8">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 gap-1 border-t-2 border-base-ink bg-base-surface px-2 py-1.5 lg:hidden">
        {nav.map((item) => { const active = pathname === item.href; return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 rounded-neo py-1 text-[10px] font-bold", active ? "text-base-ink" : "text-base-ink/45")}><motion.span whileTap={{ scale: 0.9 }} className={cn("flex h-8 w-8 items-center justify-center rounded-neo border border-base-ink", active ? "bg-accent-sky shadow-neo-sm" : "bg-transparent")}><item.icon className="h-4 w-4" /></motion.span>{item.label}</Link>; })}
      </nav>
    </div>
  );
}
