import { NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const branding = await getBranding();
  return NextResponse.json(branding);
}
