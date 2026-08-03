import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebNewsClient } from "@/components/resweb/resweb-news-client";

export const dynamic = "force-dynamic";

export default async function ResNewsPage() {
  const session = getResWebSession();
  if (!session) return null;
  const news = await prisma.resellerWebNews.findMany({ where: { resellerId: session.id }, orderBy: { createdAt: "desc" } });
  return <ReswebNewsClient initialNews={news.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }))} />;
}
