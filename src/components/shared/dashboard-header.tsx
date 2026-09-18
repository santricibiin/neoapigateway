"use client";

import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Zap, ShieldCheck } from "lucide-react";
import { DashboardProfileMenu } from "@/components/shared/dashboard-profile-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useBrand } from "@/lib/use-brand";

export function DashboardHeader({
  adminId,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  adminId: number;
  onToggleSidebar: () => void;
  sidebarCollapsed?: boolean;
}) {
  const brand = useBrand();
  const siteName = brand?.siteName ?? "Neo API Gateway";
  const logoUrl = brand?.logoUrl;

  return (
    <header className="sticky top-0 z-50 border-b border-base-line bg-base-surface/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex h-16 items-center justify-between gap-3">
        {/* Kiri: toggle + brand */}
        <div className="flex min-w-0 items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface text-base-ink/55 shadow-neo-sm transition-colors hover:border-stone-400 hover:text-base-ink lg:inline-flex"
            aria-label={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2.5} />
            )}
          </motion.button>

          {/* Brand dalam kotak menyatu */}
          <div className="flex min-w-0 items-center gap-2.5 rounded-neo border border-base-line bg-base-bg px-3 py-1.5 shadow-neo-sm">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-7 max-w-[120px] object-contain" />
            ) : (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo bg-accent-terra shadow-neo-sm">
                  <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </span>
                <span className="truncate text-base font-extrabold tracking-tight">{siteName}</span>
              </>
            )}
            <span className="hidden items-center gap-1 border-l border-base-line pl-2.5 text-[10px] font-black uppercase tracking-wider text-base-ink/45 md:inline-flex">
              <ShieldCheck className="h-3 w-3 text-accent-sageDeep" strokeWidth={2.5} />
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DashboardProfileMenu adminId={adminId} />
        </div>
      </div>
    </header>
  );
}
