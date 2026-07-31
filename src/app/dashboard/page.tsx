import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [tokens, transactions, adminCount] = await Promise.all([
    prisma.token.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { token: true },
    }),
    prisma.admin.count(),
  ]);

  const totalRevenue = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSold = tokens.reduce((sum, t) => sum + t.sold, 0);
  const totalStock = tokens.reduce((sum, t) => sum + t.stock, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayTransactions = transactions.filter((t) => {
      const created = new Date(t.createdAt);
      return created >= dayStart && created <= dayEnd && t.status === "success";
    });

    return {
      day: date.toLocaleDateString("id-ID", { weekday: "short" }),
      revenue: dayTransactions.reduce((s, t) => s + Number(t.amount), 0),
      count: dayTransactions.length,
    };
  });

  const tokenSales = tokens.map((t) => ({
    name: t.name,
    sold: t.sold,
    stock: t.stock,
  }));

  const statusBreakdown = [
    {
      name: "Sukses",
      value: transactions.filter((t) => t.status === "success").length,
      color: "#86EFAC",
    },
    {
      name: "Pending",
      value: transactions.filter((t) => t.status === "pending").length,
      color: "#FDE047",
    },
    {
      name: "Gagal",
      value: transactions.filter((t) => t.status === "failed").length,
      color: "#FCA5A5",
    },
  ];

  const stats = {
    totalRevenue,
    totalSold,
    totalStock,
    totalTransactions: transactions.length,
    adminCount,
  };

  const recentTransactions = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    buyerName: t.buyerName,
    buyerEmail: t.buyerEmail,
    tokenName: t.token.name,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <DashboardClient
      stats={stats}
      last7Days={last7Days}
      tokenSales={tokenSales}
      statusBreakdown={statusBreakdown}
      recentTransactions={recentTransactions}
    />
  );
}
