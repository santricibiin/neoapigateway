import { checkLoginAllowed, recordLoginFail, recordLoginSuccess, formatRetry } from "../src/lib/login-rate-limit";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

// 1. Sebelum fail: boleh
assert(checkLoginAllowed("t", "a@x.com", "1.1.1.1").ok, "awal: boleh login");

// 2. 4x gagal: masih boleh
for (let i = 0; i < 4; i++) recordLoginFail("t", "a@x.com", "1.1.1.1");
assert(checkLoginAllowed("t", "a@x.com", "1.1.1.1").ok, "4 gagal: masih boleh");

// 3. Gagal ke-5: email key terkunci
recordLoginFail("t", "a@x.com", "1.1.1.1");
const r1 = checkLoginAllowed("t", "a@x.com", "1.1.1.1");
assert(!r1.ok && r1.retryAfterSec > 0, `5 gagal: email terkunci (${r1.ok ? "ok?!" : r1.retryAfterSec + "s"})`);

// 4. Email lain, IP sama → IP key juga terkunci
const r2 = checkLoginAllowed("t", "b@x.com", "1.1.1.1");
assert(!r2.ok, `IP sama dengan email beda: ikut terkunci (${r2.ok ? "ok?!" : r2.retryAfterSec + "s"})`);

// 5. Email & IP beda: bebas
assert(checkLoginAllowed("t", "c@x.com", "2.2.2.2").ok, "email & IP beda: bebas");

// 5b. Email terkunci tetap terkunci walau ganti IP (anti attacker rotate IP)
const r5 = checkLoginAllowed("t", "a@x.com", "9.9.9.9");
assert(!r5.ok, "email terkunci + IP baru: tetap terkunci (anti IP rotation)");
assert(checkLoginAllowed("u", "a@x.com", "1.1.1.1").ok, "scope beda: bebas");
// 7. Login sukses me-reset
recordLoginSuccess("t", "a@x.com", "1.1.1.1");
assert(checkLoginAllowed("t", "a@x.com", "1.1.1.1").ok, "setelah sukses: boleh lagi");

// 8. formatRetry
assert(formatRetry(90) === "2 menit", "formatRetry 90s = 2 menit");
assert(formatRetry(30) === "30 detik", "formatRetry 30s = 30 detik");

console.log("\nSEMUA TEST LULUS");
