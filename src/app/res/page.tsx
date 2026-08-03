import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebDashboardClient } from "@/components/resweb/resweb-dashboard-client";

export const dynamic = "force-dynamic";

export default async function ResDashboardPage() {
  const session = getResWebSession();
  if (!session) return null;

  const [reseller, members, paidTopups] = await Promise.all([
    prisma.resellerWeb.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, balance: true, active: true, createdAt: true },
    }),
    prisma.member.findMany({
      where: { resellerId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.resellerWebOrder.count({ where: { resellerId: session.id, status: "paid" } }),
  ]);

  return (
    <ReswebDashboardClient
      reseller={reseller ? { ...reseller, balance: Number(reseller.balance), createdAt: reseller.createdAt.toISOString() } : null}
      members={members.map((m) => ({
        id: m.id,
        secretToken: m.secretToken,
        apiKey: m.apiKey,
        name: m.name,
        keyMasked: m.keyMasked,
        tokens: Number(m.tokens),
        validDays: m.validDays,
        createdAt: m.createdAt.toISOString(),
      }))}
      paidTopups={paidTopups}
    />
  );
}
