/**
 * Loads / writes the singleton SMS Misr configuration.
 * Server-only. RLS on public.sms_config restricts reads to admin/hr, but this
 * file uses supabaseAdmin so the server function can consult the row after
 * verifying the caller via requireAdminAccess.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LoadedSms = {
  environment: "1" | "2";
  username: string;
  password: string;
  sender: string;
  language: "1" | "2" | "3";
  enabled: boolean;
};

export async function loadSmsConfig(): Promise<LoadedSms | null> {
  const { data, error } = await supabaseAdmin
    .from("sms_config")
    .select("environment, username, password, sender, language, enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    environment: (data.environment as "1" | "2") ?? "2",
    username: data.username ?? "",
    password: data.password ?? "",
    sender: data.sender ?? "",
    language: (data.language as "1" | "2" | "3") ?? "1",
    enabled: !!data.enabled,
  };
}

export async function writeSmsConfig(input: {
  environment: "1" | "2";
  username: string;
  password?: string; // optional: only overwrite when a non-empty value is supplied
  sender: string;
  language: "1" | "2" | "3";
  enabled: boolean;
  updated_by?: string;
}) {
  const patch: Record<string, unknown> = {
    id: 1,
    environment: input.environment,
    username: input.username,
    sender: input.sender,
    language: input.language,
    enabled: input.enabled,
    updated_by: input.updated_by ?? null,
    updated_at: new Date().toISOString(),
  };
  if (typeof input.password === "string" && input.password.length > 0) {
    patch.password = input.password;
  }
  const { error } = await supabaseAdmin.from("sms_config").upsert(patch, { onConflict: "id" });
  if (error) throw new Error(error.message);
}