"use client";

import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Zap } from "lucide-react";
import { DashboardProfileMenu } from "@/components/shared/dashboard-profile-menu";
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
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-base-line bg-base-surface/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className="hidden h-9 w-9 items-center justify-center rounded-neo border border-base-line bg-base-surface text-base-ink/60 shadow-neo-sm transition-colors hover:text-base-ink lg:inline-flex"
          aria-label={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          title={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={2.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={2.5} />}
        </motion.button>
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-neo border border-base-line bg-accent-terra shadow-neo-sm">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{siteName}</span>
          </>
        )}
      </div>

      <DashboardProfileMenu adminId={adminId} />
    </header>
  );
}
