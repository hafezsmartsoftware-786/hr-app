/**
 * Thin ePush (epusheg.com) HTTP client. Runs server-side so credentials
 * never reach the browser.
 *
 * Endpoint: GET https://api.epusheg.com/api/v2/send_bulk
 * Required query params: username, password, api_key, from, to, message
 * Mobile format: 201XXXXXXXXX or 01XXXXXXXXX (comma-separated for bulk)
 */
export type SmsAuth = {
  environment: "1" | "2";
  username: string;
  password: string;
  apiKey: string;
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

/** Validate the ePush credential set and return a friendly error message if incomplete. */
export function validateSmsAuth(auth: Partial<SmsAuth>): string | null {
  const missing: string[] = [];
  if (!auth.username?.trim()) missing.push("username");
  if (!auth.password?.trim()) missing.push("password");
  if (!auth.apiKey?.trim()) missing.push("api key");
  if (!auth.sender?.trim()) missing.push("from / sender");
  if (missing.length) return `SMS is not configured — missing ${missing.join(", ")}. Ask an admin to complete Settings → SMS.`;
  return null;
}

/** Normalize an Egyptian mobile to the ePush accepted formats (201… or 01…). */
export function normalizeEpushMobile(input: string): string | null {
  let m = input.trim().replace(/[\s\-()]/g, "");
  if (m.startsWith("+")) m = m.slice(1);
  if (/^201\d{9}$/.test(m)) return m;
  if (/^01\d{9}$/.test(m)) return m;
  if (/^1\d{9}$/.test(m)) return `20${m}`; // missing leading 0
  return null;
}

/** Normalize one-or-many recipients. Returns { ok, mobile, invalid } */
export function normalizeRecipients(input: string | string[]): { ok: boolean; mobile: string; invalid: string[] } {
  const list = Array.isArray(input) ? input : input.split(",");
  const good: string[] = [];
  const bad: string[] = [];
  for (const raw of list) {
    const t = raw.trim();
    if (!t) continue;
    const n = normalizeEpushMobile(t);
    if (n) good.push(n); else bad.push(t);
  }
  return { ok: good.length > 0 && bad.length === 0, mobile: good.join(","), invalid: bad };
}

export async function sendSmsEpush(auth: SmsAuth, msg: SmsSendInput): Promise<SmsSendResult> {
  const authErr = validateSmsAuth(auth);
  if (authErr) return { ok: false, error: authErr };
  const rec = normalizeRecipients(msg.mobile);
  if (rec.invalid.length) {
    return { ok: false, error: `Invalid mobile number(s): ${rec.invalid.join(", ")}. Use 201XXXXXXXXX or 01XXXXXXXXX.` };
  }
  if (!rec.mobile) return { ok: false, error: "No recipient specified" };
  if (!msg.message?.trim()) return { ok: false, error: "Message body is empty" };

  const url = new URL("https://api.epusheg.com/api/v2/send_bulk");
  url.searchParams.set("username", auth.username);
  url.searchParams.set("password", auth.password);
  url.searchParams.set("api_key", auth.apiKey);
  url.searchParams.set("from", auth.sender);
  url.searchParams.set("to", rec.mobile);
  url.searchParams.set("message", msg.message);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* keep as text */ }
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}`, raw: parsed ?? text };
    const status = String(parsed?.status ?? parsed?.code ?? "").toLowerCase();
    const ok = status === "success" || status === "ok" || status === "1" || parsed?.success === true;
    const smsId = parsed?.message_id ?? parsed?.SMSID ?? parsed?.id ?? null;
    const cost = parsed?.cost ?? parsed?.Cost ?? null;
    const providerCode = parsed?.code ?? parsed?.status ?? null;
    return {
      ok,
      code: providerCode ? String(providerCode) : undefined,
      smsId: smsId ? String(smsId) : undefined,
      cost: cost != null ? String(cost) : undefined,
      raw: parsed ?? text,
      error: ok ? undefined : (parsed?.message ?? parsed?.error ?? `Provider status ${status || "unknown"}`),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// Backwards-compatible alias (old code path may still import this name).
export const sendSmsMisr = sendSmsEpush;