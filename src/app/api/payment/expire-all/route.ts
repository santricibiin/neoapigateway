import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/auth";
import { expireOverdueOrders } from "@/lib/shop-order";

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isCron = cronSecret && bearer && safeEqual(bearer, cronSecret);
  const isAdmin = Boolean(getSession());

  if (!isCron && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const count = await expireOverdueOrders();
  return NextResponse.json({ ok: true, expired: count });
}
