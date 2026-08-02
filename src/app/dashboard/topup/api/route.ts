import { NextRequest, NextResponse } from "next/server";
import { getSettingsRaw } from "@/app/actions/settings";
import { getSession } from "@/lib/auth";
import { createTopup, fetchTopupHistory, fetchTopupStatus } from "@/lib/bandelbanget";

export async function GET(request: NextRequest) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getSettingsRaw();
    if (!settings.secretKey) throw new Error("Secret Key belum diatur");
    const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
    if (orderId) {
      if (!/^[A-Za-z0-9_-]{5,100}$/.test(orderId)) throw new Error("Order ID tidak valid");
      const status = await fetchTopupStatus(settings.secretKey, orderId);
      return NextResponse.json({ ok: true, status });
    }
    const transactions = await fetchTopupHistory(settings.secretKey);
    return NextResponse.json({ ok: true, transactions });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Terjadi kesalahan" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getSettingsRaw();
    if (!settings.secretKey) throw new Error("Secret Key belum diatur");
    const body = await request.json();
    const tierId = typeof body.tierId === "string" ? body.tierId.trim() : "";
    if (!tierId || tierId.length > 100) throw new Error("Paket topup tidak valid");
    const topup = await createTopup(settings.secretKey, tierId);
    return NextResponse.json({ ok: true, topup });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Terjadi kesalahan" }, { status: 400 });
  }
}