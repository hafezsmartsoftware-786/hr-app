import { createServerFn } from "@tanstack/react-start";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";
import { SmsConfigSchema, SmsSendSchema } from "../schemas";

export const getSmsConfig = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async () => {
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const cfg = await loadSmsConfig();
    if (!cfg) {
      return { environment: "2" as const, username: "", sender: "", language: "1" as const, enabled: false, has_password: false };
    }
    // Never return the password itself; UI shows whether one is stored.
    return {
      environment: cfg.environment,
      username: cfg.username,
      sender: cfg.sender,
      language: cfg.language,
      enabled: cfg.enabled,
      has_password: cfg.password.length > 0,
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
    const { sendSmsMisr } = await import("../server/sms-client.server");
    const { logSmsAudit } = await import("../server/sms-audit.server");
    const cfg = await loadSmsConfig();
    if (!cfg || !cfg.enabled) {
      await logSmsAudit({
        sent_by: context.userId, mobile: data.mobile, message: data.message,
        kind: "test", ok: false, error: "SMS is disabled or not configured",
      });
      return { ok: false, error: "SMS is disabled or not configured" };
    }
    const r = await sendSmsMisr(
      { environment: cfg.environment, username: cfg.username, password: cfg.password, sender: cfg.sender },
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

/**
 * Convenience: send a 4-6 digit OTP. Caller controls where the code is stored.
 * Returns the generated code so the caller can persist / hash it.
 */
export const sendOtpSms = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => {
    const o = (input ?? {}) as { mobile?: unknown; digits?: unknown; template?: unknown };
    const mobile = typeof o.mobile === "string" ? o.mobile.trim() : "";
    if (!/^\+?\d{6,15}(,\s*\+?\d{6,15})*$/.test(mobile)) throw new Error("Invalid mobile");
    const digits = typeof o.digits === "number" ? Math.min(8, Math.max(4, o.digits)) : 6;
    const template = typeof o.template === "string" && o.template.includes("{code}")
      ? o.template
      : "Your verification code is {code}";
    return { mobile, digits, template };
  })
  .handler(async ({ data, context }) => {
    const code = Array.from({ length: data.digits }, () => Math.floor(Math.random() * 10)).join("");
    const { loadSmsConfig } = await import("../server/sms-config.server");
    const { sendSmsMisr } = await import("../server/sms-client.server");
    const { logSmsAudit } = await import("../server/sms-audit.server");
    const cfg = await loadSmsConfig();
    const message = data.template.replace("{code}", code);
    if (!cfg || !cfg.enabled) {
      await logSmsAudit({
        sent_by: context.userId, mobile: data.mobile, message, kind: "otp",
        ok: false, error: "SMS is disabled or not configured",
      });
      return { ok: false, error: "SMS is disabled or not configured", code: null };
    }
    const res = await sendSmsMisr(
      { environment: cfg.environment, username: cfg.username, password: cfg.password, sender: cfg.sender },
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