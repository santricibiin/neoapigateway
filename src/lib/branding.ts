import { prisma } from "@/lib/prisma";

export interface Branding {
  siteName: string;
  logoUrl: string | null;
}

export async function getBranding(): Promise<Branding> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const siteName = setting?.siteName?.trim() || process.env.PUBLIC_BRAND_NAME || "Neo API Gateway";
  const logoUrl = setting?.logoPath ? "/api/brand/logo" : null;
  return { siteName, logoUrl };
}
