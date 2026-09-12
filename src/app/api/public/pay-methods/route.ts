import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availableBinanceMethods } from "@/lib/binance-order";

export const dynamic = "force-dynamic";

/** Metode pembayaran yang tersedia untuk pembeli (QRIS + Binance). */
export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { qrisProvider: true, qrisStatic: true },
  });
  const binance = await availableBinanceMethods();
  return NextResponse.json({
    ok: true,
    methods: {
      qris: Boolean(setting?.qrisProvider && setting.qrisProvider !== "none" && setting.qrisStatic),
      binancepay: binance.binancepay,
      usdtNetworks: binance.usdt,
    },
    usdtRate: binance.rate,
  });
}
