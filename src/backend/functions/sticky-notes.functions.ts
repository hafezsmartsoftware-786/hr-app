import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaffAccess } from "@/integrations/supabase/admin-auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  .inputValidator((i) =>
    z
      .object({
        search: z.string().optional(),
        sort: z.enum(["newest", "oldest"]).default("newest"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
      .optional()
      .default({})
      .parse(i)
  )
  .handler(async ({ data, context }) => {
    let query = (context.supabase as any)
      .from("sticky_notes")
      .select("*", { count: "exact" })
      .eq("profile_id", context.userId);

    if (data.search) {
      query = query.or(`title.ilike.%${data.search}%,content.ilike.%${data.search}%`);
    }

    query = query.order("updated_at", { ascending: data.sort === "oldest" });

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    
    return {
      notes: (rows ?? []) as StickyNote[],
      count: count ?? 0,
      page: data.page,
      limit: data.limit,
    };
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

export const adminListStickyNotes = createServerFn({ method: "POST" })
  .middleware([requireStaffAccess])
  .inputValidator((i) => z.object({ profile_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("sticky_notes")
      .select("*")
      .eq("profile_id", data.profile_id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows as StickyNote[];
  });

export const adminCreateStickyNote = createServerFn({ method: "POST" })
  .middleware([requireStaffAccess])
  .inputValidator((i) =>
    z.object({
      profile_id: z.string().uuid(),
      color: ColorSchema.optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (supabaseAdmin as any)
      .from("sticky_notes")
      .insert({
        profile_id: data.profile_id,
        title: "",
        content: "",
        color: data.color ?? "bg-yellow-200",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as StickyNote;
  });

export const adminUpdateStickyNote = createServerFn({ method: "POST" })
  .middleware([requireStaffAccess])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().max(200).nullable().optional(),
      content: z.string().max(10000).nullable().optional(),
      color: ColorSchema.optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await (supabaseAdmin as any)
      .from("sticky_notes")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStickyNote = createServerFn({ method: "POST" })
  .middleware([requireStaffAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (supabaseAdmin as any)
      .from("sticky_notes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });