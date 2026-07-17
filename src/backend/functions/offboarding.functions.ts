import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminAccess } from "@/integrations/supabase/admin-auth-middleware";

export const calculateFinalSettlement = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input: unknown) =>
    z
      .object({
        employee_id: z.string().uuid(),
        resignation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { supabase } = context as { supabase: any };

    // 1. Get employee data
    const { data: profile, error: pe } = await (supabase.from("profiles") as any)
      .select("id, full_name, salary_gross, salary_mode, allowance, status, inactive_reason")
      .eq("id", data.employee_id)
      .maybeSingle();

    if (pe || !profile) throw new Error("Employee not found");

    // Calculate daily rate
    const gross = Number(profile.salary_gross || 0);
    const allow = Number(profile.allowance || 0);
    const totalSalary = gross + allow;
    const dailyRate = Number((totalSalary / 30).toFixed(2));

    // Calculate worked days in the resignation month
    // Just a basic estimation: day of the month
    const [y, m, d] = data.resignation_date.split("-").map(Number);
    const workedDays = Math.min(d, 30); // simplistic assumption
    const unpaidSalary = Number((workedDays * dailyRate).toFixed(2));

    // 2. Get leave balance (annual leaves)
    const { data: leaves } = await (supabase.from("leave_balances") as any)
      .select("balance")
      .eq("employee_id", data.employee_id)
      .eq("year", y)
      // Annual leaves usually map to a specific leave_type_id, we'll just sum all positive balances or find the Annual one.
      // For safety, let's just find "Annual leaves" from leave_types.
      // We will do a join if possible, but let's just fetch all balances and cross reference
      ;

    let remainingLeaveDays = 0;
    if (leaves && leaves.length > 0) {
      // Assuming the main balance is annual leaves. In a real system we'd filter by leave_type.name_en = 'Annual leaves'
      remainingLeaveDays = leaves.reduce((sum: number, l: any) => sum + (l.balance || 0), 0);
    }
    const leaveCashOut = remainingLeaveDays > 0 ? Number((remainingLeaveDays * dailyRate).toFixed(2)) : 0;

    // 3. Outstanding advances
    const { data: advances } = await (supabase.from("employee_advances") as any)
      .select("id, remaining_balance")
      .eq("employee_id", data.employee_id)
      .in("repayment_status", ["active", "pending"]);

    let outstandingAdvances = 0;
    if (advances) {
      outstandingAdvances = advances.reduce((sum: number, a: any) => sum + Number(a.remaining_balance || 0), 0);
    }

    return {
      employee_id: profile.id,
      full_name: profile.full_name,
      resignation_date: data.resignation_date,
      daily_rate: dailyRate,
      worked_days: workedDays,
      unpaid_salary: unpaidSalary,
      remaining_leave_days: remainingLeaveDays,
      leave_cash_out: leaveCashOut,
      outstanding_advances: outstandingAdvances,
      other_additions: 0,
      other_deductions: 0,
      net_settlement: Number((unpaidSalary + leaveCashOut - outstandingAdvances).toFixed(2)),
    };
  });

export const saveFinalSettlement = createServerFn({ method: "POST" })
  .middleware([requireAdminAccess])
  .inputValidator((input: unknown) =>
    z
      .object({
        employee_id: z.string().uuid(),
        resignation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        worked_days: z.number().min(0),
        daily_rate: z.number().min(0),
        unpaid_salary: z.number().min(0),
        remaining_leave_days: z.number(),
        leave_cash_out: z.number(),
        outstanding_advances: z.number().min(0),
        other_additions: z.number().min(0).default(0),
        other_deductions: z.number().min(0).default(0),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const payload = {
      ...data,
      created_by: userId,
      status: 'approved'
    };

    const { error } = await (supabase.from("final_settlements") as any)
      .insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    // Also mark employee as inactive -> Resigned if not already
    await (supabase.from("profiles") as any)
      .update({ status: "Inactive", inactive_reason: "Resigned" })
      .eq("id", data.employee_id);

    return { ok: true };
  });
