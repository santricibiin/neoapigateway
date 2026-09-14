import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollBinancePayments } from "@/lib/binance-order";
import { matchGopayMerchant2Payments } from "@/lib/gopay-merchant2";
import { INVOICE_SCOPE, checkIpAllowed, clientIp, recordInvoiceHit, recordInvoiceMiss } from "@/lib/ip-rate-limit";

export async function GET(
  request: Request,
  { params }: { params: { invoice: string } }
) {
  const invoice = params.invoice;

  // Anti brute-force: IP terkunci setelah 3x invoice tidak ditemukan (15 menit).
  // Lookup invoice valid tidak dihitung — polling status tiap 5 detik tetap aman.
  const ip = clientIp(request.headers);
  const allowed = checkIpAllowed(INVOICE_SCOPE, ip);
  if (!allowed.ok) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(allowed.retryAfterSec) } }
    );
  }

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
    recordInvoiceMiss(INVOICE_SCOPE, ip);
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  recordInvoiceHit(INVOICE_SCOPE, ip);

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

  // Order gopaymerchant2: poll gateway (guard interval internal), fulfill di dalam poller.
  if (order.status === "pending" || order.status === "expired") {
    await matchGopayMerchant2Payments();
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
