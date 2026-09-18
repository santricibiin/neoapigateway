"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  KeyRound,
  WalletCards,
  Newspaper,
  FolderOpen,
  Database,
  Bot,
  Server,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/use-brand";

const menuSections: Array<{ title?: string; items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }> }> = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/dashboard/categories", label: "Kategori", icon: FolderOpen },
      { href: "/dashboard/tokens", label: "Produk", icon: Package },
    ],
  },
  {
    title: "Penjualan",
    items: [
      { href: "/dashboard/transactions", label: "Transaksi", icon: ShoppingCart },
      { href: "/dashboard/topup", label: "Topup", icon: WalletCards },
      { href: "/dashboard/customer-keys", label: "Customer Keys", icon: KeyRound },
    ],
  },
  {
    title: "Reseller",
    items: [
      { href: "/dashboard/reseller", label: "Reseller", icon: Users },
      { href: "/dashboard/resweb", label: "Reseller Web", icon: Users },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/dashboard/upstream", label: "Upstream", icon: Server },
      { href: "/dashboard/news", label: "Berita", icon: Newspaper },
      { href: "/dashboard/backup", label: "Backup", icon: Database },
      { href: "/dashboard/bot", label: "Bot Telegram", icon: Bot },
      { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

export function DashboardSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const brand = useBrand();
  const siteName = brand?.siteName ?? "Admin Panel";

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-16 bottom-0 z-40 my-3 ml-3 hidden flex-col overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-lg lg:flex"
    >
      {/* Brand mini di atas sidebar */}
      <div className={cn("flex items-center border-b border-base-line px-4 pb-3 pt-4", collapsed ? "justify-center" : "gap-2.5")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] shadow-neo-sm">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
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
              <p className="truncate text-sm font-extrabold">{siteName}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-base-ink/45">Admin Panel</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 [scrollbar-width:thin]">
        {menuSections.map((section, si) => (
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
                  {section.title}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-neo font-semibold transition-colors duration-150",
                        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2 text-sm",
                        active ? "bg-accent-sageSoft text-base-ink" : "text-base-ink/55 hover:bg-accent-sky/30 hover:text-base-ink"
                      )}
                    >
                      {/* Indikator aktif */}
                      {active ? (
                        <motion.span
                          layoutId="admin-active-menu"
                          className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-accent-terra"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-accent-terra" : "text-base-ink/40 group-hover:text-base-ink/70"
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
    </motion.aside>
  );
}
