import { NextResponse } from "next/server";
import { getResWebSession } from "@/lib/resweb-auth";
import { addMemberQuota } from "@/lib/resweb";

export async function POST(request: Request) {
  const session = getResWebSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  let body: { memberId?: unknown; packageCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }
  const memberId = Number(body.memberId);
  const packageCode = typeof body.packageCode === "string" ? body.packageCode.toUpperCase() : "";
  if (!Number.isInteger(memberId) || memberId < 1) return NextResponse.json({ ok: false, error: "Member tidak valid" }, { status: 400 });
  const result = await addMemberQuota(session.id, memberId, packageCode);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
