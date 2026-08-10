import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/reseller-api-auth";
import { addMemberQuota } from "@/lib/resweb";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

const VALID_CODES = new Set(Object.keys(QUOTA_PACKAGES));

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const reseller = await authenticateApiKey(req);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const memberId = Number(params.id);
  if (!Number.isInteger(memberId) || memberId < 1) {
    return NextResponse.json({ ok: false, error: "Member ID tidak valid" }, { status: 400 });
  }

  let body: { packageCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const packageCode = typeof body.packageCode === "string" ? body.packageCode.trim().toUpperCase() : "";
  if (!packageCode || !VALID_CODES.has(packageCode)) {
    return NextResponse.json({ ok: false, error: `packageCode tidak valid. Pilihan: ${[...VALID_CODES].join(", ")}` }, { status: 400 });
  }

  const result = await addMemberQuota(reseller.id, memberId, packageCode);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
