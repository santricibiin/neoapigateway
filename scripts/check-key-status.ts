import { prisma } from "../src/lib/prisma";
import { fetchResellerKeys } from "../src/lib/bandelbanget";

async function main() {
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) {
    console.log("secretKey kosong");
    process.exit(0);
  }
  const { keys } = await fetchResellerKeys(setting.secretKey);
  console.log("total keys:", keys.length);
  console.log("punya secretToken:", keys.filter((k) => k.secretToken).length);
  console.log("punya dashboardUrl:", keys.filter((k) => k.dashboardUrl).length);
  console.log("punya keyMasked:", keys.filter((k) => k.keyMasked).length);
  // Distribusi status
  const byStatus: Record<string, number> = {};
  for (const k of keys) byStatus[String(k.status ?? "-")] = (byStatus[String(k.status ?? "-")] ?? 0) + 1;
  console.log("status:", JSON.stringify(byStatus));
  console.log("sample key:", JSON.stringify(keys[0]).slice(0, 400));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
