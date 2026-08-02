import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { logoPath: true },
  });

  const logoPath = setting?.logoPath;
  if (!logoPath || !existsSync(logoPath)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = readFileSync(logoPath);
    const ext = logoPath.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "gif" ? "image/gif" :
      ext === "webp" ? "image/webp" :
      ext === "svg" ? "image/svg+xml" :
      "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
