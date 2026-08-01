import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaymentNotification, makeEventKey } from "@/lib/payment-notification";
import { claimPaymentEvent, fulfillOrder } from "@/lib/payment-matcher";

const KNOWN = new Set(["com.bnc.finance", "id.dana"]);

function authorized(req: Request): boolean {
  const secret = process.env.PAYMENT_FORWARD_SECRET || process.env.FORWARDER_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-forward-secret") ?? req.headers.get("authorization");
  if (!header) return false;
  return header === secret || header === `Bearer ${secret}`;
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
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await readBody(req);
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

export async function GET(req: Request) {
  const info = {
    ok: true,
    endpoint: "/api/payment/callback",
    method: "POST",
    providers: [
      { name: "neobank", pkg: "com.bnc.finance" },
      { name: "dana", pkg: "id.dana" },
    ],
    fields: ["name", "pkg", "title", "text", "subtext", "bigtext", "infotext"],
    secretHeader: process.env.PAYMENT_FORWARD_SECRET || process.env.FORWARDER_SECRET ? "x-forward-secret" : null,
  };

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payment Callback</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5}
  code,pre{background:#f4f1de;border:1px solid #000;padding:.2rem .4rem}
  pre{padding:1rem;overflow:auto}
  .ok{color:#0a0;font-weight:700}
</style></head><body>
  <p class="ok">✓ Callback aktif</p>
  <h1>POST /api/payment/callback</h1>
  <p>Satu URL untuk Neobank + DANA.</p>
  <pre>URL: ${req.headers.get("host")}/api/payment/callback
Method: POST

Neobank pkg: com.bnc.finance
DANA pkg: id.dana

fields: name, pkg, title, text, subtext, bigtext, infotext</pre>
  <pre>${JSON.stringify(info, null, 2)}</pre>
</body></html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json(info);
}
