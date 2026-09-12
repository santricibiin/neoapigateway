import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollBinancePayments } from "@/lib/binance-order";

export async function GET(
  _request: Request,
  { params }: { params: { invoice: string } }
) {
  const invoice = params.invoice;
  let order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    select: {
      invoice: true,
      status: true,
      paidAt: true,
      expiresAt: true,
      delivered: true,
      currency: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Order USDT: cek transaksi masuk di Binance (poll API, guard interval internal).
  // Kalau ada match → order langsung difulfill di dalam poller.
  if (order.currency === "usdt" && (order.status === "pending" || order.status === "expired")) {
    await pollBinancePayments();
    order = (await prisma.paymentOrder.findUnique({
      where: { invoice },
      select: {
        invoice: true,
        status: true,
        paidAt: true,
        expiresAt: true,
        delivered: true,
        currency: true,
      },
    })) ?? order;
  }

  // Grace period: notifikasi bank bisa telat. Jangan expire permanen terlalu cepat.
  const EXPIRE_GRACE_MS = 10 * 60 * 1000;
  if (order.status === "pending" && order.expiresAt.getTime() + EXPIRE_GRACE_MS <= Date.now()) {
    await prisma.paymentOrder.update({
      where: { invoice },
      data: { status: "expired" },
    });
    return NextResponse.json({
      ok: true,
      status: "expired",
    });
  }

  if (order.status === "pending" && order.expiresAt <= new Date()) {
    // Lewat expiresAt tapi masih dalam grace period → tampil expired ke pembeli,
    // status DB tetap pending supaya notifikasi telat masih bisa diclaim.
    return NextResponse.json({
      ok: true,
      status: "pending",
      expiredView: true,
    });
  }

  return NextResponse.json({
    ok: true,
    status: order.status,
    paidAt: order.paidAt,
    delivered: order.status === "paid" ? order.delivered : null,
  });
}
