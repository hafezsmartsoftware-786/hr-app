import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";
import { NamedRowSchema, DistrictRowSchema, LeaveTypeRowSchema } from "../schemas";

type DepartmentUpsert = {
  id?: string;
  name_en: string;
  name_ar: string;
  active: boolean;
  responsible_person_id: string | null;
};

// ── Departments ────────────────────────────────────
export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("departments")
      .select("*, responsible_person_id")
      .order("name_en");
    if (error) throw new Error(error.message);
    return (data || []).map((d: any) => ({
      id: d.id,
      name_en: d.name_en,
      name_ar: d.name_ar,
      sort_order: d.sort_order ?? 0,
      parent_id: d.parent_id,
      responsible_person_id: d.responsible_person_id ?? null,
    }));
  });

export const upsertDepartment = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => NamedRowSchema.parse(i))
  .handler(async ({ data, context }) => {
    const row: any = {
      id: data.id,
      name_en: data.name_en,
      name_ar: data.name_ar,
      sort_order: data.sort_order,
      parent_id: data.parent_id || null,
      responsible_person_id: data.responsible_person_id || null,
      active: data.active ?? true,
    };
    const { error } = await (context.supabase.from("departments") as any).upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Department Positions ───────────────────────────
export const listDepartmentPositions = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ department_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: records, error } = await (context.supabase as any)
      .from("department_positions")
      .select(`
        id, department_id, section_id, position_id, job_grade_id, headcount,
        positions ( name_en, name_ar ),
        job_grades ( name_en, name_ar ),
        sections ( name_en, name_ar )
      `)
      .eq("department_id", data.department_id);
    if (error) throw new Error(error.message);
    return records ?? [];
  });

// ── Sections ───────────────────────────────────────
export const listSections = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ department_id: z.string().uuid().optional() }).optional().parse(i))
  .handler(async ({ data, context }) => {
    let query = (context.supabase as any)
      .from("sections")
      .select("*, departments(name_en)")
      .order("name_en");
    
    if (data?.department_id) {
      query = query.eq("department_id", data.department_id);
    }
    
    const { data: records, error } = await query;
    if (error) throw new Error(error.message);
    return records ?? [];
  });

export const upsertSection = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    department_id: z.string().uuid(),
    name_en: z.string().min(1),
    name_ar: z.string().min(1),
    active: z.boolean().default(true),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("sections").upsert({
      id: data.id,
      department_id: data.department_id,
      name_en: data.name_en,
      name_ar: data.name_ar,
      active: data.active
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertDepartmentPosition = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    department_id: z.string().uuid(),
    section_id: z.string().uuid().optional().nullable(),
    position_id: z.string().uuid(),
    job_grade_id: z.string().uuid(),
    headcount: z.number().int().min(1)
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("department_positions").upsert({
      id: data.id,
      department_id: data.department_id,
      section_id: data.section_id || null,
      position_id: data.position_id,
      job_grade_id: data.job_grade_id,
      headcount: data.headcount
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDepartmentPosition = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("department_positions" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Positions ──────────────────────────────────────
export const listPositions = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("positions").select("*").order("name_en");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
export const upsertPosition = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => NamedRowSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("positions").upsert({
      id: data.id, name_en: data.name_en, name_ar: data.name_ar, active: data.active ?? true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deletePosition = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Job Grades ──────────────────────────────────────
export const listJobGrades = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("job_grades" as any).select("*").order("name_en");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
export const upsertJobGrade = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => NamedRowSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_grades" as any).upsert({
      id: data.id, name_en: data.name_en, name_ar: data.name_ar, active: data.active ?? true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteJobGrade = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_grades" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Cities + Districts ─────────────────────────────
export const listCitiesWithDistricts = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async ({ context }) => {
    const { data: cities, error: ce } = await context.supabase.from("cities").select("*").order("name_en");
    if (ce) throw new Error(ce.message);
    const { data: districts, error: de } = await context.supabase.from("districts").select("*").order("name_en");
    if (de) throw new Error(de.message);
    return (cities ?? []).map((c) => ({
      ...c, districts: (districts ?? []).filter((d) => d.city_id === c.id),
    }));
  });
export const upsertCity = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => NamedRowSchema.omit({ active: true }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cities").upsert({
      id: data.id, name_en: data.name_en, name_ar: data.name_ar,
    });
    if (error) {
      if ((error as any).code === "23505") throw new Error(`City "${data.name_en}" already exists`);
      throw new Error(error.message);
    }
    return { ok: true };
  });
export const deleteCity = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const upsertDistrict = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => DistrictRowSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("districts").upsert({
      id: data.id, city_id: data.city_id, name_en: data.name_en, name_ar: data.name_ar,
    });
    if (error) {
      if ((error as any).code === "23505") throw new Error(`District "${data.name_en}" already exists in this city`);
      throw new Error(error.message);
    }
    return { ok: true };
  });
export const deleteDistrict = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("districts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Leave types ────────────────────────────────────
export const listLeaveTypes = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("leave_types").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
export const upsertLeaveType = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => LeaveTypeRowSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leave_types").upsert({
      id: data.id, name: data.name, annual_days: data.annual_days, paid: data.paid, active: data.active, requires_proof: data.requires_proof,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteLeaveType = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leave_types").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });