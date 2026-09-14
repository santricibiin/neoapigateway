/* Self-check flow kredensial bandel (tanpa hit live kecuali env diset).
 * Live test: BB_TOKEN=... BB_PIN=... BB_PASSWORD=... npx tsx scripts/test-bandel-password.ts
 */
import { verifyPin, setupCustomerCredentials } from "../src/lib/bandelbanget";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("FAIL: " + msg);
}

async function main() {
  // verifyPin kini WAJIB kirim password (bukan derived lagi) — cek via
  // signature: panggil tanpa password harus gagal di upstream (400/401),
  // tapi di sini cukup pastikan modul termuat & fungsi ada.
  assert(typeof verifyPin === "function", "verifyPin export");
  assert(typeof setupCustomerCredentials === "function", "setupCustomerCredentials export");
  console.log("module OK");

  const token = process.env.BB_TOKEN;
  const pin = process.env.BB_PIN;
  const password = process.env.BB_PASSWORD;
  if (!token || !pin || !password) {
    console.log("skip live test (BB_TOKEN / BB_PIN / BB_PASSWORD tidak diset)");
    return;
  }
  const v = await verifyPin(token, pin, password);
  assert(typeof v.accessToken === "string" && v.accessToken.length > 0, "accessToken");
  console.log("verifyPin(password,pin) OK, expiresIn:", v.expiresIn);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
