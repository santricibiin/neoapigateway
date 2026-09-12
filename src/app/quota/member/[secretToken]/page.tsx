import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { QuotaDashboardClient } from "@/components/quota/quota-dashboard-client";
import { publicBrandNameAsync } from "@/lib/bandel-upstream";
import { ResLangProvider } from "@/components/resweb/res-lang";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Dashboard Member · ${await publicBrandNameAsync()}`,
    description: "Dashboard kuota member.",
  };
}

export default async function MemberPage({ params }: { params: { secretToken: string } }) {
  const member = await prisma.member.findUnique({
    where: { secretToken: params.secretToken },
    select: { reseller: { select: { name: true, waNumber: true, telegram: true } } },
  });

  const r = member?.reseller;
  const hasCs = Boolean(r?.waNumber || r?.telegram);

  return (
    <ResLangProvider>
      <QuotaDashboardClient
        token={params.secretToken}
        brandName={await publicBrandNameAsync()}
        hideBuy
        resellerCs={
          hasCs && r
            ? { name: r.name, waNumber: r.waNumber, telegram: r.telegram }
            : null
        }
      />
    </ResLangProvider>
  );
}
