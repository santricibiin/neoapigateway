import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { publicApiBase } from "@/lib/bandel-upstream";
import { ReswebApiDocsClient } from "@/components/resweb/resweb-api-docs-client";

export const dynamic = "force-dynamic";

export default async function ResApiDocsPage() {
  const session = getResWebSession();
  if (!session) return null;

  const reseller = await prisma.resellerWeb.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, apiKey: true },
  });

  return <ReswebApiDocsClient reseller={reseller ? { name: reseller.name, email: reseller.email, apiKey: reseller.apiKey } : null} baseUrl={publicApiBase()} />;
}
