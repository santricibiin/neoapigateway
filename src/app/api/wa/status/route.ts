import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** Status WA bot untuk admin page: pairing code hasil runner + indikasi session terdaftar. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const s = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { waEnabled: true, waPhoneNumber: true, waPairingCode: true, waPairingRequest: true },
  });

  // Session Baileys tersimpan runner di storage/wa-session/creds.json.
  const credsPath = path.join(process.cwd(), "storage", "wa-session", "creds.json");
  let registered = false;
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    registered = Boolean(creds?.registered);
  } catch {
    registered = false;
  }

  return NextResponse.json({
    ok: true,
    waEnabled: s?.waEnabled ?? false,
    waPhoneNumber: s?.waPhoneNumber ?? "",
    pairingCode: s?.waPairingCode ?? null,
    pairingPending: Boolean(s?.waPairingRequest),
    registered,
  });
}
