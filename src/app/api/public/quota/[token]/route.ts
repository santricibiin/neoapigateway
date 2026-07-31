import { NextResponse } from "next/server";
import { loadQuotaMeta } from "@/lib/quota-dashboard";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  try {
    return NextResponse.json(await loadQuotaMeta(params.token));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat dashboard" },
      { status: 404 }
    );
  }
}
