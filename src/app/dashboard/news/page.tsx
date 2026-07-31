import { NewsAdminClient } from "@/components/news/news-admin-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await prisma.news.findMany({ orderBy: { createdAt: "desc" } });
  return <NewsAdminClient initialNews={news.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }))} />;
}
