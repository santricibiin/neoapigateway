import { NextResponse } from "next/server";
import { loadQuotaDashboard } from "@/lib/quota-dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Butuh Authorization Bearer" }, { status: 401 });
  }
  try {
    return NextResponse.json(await loadQuotaDashboard(params.token, accessToken));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sesi berakhir" },
      { status: 401 }
    );
  }
}
