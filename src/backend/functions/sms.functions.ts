import { createServerFn } from "@tanstack/react-start";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";
import { SmsConfigSchema, SmsSendSchema } from "../schemas";

export const getSmsConfig = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async () => {
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const cfg = await loadSmsConfig();
    if (!cfg) {
      return { environment: "2" as const, username: "", sender: "", language: "1" as const, enabled: false, has_password: false, has_api_key: false };
    }
    // Never return the password itself; UI shows whether one is stored.
    return {
      environment: cfg.environment,
      username: cfg.username,
      sender: cfg.sender,
      language: cfg.language,
      enabled: cfg.enabled,
      has_password: cfg.password.length > 0,
      has_api_key: cfg.api_key.length > 0,
    };
  });

export const saveSmsConfig = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => SmsConfigSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { writeSmsConfig } = await import("../server/sms-config.server");
    await writeSmsConfig({ ...data, updated_by: context.userId });
    return { ok: true };
  });

export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => SmsSendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const { sendSmsEpush, validateSmsAuth } = await import("../server/sms-client.server");
    const { logSmsAudit } = await import("../server/sms-audit.server");
    const cfg = await loadSmsConfig();
    if (!cfg || !cfg.enabled) {
      await logSmsAudit({
        sent_by: context.userId, mobile: data.mobile, message: data.message,
        kind: "test", ok: false, error: "SMS is disabled or not configured",
      });
      return { ok: false, error: "SMS is disabled or not configured" };
    }
    const authErr = cfg ? validateSmsAuth({ username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender }) : "SMS is not configured";
    if (authErr) {
      await logSmsAudit({ sent_by: context.userId, mobile: data.mobile, message: data.message, kind: "test", ok: false, error: authErr });
      return { ok: false, error: authErr };
    }
    const r = await sendSmsEpush(
      { environment: cfg.environment, username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender },
      { mobile: data.mobile, message: data.message, language: data.language ?? cfg.language, delayUntil: data.delayUntil },
    );
    await logSmsAudit({
      sent_by: context.userId, mobile: data.mobile, message: data.message, kind: "test",
      ok: r.ok, provider_code: r.code ?? null, sms_id: r.smsId ?? null, cost: r.cost ?? null, error: r.error ?? null,
    });
    return { ok: r.ok, code: r.code ?? null, smsId: r.smsId ?? null, cost: r.cost ?? null, error: r.error ?? null };
  });

export const getLastSmsAudit = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async () => {
    const { loadLastSmsAudit } = await import("../server/sms-audit.server");
    return await loadLastSmsAudit();
  });

export const listRecentOtpAudits = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => {
    const o = (input ?? {}) as { limit?: unknown };
    const limit = typeof o.limit === "number" ? Math.min(100, Math.max(1, o.limit)) : 20;
    return { limit };
  })
  .handler(async ({ data }) => {
    const { loadRecentSmsAudit } = await import("../server/sms-audit.server");
    return await loadRecentSmsAudit({ kind: "otp", limit: data.limit });
  });

/**
 * Convenience: send a 4-6 digit OTP. Caller controls where the code is stored.
 * Returns the generated code so the caller can persist / hash it.
 */
export const sendOtpSms = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => {
    const o = (input ?? {}) as { mobile?: unknown; digits?: unknown; template?: unknown };
    const mobile = typeof o.mobile === "string" ? o.mobile.trim() : "";
    if (!/^\+?\d{6,15}(,\s*\+?\d{6,15})*$/.test(mobile)) throw new Error("Invalid mobile number");
    const digits = typeof o.digits === "number" ? Math.min(8, Math.max(4, o.digits)) : 6;
    const template = typeof o.template === "string" && o.template.includes("{code}")
      ? o.template
      : "Your verification code is {code}";
    return { mobile, digits, template };
  })
  .handler(async ({ data, context }) => {
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const { sendSmsEpush, validateSmsAuth, normalizeRecipients } = await import("../server/sms-client.server");
    const { logSmsAudit, checkOtpRateLimit } = await import("../server/sms-audit.server");
    const cfg = await loadSmsConfig();
    // Rate-limit per (normalized) mobile so a bad UI can't spam OTPs.
    const rec = normalizeRecipients(data.mobile);
    if (rec.invalid.length) {
      return { ok: false, error: `Invalid mobile: ${rec.invalid.join(", ")}. Use 201XXXXXXXXX or 01XXXXXXXXX.`, code: null };
    }
    const rl = await checkOtpRateLimit(rec.mobile, { cooldownSec: 60, maxPerHour: 5 });
    if (!rl.allowed) {
      await logSmsAudit({ sent_by: context.userId, mobile: rec.mobile, message: "(rate-limited)", kind: "otp", ok: false, error: rl.reason });
      return { ok: false, error: rl.reason, retryAfter: rl.retryAfter, code: null };
    }
    const code = Array.from({ length: data.digits }, () => Math.floor(Math.random() * 10)).join("");
    const message = data.template.replace("{code}", code);
    if (!cfg || !cfg.enabled) {
      await logSmsAudit({
        sent_by: context.userId, mobile: data.mobile, message, kind: "otp",
        ok: false, error: "SMS is disabled or not configured",
      });
      return { ok: false, error: "SMS is disabled or not configured", code: null };
    }
    const authErr = validateSmsAuth({ username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender });
    if (authErr) {
      await logSmsAudit({ sent_by: context.userId, mobile: data.mobile, message, kind: "otp", ok: false, error: authErr });
      return { ok: false, error: authErr, code: null };
    }
    const res = await sendSmsEpush(
      { environment: cfg.environment, username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender },
      { mobile: data.mobile, message, language: cfg.language },
    );
    await logSmsAudit({
      sent_by: context.userId, mobile: data.mobile, message, kind: "otp",
      ok: res.ok, provider_code: res.code ?? null, sms_id: res.smsId ?? null,
      cost: res.cost ?? null, error: res.error ?? null,
    });
    return {
      ok: res.ok,
      providerCode: res.code ?? null,
      smsId: res.smsId ?? null,
      cost: res.cost ?? null,
      error: res.error ?? null,
      code: res.ok ? code : null,
    };
  });

export const listEmployeesWithWelcomeSmsStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => {
    const o = (input ?? {}) as { q?: unknown; statusFilter?: unknown; page?: unknown; pageSize?: unknown };
    return {
      q: typeof o.q === "string" ? o.q.trim().toLowerCase() : "",
      statusFilter: typeof o.statusFilter === "string" ? o.statusFilter : "",
      page: typeof o.page === "number" ? Math.max(1, o.page) : 1,
      pageSize: typeof o.pageSize === "number" ? Math.min(200, Math.max(1, o.pageSize)) : 25,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadWelcomeSmsAudits } = await import("../server/sms-audit.server");
    const { normalizeEpushMobile } = await import("../server/sms-client.server");

    // Load profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, emp_code, status")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const auditsByMobile = await loadWelcomeSmsAudits();

    const items = (profiles ?? []).map((p: any) => {
      const rawPhone = p.phone || "";
      const normalizedPhone = normalizeEpushMobile(rawPhone);
      const audit = normalizedPhone ? auditsByMobile[normalizedPhone] : null;

      let smsStatus: "sent" | "failed" | "not_sent" = "not_sent";
      if (audit) {
        smsStatus = audit.ok ? "sent" : "failed";
      }

      return {
        id: p.id,
        full_name: p.full_name || "—",
        email: p.email || "—",
        phone: rawPhone,
        normalizedPhone,
        emp_code: p.emp_code || null,
        avatar_url: p.avatar_url || null,
        status: p.status || "Active",
        smsStatus,
        lastSentAt: audit ? audit.created_at : null,
        lastError: audit && !audit.ok ? audit.error : null,
        lastSmsId: audit?.sms_id || null,
      };
    });

    // Filter
    let filtered = items;
    if (data.q) {
      filtered = filtered.filter(
        (item) =>
          item.full_name.toLowerCase().includes(data.q) ||
          item.email.toLowerCase().includes(data.q) ||
          item.phone.toLowerCase().includes(data.q) ||
          (item.emp_code && item.emp_code.toLowerCase().includes(data.q))
      );
    }
    if (data.statusFilter) {
      filtered = filtered.filter((item) => item.smsStatus === data.statusFilter);
    }

    const total = filtered.length;
    const start = (data.page - 1) * data.pageSize;
    const paginated = filtered.slice(start, start + data.pageSize);

    return { rows: paginated, total, grandTotal: items.length, page: data.page, pageSize: data.pageSize };
  });

export const sendEmployeeWelcomeSms = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => {
    const o = (input ?? {}) as { mobile?: unknown; email?: unknown; password?: unknown; loginUrl?: unknown; customMessage?: unknown };
    const mobile = typeof o.mobile === "string" ? o.mobile.trim() : "";
    const email = typeof o.email === "string" ? o.email.trim() : "";
    const password = typeof o.password === "string" ? o.password.trim() : "";
    const loginUrl = typeof o.loginUrl === "string" && o.loginUrl.trim() ? o.loginUrl.trim() : typeof window !== "undefined" ? window.location.origin : "";
    const customMessage = typeof o.customMessage === "string" ? o.customMessage.trim() : "";
    if (!mobile) throw new Error("Mobile number is required");
    return { mobile, email, password, loginUrl, customMessage };
  })
  .handler(async ({ data, context }) => {
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const { sendSmsEpush, validateSmsAuth, normalizeRecipients } = await import("../server/sms-client.server");
    const { logSmsAudit } = await import("../server/sms-audit.server");

    const cfg = await loadSmsConfig();

    const rec = normalizeRecipients(data.mobile);
    if (!rec.ok || rec.invalid.length > 0) {
      return { ok: false, error: `Invalid mobile number: ${data.mobile}. Must be Egyptian format (e.g. 01XXXXXXXXX).` };
    }

    const defaultMsg = data.password
      ? `welcome to Integrated technics your user name is ${data.email} and password ${data.password} and ${data.loginUrl} , thanks\nHR department`
      : `welcome to Integrated technics your user name is ${data.email} and ${data.loginUrl} , thanks\nHR department`;
    const message = data.customMessage || defaultMsg;

    if (!cfg || !cfg.enabled) {
      await logSmsAudit({
        sent_by: context.userId,
        mobile: rec.mobile,
        message,
        kind: "welcome",
        ok: false,
        error: "SMS service is disabled or not configured in Settings -> SMS",
      });
      return { ok: false, error: "SMS service is disabled or not configured in Settings -> SMS" };
    }

    const authErr = validateSmsAuth({ username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender });
    if (authErr) {
      await logSmsAudit({ sent_by: context.userId, mobile: rec.mobile, message, kind: "welcome", ok: false, error: authErr });
      return { ok: false, error: authErr };
    }

    const res = await sendSmsEpush(
      { environment: cfg.environment, username: cfg.username, password: cfg.password, apiKey: cfg.api_key, sender: cfg.sender },
      { mobile: rec.mobile, message, language: cfg.language }
    );

    await logSmsAudit({
      sent_by: context.userId,
      mobile: rec.mobile,
      message,
      kind: "welcome",
      ok: res.ok,
      provider_code: res.code ?? null,
      sms_id: res.smsId ?? null,
      cost: res.cost ?? null,
      error: res.error ?? null,
    });

    return {
      ok: res.ok,
      providerCode: res.code ?? null,
      smsId: res.smsId ?? null,
      cost: res.cost ?? null,
      error: res.error ?? null,
    };
  });