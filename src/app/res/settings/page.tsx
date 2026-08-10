import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebSettingsClient } from "@/components/resweb/resweb-settings-client";

export const dynamic = "force-dynamic";

export default async function ResSettingsPage() {
  const session = getResWebSession();
  if (!session) return null;

  const reseller = await prisma.resellerWeb.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, apiKey: true },
  });

  return <ReswebSettingsClient reseller={reseller ? { id: reseller.id, name: reseller.name, email: reseller.email, apiKey: reseller.apiKey } : null} />;
}
