import { NextRequest, NextResponse } from "next/server";
import { getResWebSession } from "@/lib/resweb-auth";
import { addMember } from "@/lib/resweb";

export async function POST(req: NextRequest) {
  const session = getResWebSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { packageCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const packageCode = typeof body.packageCode === "string" ? body.packageCode.toUpperCase() : "";

  const result = await addMember(session.id, packageCode);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, member: result.member });
}
