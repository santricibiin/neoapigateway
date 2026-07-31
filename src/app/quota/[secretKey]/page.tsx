import type { Metadata } from "next";
import { QuotaDashboardClient } from "@/components/quota/quota-dashboard-client";
import { publicBrandName } from "@/lib/bandel-upstream";

export const metadata: Metadata = {
  title: `Dashboard Kuota · ${publicBrandName()}`,
  description: "Dashboard kuota, model, usage, kontak, dan tutorial API.",
};

export default function QuotaPage({ params }: { params: { secretKey: string } }) {
  return <QuotaDashboardClient token={params.secretKey} brandName={publicBrandName()} />;
}
