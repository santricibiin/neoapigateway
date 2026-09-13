import { NextResponse } from "next/server";
import { changeQuotaPin, verifyPin } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

/**
 * Ganti PIN member. Setelah sukses, sesi lama bisa hangus — auto verify-pin
 * dengan PIN baru supaya client langsung dapat accessToken fresh.
 */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  const accessToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Sesi berakhir, masukkan PIN lagi" }, { status: 401 });
  }

  let oldPin = "";
  let newPin = "";
  try {
    const body = (await request.json()) as { oldPin?: string; newPin?: string };
    oldPin = String(body.oldPin || "").trim();
    newPin = String(body.newPin || "").trim();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(oldPin) || !/^\d{6}$/.test(newPin)) {
    return NextResponse.json({ error: "PIN lama dan PIN baru harus 6 digit" }, { status: 400 });
  }
  if (oldPin === newPin) {
    return NextResponse.json({ error: "PIN baru tidak boleh sama dengan PIN lama" }, { status: 400 });
  }

  try {
    await changeQuotaPin(params.token, accessToken, oldPin, newPin);
    let freshToken: string | null = null;
    try {
      const verified = await verifyPin(params.token, newPin);
      freshToken = verified.accessToken;
    } catch {
      // PIN sudah berubah tapi verify gagal (mis. lockout) — biarkan client re-login.
    }
    return NextResponse.json({ ok: true, ...(freshToken ? { accessToken: freshToken } : {}) });
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    const message = error instanceof Error ? error.message : "Gagal mengganti PIN";
    const code = status === 401 ? 401 : status === 429 ? 429 : status === 403 ? 403 : 502;
    return NextResponse.json({ error: message }, { status: code });
  }
}
