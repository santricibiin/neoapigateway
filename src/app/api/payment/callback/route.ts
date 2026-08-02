import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { parsePaymentNotification, makeEventKey } from "@/lib/payment-notification";
import { claimPaymentEvent, fulfillOrder } from "@/lib/payment-matcher";

const KNOWN = new Set(["com.bnc.finance", "id.dana"]);

function checkSecret(value: unknown, secret: string): boolean {
  if (typeof value !== "string" || !value) return false;
  try {
    const a = Buffer.from(value);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) as Record<string, unknown>) ?? {};
  }
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    out[k] = typeof v === "string" ? v : v.name;
  }
  return out;
}

export async function POST(req: Request) {
  const body = await readBody(req);

  // Ambil secret dari DB settings
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { forwarderSecret: true },
  });
  const secrets = [
    process.env.PAYMENT_FORWARD_SECRET || process.env.FORWARDER_SECRET,
    setting?.forwarderSecret?.trim(),
  ].filter((s): s is string => Boolean(s));

  // Jika secret diatur, wajib cocok
  if (secrets.length > 0) {
    const bodySecret = body.additionalParam1 ?? body.param1 ?? body.secret;
    const authorized = secrets.some((secret) => checkSecret(bodySecret, secret));
    if (!authorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // Hapus field secret dari body supaya tidak masuk raw/log
  delete body.secret;
  delete body.forwardSecret;
  delete body.additionalParam1;
  delete body.param1;

  const parsed = parsePaymentNotification(body);

  // pkg unknown & bukan payment → ignore (200)
  if (!KNOWN.has(parsed.pkg) && parsed.provider === "unknown" && !parsed.isPayment) {
    return NextResponse.json({ ok: true, ignored: true, reason: "pkg" });
  }

  const eventKey = makeEventKey(body);
  const event = await prisma.paymentEvent.upsert({
    where: { eventKey },
    create: {
      eventKey,
      provider: parsed.provider,
      pkg: parsed.pkg,
      name: parsed.name,
      title: parsed.title,
      text: parsed.text,
      subtext: parsed.subtext,
      bigtext: parsed.bigtext,
      infotext: parsed.infotext,
      amount: parsed.amount,
      account: parsed.account,
      raw: JSON.stringify(body),
    },
    update: {},
  });

  if (!parsed.isPayment || parsed.amount == null) {
    return NextResponse.json({ ok: true, ignored: true, reason: "not-payment" });
  }

  try {
    const order = await claimPaymentEvent(event.id);
    if (order) {
      await fulfillOrder(order.id);
    }
  } catch (err) {
    console.error("payment callback fulfillment error:", err);
  }

  return NextResponse.json({ ok: true, id: event.id, amount: parsed.amount });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Callback aktif. Gunakan POST." });
}
