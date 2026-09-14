import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availableBinanceMethods } from "@/lib/binance-order";
import { GOPAY2_PROVIDER, gopay2Configured } from "@/lib/gopay-merchant2";

export const dynamic = "force-dynamic";

/** Metode pembayaran yang tersedia untuk pembeli (QRIS + Binance). */
export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { qrisProvider: true, qrisStatic: true, gopay2BaseUrl: true, gopay2ApiKey: true },
  });
  const binance = await availableBinanceMethods();
  const qrisActive = Boolean(
    setting?.qrisProvider &&
      setting.qrisProvider !== "none" &&
      (setting.qrisProvider === GOPAY2_PROVIDER
        ? gopay2Configured({ baseUrl: setting.gopay2BaseUrl, apiKey: setting.gopay2ApiKey })
        : setting.qrisStatic)
  );
  return NextResponse.json({
    ok: true,
    methods: {
      qris: qrisActive,
      binancepay: binance.binancepay,
      usdtNetworks: binance.usdt,
    },
    usdtRate: binance.rate,
  });
}
