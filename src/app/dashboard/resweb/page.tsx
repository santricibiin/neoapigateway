import { ReswebAdminClient } from "@/components/resweb/resweb-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReswebAdminPage() {
  const [tiers, resellers, members, paidOrders] = await Promise.all([
    prisma.resellerWebTier.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { orders: true } } },
    }),
    prisma.resellerWeb.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true, orders: true } } },
    }),
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      include: { reseller: { select: { name: true, email: true } } },
    }),
    prisma.resellerWebOrder.findMany({
      where: { status: "paid" },
      select: { unitPrice: true, unitCost: true },
    }),
  ]);

  return (
    <ReswebAdminClient
      tiers={tiers.map((t) => ({
        id: t.id,
        code: t.code,
        label: t.label,
        tokens: Number(t.tokens),
        validDays: t.validDays,
        price: t.price,
        costPrice: t.costPrice,
        active: t.active,
        sortOrder: t.sortOrder,
        orderCount: t._count.orders,
      }))}
      resellers={resellers.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        balance: Number(r.balance),
        active: r.active,
        memberCount: r._count.members,
        orderCount: r._count.orders,
        createdAt: r.createdAt.toISOString(),
      }))}
      members={members.map((m) => ({
        id: m.id,
        resellerId: m.resellerId,
        resellerName: m.reseller.name,
        secretToken: m.secretToken,
        apiKey: m.apiKey,
        name: m.name,
        keyMasked: m.keyMasked,
        tokens: Number(m.tokens),
        validDays: m.validDays,
        createdAt: m.createdAt.toISOString(),
      }))}
      omzet={paidOrders.reduce((total, order) => total + order.unitPrice, 0)}
      margin={paidOrders.reduce((total, order) => total + order.unitPrice - order.unitCost, 0)}
    />
  );
}
