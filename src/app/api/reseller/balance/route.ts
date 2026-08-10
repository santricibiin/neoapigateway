import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/reseller-api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const reseller = await authenticateApiKey(req);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    name: reseller.name,
    email: reseller.email,
    balance: Number(reseller.balance),
  });
}
