/**
 * Koneksi WhatsApp (Baileys) single-instance dengan pairing code.
 * Pola diambil dari Ryo Yamada MD (src/connection.js):
 *   - useMultiFileAuthState untuk session persist di storage/wa-session
 *   - requestPairingCode(phone) saat belum registered
 *   - markOnlineOnConnect: false supaya bot tidak tampil online
 *
 * Dipakai oleh scripts/poll-wa.ts (runner terpisah dari Next.js server).
 */
import makeWASocket, {
  DisconnectReason,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type AuthenticationCreds,
  type BaileysEventMap,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import fs from "fs";
import path from "path";

const logger = pino({ level: "error" });
const SESSION_DIR = path.join(process.cwd(), "storage", "wa-session");

export interface WaBotState {
  connected: boolean;
  /** Nomor bot yang terdaftar di session (62xxxx). */
  me: string | null;
  pairingCode: string | null;
}

type StateListener = (state: WaBotState) => void;

interface WaBotHandle {
  sock: WASocket;
  state: WaBotState;
  /** Minta pairing code baru untuk nomor tertentu. */
  requestPairing: (phoneNumber: string) => Promise<string | null>;
  end: () => void;
}

let handle: WaBotHandle | null = null;
const listeners = new Set<StateListener>();

/** Antrian permintaan pairing: diproses begitu koneksi "connecting". */
let pairingSignal: { phoneNumber: string; resolve: (code: string | null) => void } | null = null;

/** Minta pairing code lewat koneksi aktif (atau antre bila sedang menyambung). */
export async function requestWaPairing(phoneNumber: string): Promise<string | null> {
  const clean = phoneNumber.replace(/[^0-9]/g, "");
  if (!clean) return null;
  if (handle && !handle.sock.authState.creds.registered) {
    return handle.requestPairing(clean);
  }
  // Belum ada koneksi: start lalu antre.
  const h = await startWaBot();
  if (h.sock.authState.creds.registered) return null;
  return new Promise((resolve) => {
    pairingSignal = { phoneNumber: clean, resolve };
    // Fallback timeout 20 detik.
    setTimeout(() => {
      if (pairingSignal?.resolve === resolve) {
        pairingSignal = null;
        resolve(null);
      }
    }, 20_000);
  });
}

function notify() {
  if (!handle) return;
  for (const l of listeners) l({ ...handle.state });
}

export function onWaState(listener: StateListener) {
  listeners.add(listener);
  if (handle) listener({ ...handle.state });
  return () => listeners.delete(listener);
}

export function waState(): WaBotState {
  return handle ? { ...handle.state } : { connected: false, me: null, pairingCode: null };
}

/**
 * Mulai (atau restart) koneksi WA. Session tersimpan di storage/wa-session,
 * jadi restart biasanya tidak butuh pairing ulang.
 */
export async function startWaBot(): Promise<WaBotHandle> {
  if (handle) return handle;

  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  // Sama seperti Ryo Yamada: ambil versi WA Web TERBARU langsung dari
  // web.whatsapp.com. fetchLatestBaileysVersion sering mati → fallback versi
  // tua → WhatsApp menolak pairing ("gagal menautkan perangkat").
  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestWaWebVersion({});
    version = fetched.version;
  } catch {
    version = undefined; // Baileys pakai default bawaan
  }

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Mac OS", "Chrome", "14.4.1"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });

  handle = {
    sock,
    state: {
      connected: false,
      me: state.creds.registered ? credsToMe(state.creds) : null,
      pairingCode: null,
    },
    requestPairing: async (phoneNumber: string) => {
      const clean = phoneNumber.replace(/[^0-9]/g, "");
      if (!clean) return null;
      if (sock.authState.creds.registered) return null;
      try {
        // Beri jarak seperti di Ryo Yamada: hindari error pairing terlalu cepat.
        await new Promise((r) => setTimeout(r, 2000));
        const code = await sock.requestPairingCode(clean);
        if (handle) handle.state.pairingCode = code;
        notify();
        return code ?? null;
      } catch (error) {
        console.error("[wa] requestPairingCode gagal:", error instanceof Error ? error.message : error);
        return null;
      }
    },
    end: () => {
      try {
        sock.end(undefined);
      } catch {}
      handle = null;
    },
  };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update: BaileysEventMap["connection.update"]) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open" && handle) {
      handle.state.connected = true;
      handle.state.pairingCode = null;
      const me = (sock.user?.id || "").split(":")[0] || null;
      handle.state.me = me;
      console.log("[wa] tersambung sebagai", me);
      notify();
    }
    if (connection === "close" && handle) {
      handle.state.connected = false;
      notify();
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.error(
        "[wa] terputus:",
        lastDisconnect?.error instanceof Error ? lastDisconnect.error.message : code,
        `(kode: ${code}${loggedOut ? ", logout" : ""})`
      );

      const wasRegistered = sock.authState.creds.registered;
      const hadPairingCode = Boolean(handle.state.pairingCode);
      handle = null;
      try {
        sock.end(undefined);
      } catch {}

      if (loggedOut) {
        // Logout: bersihkan session agar admin bisa pairing ulang dari nol.
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        setTimeout(() => void startWaBot(), 3000);
      } else if (wasRegistered) {
        // Sudah pernah login: reconnect otomatis aman (creds tersimpan).
        setTimeout(() => void startWaBot(), 3000);
      } else if (!hadPairingCode) {
        // Belum registered & tanpa kode aktif: boleh connect ulang pelan-pelan.
        setTimeout(() => void startWaBot(), 5000);
      }
      // Ada pairing code aktif & belum registered: JANGAN buat socket baru —
      // kode terikat socket yang memintanya. Admin bisa minta kode baru kapan saja.
    }
  });

  // Pairing yang diminta sebelum socket siap ditangani di sini.
  sock.ev.on("connection.update", async (update: BaileysEventMap["connection.update"]) => {
    if (pairingSignal && !sock.authState.creds.registered) {
      const { connection } = update;
      if (connection === "connecting" || connection === undefined) {
        const { phoneNumber, resolve } = pairingSignal;
        pairingSignal = null;
        const code = (await handle?.requestPairing(phoneNumber)) ?? null;
        resolve(code);
      }
    }
  });

  return handle;
}

function credsToMe(creds: AuthenticationCreds): string | null {
  return (creds.me?.id || "").split(":")[0] || null;
}

/** Nomor WA buyer (62xxx) → JID penuh. */
export function phoneToJid(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

/** Kirim teks ke nomor buyer. Return true kalau sukses. */
export async function sendWaText(phoneNumber: string, text: string): Promise<boolean> {
  if (!handle?.state.connected) return false;
  try {
    await handle.sock.sendMessage(phoneToJid(phoneNumber), { text });
    return true;
  } catch (error) {
    console.error("[wa] kirim gagal:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function stopWaBot() {
  handle?.end();
  handle = null;
}
