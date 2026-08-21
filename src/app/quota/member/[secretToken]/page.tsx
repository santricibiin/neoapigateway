import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { QuotaDashboardClient } from "@/components/quota/quota-dashboard-client";
import { publicBrandName } from "@/lib/bandel-upstream";

export const metadata: Metadata = {
  title: `Dashboard Member · ${publicBrandName()}`,
  description: "Dashboard kuota member.",
};

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: { secretToken: string } }) {
  const member = await prisma.member.findUnique({
    where: { secretToken: params.secretToken },
    select: { reseller: { select: { name: true, waNumber: true, telegram: true } } },
  });

  const r = member?.reseller;
  const hasCs = Boolean(r?.waNumber || r?.telegram);

  return (
    <QuotaDashboardClient
      token={params.secretToken}
      brandName={publicBrandName()}
      hideBuy
      resellerCs={
        hasCs && r
          ? { name: r.name, waNumber: r.waNumber, telegram: r.telegram }
          : null
      }
    />
  );
}
