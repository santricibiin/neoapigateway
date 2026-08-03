import { NextRequest, NextResponse } from "next/server";
import { getResWebSession } from "@/lib/resweb-auth";
import { createReswebTopup, expireOverdueReswebOrders } from "@/lib/resweb";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = getResWebSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await expireOverdueReswebOrders();
  const orders = await prisma.resellerWebOrder.findMany({
    where: { resellerId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tier: { select: { code: true, label: true } } },
  });
  return NextResponse.json({
    ok: true,
    orders: orders.map((order) => ({ ...order, tokens: Number(order.tokens) })),
  });
}

export async function POST(req: NextRequest) {
  const session = getResWebSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { tierId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const tierId = Number(body.tierId);
  if (!Number.isInteger(tierId) || tierId < 1) {
    return NextResponse.json({ ok: false, error: "Paket tidak valid" }, { status: 400 });
  }

  const result = await createReswebTopup(session.id, tierId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  const { ok: _ok, ...rest } = result;
  return NextResponse.json({ ok: true, ...rest });
}
