import type { Metadata } from "next";
import { QuotaDashboardClient } from "@/components/quota/quota-dashboard-client";
import { publicBrandName } from "@/lib/bandel-upstream";

export const metadata: Metadata = {
  title: `Dashboard Member · ${publicBrandName()}`,
  description: "Dashboard kuota member.",
};

export default function MemberPage({ params }: { params: { secretToken: string } }) {
  return <QuotaDashboardClient token={params.secretToken} brandName={publicBrandName()} hideBuy />;
}
