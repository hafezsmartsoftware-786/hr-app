/**
 * Append-only audit log for SMS send attempts. Writes bypass RLS via the
 * service-role client but the server function that calls into here is
 * already gated by requireAdminAccess.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SmsAuditRow = {
  id: string;
  created_at: string;
  sent_by: string | null;
  mobile: string;
  message: string;
  kind: string;
  ok: boolean;
  provider_code: string | null;
  sms_id: string | null;
  cost: string | null;
  error: string | null;
};

export async function logSmsAudit(input: {
  sent_by?: string | null;
  mobile: string;
  message: string;
  kind?: "test" | "otp" | "notification" | "other";
  ok: boolean;
  provider_code?: string | null;
  sms_id?: string | null;
  cost?: string | null;
  error?: string | null;
}) {
  try {
    const { error } = await (supabaseAdmin as any).from("sms_audit").insert({
      sent_by: input.sent_by ?? null,
      mobile: input.mobile,
      message: input.message,
      kind: input.kind ?? "test",
      ok: input.ok,
      provider_code: input.provider_code ?? null,
      sms_id: input.sms_id ?? null,
      cost: input.cost ?? null,
      error: input.error ?? null,
    });
    if (error) console.warn("sms_audit insert failed", error.message);
  } catch (e: any) {
    console.warn("sms_audit insert threw", e?.message);
  }
}

export async function loadLastSmsAudit(): Promise<SmsAuditRow | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from("sms_audit")
    .select("id, created_at, sent_by, mobile, message, kind, ok, provider_code, sms_id, cost, error")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Table may not exist yet if the migration has not been run.
    console.warn("sms_audit read failed", error.message);
    return null;
  }
  return (data as SmsAuditRow) ?? null;
}

export async function loadRecentSmsAudit(opts: { kind?: string; limit?: number } = {}): Promise<SmsAuditRow[]> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  let q = (supabaseAdmin as any)
    .from("sms_audit")
    .select("id, created_at, sent_by, mobile, message, kind, ok, provider_code, sms_id, cost, error")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.kind) q = q.eq("kind", opts.kind);
  const { data, error } = await q;
  if (error) {
    console.warn("sms_audit list failed", error.message);
    return [];
  }
  return (data as SmsAuditRow[]) ?? [];
}