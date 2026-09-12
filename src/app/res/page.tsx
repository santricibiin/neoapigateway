import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebDashboardClient } from "@/components/resweb/resweb-dashboard-client";

export const dynamic = "force-dynamic";

export const MEMBERS_PER_PAGE = 10;

export default async function ResDashboardPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = getResWebSession();
  if (!session) return null;

  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  const [reseller, totalMembers, members, paidTopups] = await Promise.all([
    prisma.resellerWeb.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, balance: true, active: true, createdAt: true },
    }),
    prisma.member.count({ where: { resellerId: session.id } }),
    prisma.member.findMany({
      where: { resellerId: session.id },
      orderBy: { createdAt: "desc" },
      take: MEMBERS_PER_PAGE,
      skip: (page - 1) * MEMBERS_PER_PAGE,
    }),
    prisma.resellerWebOrder.count({ where: { resellerId: session.id, status: "paid" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMembers / MEMBERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

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
      totalMembers={totalMembers}
      page={safePage}
      totalPages={totalPages}
    />
  );
}
