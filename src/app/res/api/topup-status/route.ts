import { NextRequest, NextResponse } from "next/server";
import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { expireOverdueReswebOrders } from "@/lib/resweb";
import { matchGopayMerchant2Payments } from "@/lib/gopay-merchant2";

export async function GET(req: NextRequest) {
  const session = getResWebSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const invoice = req.nextUrl.searchParams.get("invoice")?.trim();
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice wajib diisi" }, { status: 400 });

  await expireOverdueReswebOrders();
  let order = await prisma.resellerWebOrder.findFirst({
    where: { invoice, resellerId: session.id },
    select: { invoice: true, status: true, amount: true, tokens: true, expiresAt: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: "Tidak ditemukan" }, { status: 404 });

  // Order gopaymerchant2: poll gateway (guard interval internal), fulfill di dalam poller.
  if (order.status === "pending" || order.status === "expired") {
    await matchGopayMerchant2Payments();
    order = (await prisma.resellerWebOrder.findFirst({
      where: { invoice, resellerId: session.id },
      select: { invoice: true, status: true, amount: true, tokens: true, expiresAt: true, paidAt: true },
    })) ?? order;
  }

  return NextResponse.json({ ok: true, ...order, tokens: Number(order.tokens) });
}
