import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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
  // Kontak CS member admin diambil dari Setting (csTelegram/csWhatsapp),
  // bukan kontak reseller resweb. Kalau kosong → fallback default komponen.
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { csTelegram: true, csWhatsapp: true, siteName: true },
  });
  const hasCs = Boolean(setting?.csTelegram || setting?.csWhatsapp);

  return (
    <ResLangProvider>
      <QuotaDashboardClient
        token={params.secretKey}
        brandName={await publicBrandNameAsync()}
        resellerCs={
          hasCs && setting
            ? { name: setting.siteName || "CS", waNumber: setting.csWhatsapp, telegram: setting.csTelegram }
            : null
        }
      />
    </ResLangProvider>
  );
}
