import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env", { supabaseUrl, supabaseKey: !!supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  // Get some departments
  const { data: depts } = await supabase.from('departments').select('id, name_en').limit(5);
  if (!depts || depts.length === 0) {
    console.log("No departments found");
    return;
  }

  // Get some positions
  const { data: pos } = await supabase.from('positions').select('id, name_en').limit(10);
  if (!pos || pos.length === 0) {
    console.log("No positions found");
    return;
  }

  // Generate manpower plans
  const plans = [];
  const year = new Date().getFullYear();
  
  for (const dept of depts) {
    const numPos = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numPos; i++) {
      const p = pos[Math.floor(Math.random() * pos.length)];
      plans.push({
        fiscal_year: year,
        department_id: dept.id,
        position_id: p.id,
        planned_headcount: Math.floor(Math.random() * 5) + 1,
        employment_type: 'Full-Time',
        hiring_priority: 'High',
        status: 'Approved',
        estimated_annual_cost: Math.floor(Math.random() * 50000) + 30000
      });
    }
  }

  const { error } = await supabase.from('manpower_plans').insert(plans);
  if (error) {
    console.error("Failed to seed manpower plans:", error);
  } else {
    console.log(`Successfully seeded ${plans.length} manpower plans.`);
  }
}

seed();
