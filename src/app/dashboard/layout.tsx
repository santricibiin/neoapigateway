import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = requireAdmin();

  return (
    <DashboardShell adminId={session.id}>{children}</DashboardShell>
  );
}
