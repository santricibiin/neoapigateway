import { prisma } from "@/lib/prisma";

const MIN_KEY_LENGTH = 8;

export type AuthenticatedReseller = {
  id: number;
  name: string;
  email: string;
  balance: bigint;
  active: boolean;
};

export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const xKey = req.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  return null;
}

export async function authenticateApiKey(req: Request): Promise<AuthenticatedReseller | null> {
  const key = extractApiKey(req);
  if (!key || key.length < MIN_KEY_LENGTH) return null;

  const reseller = await prisma.resellerWeb.findUnique({
    where: { apiKey: key },
    select: { id: true, name: true, email: true, balance: true, active: true },
  });

  if (!reseller || !reseller.active) return null;
  return reseller;
}
