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
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tokens", label: "Token", icon: Package },
  { href: "/dashboard/transactions", label: "Transaksi", icon: ShoppingCart },
  { href: "/dashboard/reseller", label: "Reseller", icon: Users },
  { href: "/dashboard/customer-keys", label: "Customer Keys", icon: KeyRound },
  { href: "/dashboard/topup", label: "Topup", icon: WalletCards },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

export function DashboardSidebar({
  adminId,
  collapsed,
}: {
  adminId: number;
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-16 bottom-0 z-40 my-3 ml-3 hidden flex-col overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo lg:flex"
    >
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-2">
          {menu.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-neo border-2 border-base-ink font-semibold transition-all",
                    collapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5 text-sm",
                    active
                      ? "bg-accent-sky shadow-neo-sm"
                      : "bg-base-surface hover:bg-accent-sky/30"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </motion.aside>
  );
}
