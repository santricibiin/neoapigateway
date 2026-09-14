import { NextResponse } from "next/server";
import { setupQuotaCredentials } from "@/lib/quota-dashboard";

export const dynamic = "force-dynamic";

/**
 * Proxy setup kredensial pertama kali (password + PIN) untuk member
 * yang key-nya dibuat tanpa kredensial (credentialsSet = false).
 * Mirroring upstream: /api/public/quota/{token}/setup-credentials.
 */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }

  let body: Record<string, string> = {};
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  const pin = String(body.pin || "").trim();
  const confirmPin = String(body.confirmPin || "").trim();
  const currentPin = body.currentPin ? String(body.currentPin).trim() : undefined;

  // Validasi mirror aturan upstream — cegah percobaan gagal (rate limit 3x).
  const invalid =
    password.length < 10 ||
    password.length > 20 ||
    /[^\x21-\x7e]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password);
  if (invalid) {
    return NextResponse.json(
      { error: "Password harus 10-20 karakter ASCII tanpa spasi; wajib huruf besar, huruf kecil, angka, dan simbol" },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Password dan konfirmasi tidak cocok" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN harus 6 digit angka" }, { status: 400 });
  }
  if (pin !== confirmPin) {
    return NextResponse.json({ error: "PIN dan konfirmasi tidak cocok" }, { status: 400 });
  }
  if (currentPin !== undefined && !/^\d{6}$/.test(currentPin)) {
    return NextResponse.json({ error: "PIN lama harus 6 digit angka" }, { status: 400 });
  }

  try {
    const result = await setupQuotaCredentials(params.token, { password, pin, currentPin });
    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    const code = status === 400 || status === 409 || status === 422 || status === 429 ? status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat password & PIN" },
      { status: code }
    );
  }
}
