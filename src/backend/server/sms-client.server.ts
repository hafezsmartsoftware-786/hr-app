/**
 * Thin SMS Misr HTTP client. Runs server-side (Cloudflare Worker) so raw
 * credentials never reach the browser.
 *
 * API contract (from https://smsmisr.com/api/SMS/):
 *   environment: "1" (test) | "2" (live)
 *   language:    "1" Arabic | "2" English | "3" Unicode
 *   mobile:      comma-separated E.164-ish numbers (e.g. "2011XXXXXXX")
 *   Success reply: { code: "1901", SMSID: "...", Cost: "..." }
 */
export type SmsAuth = {
  environment: "1" | "2";
  username: string;
  password: string;
  sender: string;
};

export type SmsSendInput = {
  mobile: string | string[];
  message: string;
  language?: "1" | "2" | "3";
  delayUntil?: string; // YYYYMMDDHHmm
};

export type SmsSendResult = {
  ok: boolean;
  code?: string;
  smsId?: string;
  cost?: string;
  raw?: unknown;
  error?: string;
};

export async function sendSmsMisr(auth: SmsAuth, msg: SmsSendInput): Promise<SmsSendResult> {
  if (!auth.username || !auth.password || !auth.sender) {
    return { ok: false, error: "SMS not configured (username/password/sender missing)" };
  }
  const mobile = Array.isArray(msg.mobile) ? msg.mobile.join(",") : msg.mobile;
  if (!mobile) return { ok: false, error: "No recipient" };
  const body = new URLSearchParams({
    environment: auth.environment,
    username: auth.username,
    password: auth.password,
    sender: auth.sender,
    mobile,
    language: msg.language ?? "1",
    message: msg.message,
  });
  if (msg.delayUntil) body.set("DelayUntil", msg.delayUntil);

  try {
    const res = await fetch("https://smsmisr.com/api/SMS/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}`, raw: parsed ?? text };
    const code = String(parsed?.code ?? "");
    // "1901" = success per SMS Misr docs; any other code is a provider-side error.
    const ok = code === "1901";
    return { ok, code, smsId: parsed?.SMSID, cost: parsed?.Cost, raw: parsed ?? text, error: ok ? undefined : `Provider code ${code || "unknown"}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}