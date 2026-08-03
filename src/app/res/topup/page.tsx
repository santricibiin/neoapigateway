import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { expireOverdueReswebOrders } from "@/lib/resweb";
import { ReswebTopupClient } from "@/components/resweb/resweb-topup-client";

export const dynamic = "force-dynamic";

export default async function ResTopupPage() {
  const session = getResWebSession();
  if (!session) return null;

  await expireOverdueReswebOrders();

  const [tiers, orders] = await Promise.all([
    prisma.resellerWebTier.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.resellerWebOrder.findMany({
      where: { resellerId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { tier: { select: { code: true, label: true } } },
    }),
  ]);

  return (
    <ReswebTopupClient
      tiers={tiers.map((t) => ({
        id: t.id,
        code: t.code,
        label: t.label,
        tokens: Number(t.tokens),
        validDays: t.validDays,
        price: t.price,
        sortOrder: t.sortOrder,
      }))}
      orders={orders.map((o) => ({
        id: o.id,
        invoice: o.invoice,
        amount: o.amount,
        tokens: Number(o.tokens),
        status: o.status,
        tierLabel: o.tier.label,
        expiresAt: o.expiresAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
