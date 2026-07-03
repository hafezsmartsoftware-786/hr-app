import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";

const DaysSchema = z.array(z.number().int().min(0).max(6));
const DatesSchema = z.array(z.number().int().min(1).max(31));

export const getEmployeeWorkingDays = createServerFn({ method: "GET" })
  .middleware([requireAdminAccess])
  .inputValidator((i) => z.object({ employee_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("employee_working_days")
      .select("scope, year, month, days")
      .eq("employee_id", data.employee_id);
    if (error) throw new Error(error.message);
    const weekly = (rows ?? []).find((r: any) => r.scope === "weekly");
    const months = (rows ?? [])
      .filter((r: any) => r.scope === "month")
      .map((r: any) => ({ year: r.year as number, month: r.month as number, days: (r.days ?? []) as number[] }));
    const dateOn = (rows ?? [])
      .filter((r: any) => r.scope === "date_on")
      .map((r: any) => ({ year: r.year as number, month: r.month as number, days: (r.days ?? []) as number[] }));
    const dateOff = (rows ?? [])
      .filter((r: any) => r.scope === "date_off")
      .map((r: any) => ({ year: r.year as number, month: r.month as number, days: (r.days ?? []) as number[] }));
    return {
      weekly: (weekly?.days ?? [0, 1, 2, 3, 4]) as number[],
      months,
      dateOn,
      dateOff,
    };
  });

export const setEmployeeWorkingDaysWeekly = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) =>
    z
      .object({ employee_id: z.string().uuid(), days: DaysSchema })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const uniqueDays = Array.from(new Set(data.days)).sort();
    const sb = context.supabase as any;
    const { error } = await sb
      .from("employee_working_days")
      .upsert(
        { employee_id: data.employee_id, scope: "weekly", year: null, month: null, days: uniqueDays },
        { onConflict: "employee_id,scope" } as any,
      );
    if (error) {
      // Fallback: manual delete+insert if partial-index upsert isn't honored
      const { error: delErr } = await sb
        .from("employee_working_days")
        .delete()
        .eq("employee_id", data.employee_id)
        .eq("scope", "weekly");
      if (delErr) throw new Error(delErr.message);
      const { error: insErr } = await sb
        .from("employee_working_days")
        .insert({ employee_id: data.employee_id, scope: "weekly", days: uniqueDays });
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });

export const setEmployeeWorkingDaysMonth = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) =>
    z
      .object({
        employee_id: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
        days: DaysSchema,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const uniqueDays = Array.from(new Set(data.days)).sort();
    const sb = context.supabase as any;
    const { error: delErr } = await sb
      .from("employee_working_days")
      .delete()
      .eq("employee_id", data.employee_id)
      .eq("scope", "month")
      .eq("year", data.year)
      .eq("month", data.month);
    if (delErr) throw new Error(delErr.message);
    const { error: insErr } = await sb.from("employee_working_days").insert({
      employee_id: data.employee_id,
      scope: "month",
      year: data.year,
      month: data.month,
      days: uniqueDays,
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

export const clearEmployeeWorkingDaysMonth = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) =>
    z
      .object({
        employee_id: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb
      .from("employee_working_days")
      .delete()
      .eq("employee_id", data.employee_id)
      .eq("scope", "month")
      .eq("year", data.year)
      .eq("month", data.month);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Per-date overrides: forces specific days (day-of-month 1..31) ON or OFF
// for a given (year, month), overriding the weekday-level pattern.
export const setEmployeeWorkingDaysDates = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((i) =>
    z
      .object({
        employee_id: z.string().uuid(),
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
        on_days: DatesSchema,
        off_days: DatesSchema,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const onDays = Array.from(new Set(data.on_days)).sort((a, b) => a - b);
    const offDays = Array.from(new Set(data.off_days.filter((d) => !onDays.includes(d)))).sort((a, b) => a - b);

    for (const scope of ["date_on", "date_off"] as const) {
      const { error: delErr } = await sb
        .from("employee_working_days")
        .delete()
        .eq("employee_id", data.employee_id)
        .eq("scope", scope)
        .eq("year", data.year)
        .eq("month", data.month);
      if (delErr) throw new Error(delErr.message);
    }
    if (onDays.length > 0) {
      const { error } = await sb.from("employee_working_days").insert({
        employee_id: data.employee_id,
        scope: "date_on",
        year: data.year,
        month: data.month,
        days: onDays,
      });
      if (error) throw new Error(error.message);
    }
    if (offDays.length > 0) {
      const { error } = await sb.from("employee_working_days").insert({
        employee_id: data.employee_id,
        scope: "date_off",
        year: data.year,
        month: data.month,
        days: offDays,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });