import { NextResponse } from "next/server";
import { regenerateQuotaKey } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

/** Rotasi API key member. Upstream memberlakukan cooldown 60 menit (429). */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Sesi berakhir, masukkan PIN lagi" }, { status: 401 });
  }

  try {
    const result = await regenerateQuotaKey(params.token, accessToken);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    const message = error instanceof Error ? error.message : "Gagal mengganti API key";
    const code = status === 401 ? 401 : status === 429 ? 429 : 502;
    return NextResponse.json({ error: message }, { status: code });
  }
}
