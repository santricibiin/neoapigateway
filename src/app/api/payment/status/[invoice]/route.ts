import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { invoice: string } }
) {
  const invoice = params.invoice;
  const order = await prisma.paymentOrder.findUnique({
    where: { invoice },
    select: {
      invoice: true,
      status: true,
      paidAt: true,
      expiresAt: true,
      delivered: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (order.status === "pending" && order.expiresAt <= new Date()) {
    await prisma.paymentOrder.update({
      where: { invoice },
      data: { status: "expired" },
    });
    return NextResponse.json({
      ok: true,
      status: "expired",
    });
  }

  return NextResponse.json({
    ok: true,
    status: order.status,
    paidAt: order.paidAt,
    delivered: order.status === "paid" ? order.delivered : null,
  });
}
