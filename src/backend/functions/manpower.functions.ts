import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";

const ManpowerPlanSchema = z.object({
  id: z.string().optional(),
  fiscal_year: z.number().int(),
  company: z.string().optional(),
  branch: z.string().optional(),
  department_id: z.string().optional().nullable(),
  section_id: z.string().optional().nullable(),
  position_id: z.string().optional().nullable(),
  job_grade_id: z.string().optional().nullable(),
  planned_headcount: z.number().int().min(1),
  employment_type: z.string().optional().nullable(),
  hiring_reason: z.string().optional().nullable(),
  priority: z.enum(["High", "Medium", "Low"]).optional().nullable(),
  required_date: z.string().optional().nullable(),
  salary_from: z.number().optional().nullable(),
  salary_to: z.number().optional().nullable(),
  currency: z.string().optional(),
  budget_available: z.boolean().optional(),
  budget_approved: z.boolean().optional(),
  cost_center: z.string().optional().nullable(),
  estimated_annual_cost: z.number().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

// GET all manpower data
export const getManpowerData = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) =>
    z.object({
      fiscal_year: z.number().int().optional(),
      department_id: z.string().optional(),
      status: z.string().optional(),
      branch: z.string().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [deptRes, sectRes, posRes, gradeRes] = await Promise.all([
      supabase.from("departments").select("id, name_en"),
      (supabase as any).from("sections").select("id, name_en, department_id"),
      supabase.from("positions").select("id, name_en"),
      (supabase as any).from("job_grades").select("id, name_en"),
    ]);

    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name_en]));
    const sectMap = new Map((sectRes.data || []).map((s: any) => [s.id, s.name_en]));
    const posMap  = new Map((posRes.data || []).map((p: any) => [p.id, p.name_en]));
    const gradeMap = new Map((gradeRes.data || []).map((g: any) => [g.id, g.name_en]));

    let query = (supabase as any)
      .from("manpower_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (data.fiscal_year) query = query.eq("fiscal_year", data.fiscal_year);
    if (data.department_id) query = query.eq("department_id", data.department_id);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.branch && data.branch !== "all") query = query.eq("branch", data.branch);

    const { data: plans } = await query;

    const { data: headcounts } = await (supabase as any)
      .from("vw_current_headcount")
      .select("department_id, section_id, position_id, current_headcount");

    const hcMap = new Map(
      (headcounts || []).map((h: any) =>
        [`${h.department_id}|${h.section_id || ""}|${h.position_id}`, h.current_headcount]
      )
    );

    const enriched = (plans || []).map((p: any) => {
      const key = `${p.department_id || ""}|${p.section_id || ""}|${p.position_id || ""}`;
      const currentHeadcount = hcMap.get(key) || 0;
      return {
        ...p,
        departmentName: deptMap.get(p.department_id) || "—",
        sectionName: sectMap.get(p.section_id) || "—",
        positionName: posMap.get(p.position_id) || "—",
        jobGradeName: gradeMap.get(p.job_grade_id) || "—",
        currentHeadcount,
        vacancies: Math.max(0, (p.planned_headcount as number) - (currentHeadcount as number)),
      };
    });

    const totalPlanned = enriched.reduce((s: number, p: any) => s + p.planned_headcount, 0);
    const totalCurrent = enriched.reduce((s: number, p: any) => s + p.currentHeadcount, 0);
    const totalVacancies = enriched.reduce((s: number, p: any) => s + p.vacancies, 0);
    const pendingApprovals = enriched.filter((p: any) =>
      ["Pending Dept Manager", "Pending HR", "Pending Finance", "Pending Executive"].includes(p.status)
    ).length;

    return {
      plans: enriched,
      kpis: { totalPlanned, totalCurrent, totalVacancies, pendingApprovals },
      lookups: {
        departments: deptRes.data || [],
        sections: sectRes.data || [],
        positions: posRes.data || [],
        jobGrades: gradeRes.data || [],
      },
    };
  });

// UPSERT a plan
export const upsertManpowerPlan = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => ManpowerPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...fields } = data;
    if (id) {
      const { error } = await (supabase as any)
        .from("manpower_plans")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await (supabase as any)
        .from("manpower_plans")
        .insert(fields)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

// DELETE a plan
export const deleteManpowerPlan = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase as any)
      .from("manpower_plans")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// UPDATE status
export const updateManpowerStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input) =>
    z.object({ id: z.string(), status: z.string() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase as any)
      .from("manpower_plans")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Aliases for backward compatibility with ManpowerDashboard component
export const listManpowerPlans = getManpowerData;
export const getManpowerStats = getManpowerData;
