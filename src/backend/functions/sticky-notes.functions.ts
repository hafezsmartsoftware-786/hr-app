import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STICKY_COLORS = [
  "bg-yellow-200",
  "bg-pink-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-purple-200",
  "bg-orange-200",
] as const;

const ColorSchema = z.enum(STICKY_COLORS);

export type StickyNote = {
  id: string;
  profile_id: string;
  title: string | null;
  content: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export const listStickyNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("sticky_notes")
      .select("*")
      .eq("profile_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as StickyNote[];
  });

export const createStickyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        title: z.string().max(200).optional().nullable(),
        content: z.string().max(10000).optional().nullable(),
        color: ColorSchema.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("sticky_notes")
      .insert({
        profile_id: context.userId,
        title: data.title ?? null,
        content: data.content ?? null,
        color: data.color ?? "bg-yellow-200",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as StickyNote;
  });

export const updateStickyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().max(200).nullable().optional(),
        content: z.string().max(10000).nullable().optional(),
        color: ColorSchema.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await (context.supabase as any)
      .from("sticky_notes")
      .update(patch)
      .eq("id", id)
      .eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStickyNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("sticky_notes")
      .delete()
      .eq("id", data.id)
      .eq("profile_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });