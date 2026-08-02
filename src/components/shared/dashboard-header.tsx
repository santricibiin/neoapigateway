"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Menu, Zap } from "lucide-react";
import { DashboardProfileMenu } from "@/components/shared/dashboard-profile-menu";
import { useBrand } from "@/lib/use-brand";

export function DashboardHeader({
  adminId,
  onToggleSidebar,
}: {
  adminId: number;
  onToggleSidebar: () => void;
}) {
  const brand = useBrand();
  const siteName = brand?.siteName ?? "Neo API Gateway";
  const logoUrl = brand?.logoUrl;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b-2 border-base-ink bg-base-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ y: 2 }}
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm lg:inline-flex"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
        </motion.button>
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
              <Zap className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-extrabold">{siteName}</span>
          </>
        )}
      </div>

      <DashboardProfileMenu adminId={adminId} />
    </header>
  );
}
