"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/categories", label: "Kategori", icon: FolderOpen },
  { href: "/dashboard/tokens", label: "Produk", icon: Package },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ShoppingCart },
  { href: "/dashboard/reseller", label: "Reseller", icon: Users },
  { href: "/dashboard/resweb", label: "ResWeb", icon: Users },
  { href: "/dashboard/customer-keys", label: "Keys", icon: KeyRound },
  { href: "/dashboard/topup", label: "Topup", icon: WalletCards },
  { href: "/dashboard/backup", label: "Backup", icon: Database },
  { href: "/dashboard/news", label: "Berita", icon: Newspaper },
  { href: "/dashboard/settings", label: "Setting", icon: Settings },
];

export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-1 overflow-x-auto border-t-2 border-base-ink bg-base-surface px-1 py-1.5 lg:hidden">
      {menu.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[68px] flex-1 flex-col items-center gap-0.5 rounded-neo py-1 text-[10px] font-semibold transition-colors",
              active ? "text-base-ink" : "text-base-ink/50"
            )}
          >
            <motion.span
              whileTap={{ scale: 0.9 }}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-neo border border-base-ink",
                active ? "bg-accent-sky shadow-neo-sm" : "bg-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </motion.span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
