import { NextResponse } from "next/server";
import { checkQuotaByApiKey } from "@/lib/quota-check";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let apiKey = "";
  try {
    const body = (await request.json()) as { apiKey?: string; key?: string };
    apiKey = String(body.apiKey || body.key || "");
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON tidak valid" }, { status: 400 });
  }
  const result = await checkQuotaByApiKey(apiKey);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
