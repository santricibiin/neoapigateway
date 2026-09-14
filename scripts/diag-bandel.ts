import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = (process.env.BANDEL_UPSTREAM || "https://bandelbanget.xyz").replace(/\/$/, "");

async function main() {
  const s = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true, pin: true } });
  if (!s?.secretKey) { console.log("NO SECRETKEY"); return; }
  console.log("secretKey:", s.secretKey.slice(0, 8) + "…", "pin set:", Boolean(s.pin));

  // 1. Public quota meta (tanpa auth)
  try {
    const r = await fetch(`${BASE}/api/public/quota/${encodeURIComponent(s.secretKey)}`, { cache: "no-store" });
    console.log("quota meta:", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.log("quota meta FAIL:", e instanceof Error ? e.message : e);
  }

  // 2. verify-pin
  if (s.pin) {
    try {
      const r = await fetch(`${BASE}/api/public/quota/${encodeURIComponent(s.secretKey)}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: s.pin }),
        cache: "no-store",
      });
      const body = await r.text();
      console.log("verify-pin:", r.status, body.slice(0, 200));
      if (r.ok) {
        const token = JSON.parse(body).accessToken;
        const u = new URL(`${BASE}/api/public/reseller/keys`);
        u.searchParams.set("token", s.secretKey);
        const r2 = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        console.log("reseller/keys:", r2.status, (await r2.text()).slice(0, 300));
      }
    } catch (e) {
      console.log("verify-pin FAIL:", e instanceof Error ? e.message : e);
    }
  }
}

main().finally(() => prisma.$disconnect());
