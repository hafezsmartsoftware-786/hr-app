import { supabaseAdmin } from "./src/backend/database/supabase";

async function run() {
  const { data: advances } = await supabaseAdmin.from("employee_advances").select("*").in("status", ["approved_for_payment", "paid"]);
  let fixedCount = 0;
  for (const adv of advances || []) {
    const { data: insts } = await supabaseAdmin.from("employee_advance_installments").select("id").eq("advance_id", adv.id);
    if (!insts || insts.length === 0) {
      const installments = [];
      const startDate = new Date(adv.deduction_start_date);
      for (let i = 0; i < adv.installment_count; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        installments.push({
          advance_id: adv.id,
          payroll_period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          installment_amount: adv.installment_amount,
          status: "pending",
        });
      }
      const insResult = await (supabaseAdmin as any).from("employee_advance_installments").insert(installments);
      if (insResult.error) {
         console.error("Insert error:", insResult.error);
      } else {
         console.log(`Fixed advance ${adv.id}, inserted ${installments.length} installments`);
         fixedCount++;
      }
    }
  }
  console.log(`Done. Fixed ${fixedCount} advances.`);
}
run().catch(console.error);
