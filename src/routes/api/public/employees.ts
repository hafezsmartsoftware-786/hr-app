import { createFileRoute } from "@tanstack/react-router";

/**
 * Public read-only employee directory API for external systems.
 * Auth: `x-api-key: <EMPLOYEE_API_KEY>` header (or `?api_key=`).
 * Never returns salary or banking data.
 */

type Row = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function authorized(request: Request) {
  const expected = process.env.EMPLOYEE_API_KEY || "";
  if (!expected) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-api-key") ||
    (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("api_key") ||
    "";
  return provided.length > 0 && provided === expected;
}

const FIELDS = [
  "id",
  "emp_code",
  "full_name",
  "email",
  "extra_email",
  "phone",
  "gender",
  "status",
  "inactive_reason",
  "role",
  "city",
  "district",
  "department_id",
  "section_id",
  "position_id",
  "job_grade",
  "manager_id",
  "national_id",
  "id_issue_date",
  "id_expiry_date",
  "contract_type",
  "contract_start_date",
  "contract_end_date",
  "contract_cancelled",
  "created_at",
  "updated_at",
].join(",");

function shape(p: Row, lookups: {
  departments: Map<string, string>;
  sections: Map<string, string>;
  positions: Map<string, string>;
  managers: Map<string, { id: string; full_name: string | null; email: string | null }>;
}) {
  const get = (k: string) => p[k] as never;
  return {
    id: p.id,
    emp_code: p.emp_code ?? null,
    full_name: p.full_name ?? null,
    status: p.status ?? null,
    inactive_reason: p.inactive_reason ?? null,
    role: p.role ?? null,
    gender: p.gender ?? null,
    contact: {
      email: p.email ?? null,
      extra_email: p.extra_email ?? null,
      phone: p.phone ?? null,
    },
    address: {
      city: p.city ?? null,
      district: p.district ?? null,
    },
    organization: {
      department_id: p.department_id ?? null,
      department_name: p.department_id ? lookups.departments.get(String(p.department_id)) ?? null : null,
      section_id: p.section_id ?? null,
      section_name: p.section_id ? lookups.sections.get(String(p.section_id)) ?? null : null,
      position_id: p.position_id ?? null,
      position_title: p.position_id ? lookups.positions.get(String(p.position_id)) ?? null : null,
      job_grade: p.job_grade ?? null,
      manager: p.manager_id ? lookups.managers.get(String(p.manager_id)) ?? { id: p.manager_id } : null,
    },
    national_id: {
      number: p.national_id ?? null,
      issue_date: p.id_issue_date ?? null,
      expiry_date: p.id_expiry_date ?? null,
    },
    contract: {
      type: p.contract_type ?? null,
      start_date: p.contract_start_date ?? null,
      end_date: p.contract_end_date ?? null,
      cancelled: p.contract_cancelled ?? false,
    },
    created_at: get("created_at"),
    updated_at: get("updated_at"),
  };
}

async function buildLookups(admin: any, rows: Row[]) {
  const ids = (key: string) =>
    Array.from(new Set(rows.map((r) => r[key]).filter(Boolean).map(String)));
  const [depts, sections, positions, managers] = await Promise.all([
    ids("department_id").length
      ? admin.from("departments").select("id,name").in("id", ids("department_id"))
      : { data: [] },
    ids("section_id").length
      ? admin.from("sections").select("id,name").in("id", ids("section_id"))
      : { data: [] },
    ids("position_id").length
      ? admin.from("positions").select("id,title").in("id", ids("position_id"))
      : { data: [] },
    ids("manager_id").length
      ? admin.from("profiles").select("id,full_name,email").in("id", ids("manager_id"))
      : { data: [] },
  ]);
  return {
    departments: new Map<string, string>((depts.data ?? []).map((d: any) => [d.id, d.name])),
    sections: new Map<string, string>((sections.data ?? []).map((s: any) => [s.id, s.name])),
    positions: new Map<string, string>((positions.data ?? []).map((p: any) => [p.id, p.title])),
    managers: new Map((managers.data ?? []).map((m: any) => [m.id, m])),
  };
}

export const Route = createFileRoute("/api/public/employees")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "unauthorized" }, 401);
        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          const empCode = url.searchParams.get("emp_code");
          const email = url.searchParams.get("email");
          const status = url.searchParams.get("status");
          const departmentId = url.searchParams.get("department_id");
          const search = url.searchParams.get("search");
          const updatedSince = url.searchParams.get("updated_since");
          const page = Math.max(1, Number(url.searchParams.get("page") || 1));
          const pageSize = Math.min(500, Math.max(1, Number(url.searchParams.get("page_size") || 100)));

          const { supabaseAdmin } = await import("@/backend/server/admin-client.server");
          const admin = supabaseAdmin as any;

          let q = admin.from("profiles").select(FIELDS, { count: "exact" });
          if (id) q = q.eq("id", id);
          if (empCode) q = q.eq("emp_code", empCode);
          if (email) q = q.ilike("email", email);
          if (status) q = q.eq("status", status);
          if (departmentId) q = q.eq("department_id", departmentId);
          if (updatedSince) q = q.gte("updated_at", updatedSince);
          if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,emp_code.ilike.%${search}%`);

          const from = (page - 1) * pageSize;
          const { data, error, count } = await q
            .order("full_name", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) return json({ error: error.message }, 500);

          const rows = (data ?? []) as Row[];
          const lookups = await buildLookups(admin, rows);
          return json({
            ok: true,
            page,
            page_size: pageSize,
            total: count ?? rows.length,
            employees: rows.map((r) => shape(r, lookups)),
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 500);
        }
      },
    },
  },
});
