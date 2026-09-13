import { fetchTopupHistory, fetchResellerActivity, fetchResellerData } from "../src/lib/bandelbanget";
import { prisma } from "../src/lib/prisma";

async function main() {
  const s = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true, pin: true } });
  if (!s?.secretKey) throw new Error("no secretKey");
  const [h, a, d] = await Promise.allSettled([
    fetchTopupHistory(s.secretKey),
    fetchResellerActivity(s.secretKey),
    fetchResellerData(s.secretKey, s.pin || ""),
  ]);
  console.log(
    "topupHistory:",
    h.status === "fulfilled" ? `OK ${h.value.length} trx` : `FAIL ${h.reason?.message}`
  );
  console.log(
    "activity:",
    a.status === "fulfilled" ? `OK ${a.value.length} log` : `FAIL ${a.reason?.message}`
  );
  console.log(
    "resellerData:",
    d.status === "fulfilled"
      ? `OK quota=${d.value.resellerQuota ?? d.value.resellerBalance ?? "?"}`
      : `FAIL ${d.reason?.message}`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
