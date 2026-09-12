import type { Metadata } from "next";
import { QuotaDashboardClient } from "@/components/quota/quota-dashboard-client";
import { publicBrandNameAsync } from "@/lib/bandel-upstream";
import { ResLangProvider } from "@/components/resweb/res-lang";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Dashboard Kuota · ${await publicBrandNameAsync()}`,
    description: "Dashboard kuota, model, usage, kontak, dan tutorial API.",
  };
}

export default async function QuotaPage({ params }: { params: { secretKey: string } }) {
  return (
    <ResLangProvider>
      <QuotaDashboardClient token={params.secretKey} brandName={await publicBrandNameAsync()} />
    </ResLangProvider>
  );
}
