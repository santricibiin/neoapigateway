"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { DashboardBottomNav } from "@/components/shared/dashboard-bottom-nav";

const COLLAPSED_KEY = "neo-admin-sidebar-collapsed";

export function DashboardShell({
  adminId,
  children,
}: {
  adminId: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Restore preferensi collapse dari localStorage.
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
    <div className="min-h-screen bg-base-bg">
      <DashboardHeader adminId={adminId} onToggleSidebar={toggle} sidebarCollapsed={collapsed} />
      <DashboardSidebar collapsed={collapsed} />
      <main
        className={`p-4 transition-[margin] duration-300 ease-out sm:p-5 lg:p-6 ${
          collapsed ? "lg:ml-[88px]" : "lg:ml-[276px]"
        } pb-24 lg:pb-6`}
      >
        {children}
      </main>
      <DashboardBottomNav />
    </div>
  );
}
