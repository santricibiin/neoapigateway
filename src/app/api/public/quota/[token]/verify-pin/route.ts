import { NextResponse } from "next/server";
import { verifyQuotaPin } from "@/lib/quota-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  let pin = "";
  try {
    const body = (await request.json()) as { pin?: string };
    pin = String(body.pin || "").trim();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN harus 6 digit" }, { status: 400 });
  }
  try {
    const result = await verifyQuotaPin(params.token, pin);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PIN ditolak" },
      { status: 401 }
    );
  }
}
