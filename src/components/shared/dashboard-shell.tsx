"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { DashboardBottomNav } from "@/components/shared/dashboard-bottom-nav";

export function DashboardShell({
  adminId,
  children,
}: {
  adminId: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-base-bg">
      <DashboardHeader
        adminId={adminId}
        onToggleSidebar={() => setCollapsed((v) => !v)}
      />
      <DashboardSidebar adminId={adminId} collapsed={collapsed} />
      <main
        className={`p-4 transition-all duration-300 sm:p-6 lg:p-8 ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        } pb-24 lg:pb-8`}
      >
        {children}
      </main>
      <DashboardBottomNav />
    </div>
  );
}
