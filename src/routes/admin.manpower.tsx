import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users, Briefcase, AlertCircle, Clock, Plus, Pencil, Trash2,
  ChevronDown, Search, BarChart3, X, CheckCircle2, Filter,
} from "lucide-react";
import { format } from "date-fns";
import {
  getManpowerData,
  upsertManpowerPlan,
  deleteManpowerPlan,
  updateManpowerStatus,
} from "@/backend/functions/manpower.functions";

// Component moved to be a tab inside Org Chart page

const STATUSES = [
  "Draft", "Pending Dept Manager", "Pending HR",
  "Pending Finance", "Pending Executive", "Approved", "Rejected", "Closed",
];
const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Temporary", "Internship"];
const PRIORITIES = ["High", "Medium", "Low"];
const HIRING_REASONS = [
  "Business Expansion", "Employee Replacement", "New Project",
  "Promotion", "Resignation", "Retirement", "Organizational Restructuring",
];
const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const statusColor: Record<string, string> = {
  "Draft": "bg-muted text-muted-foreground",
  "Pending Dept Manager": "bg-warning/10 text-warning-foreground",
  "Pending HR": "bg-warning/10 text-warning-foreground",
  "Pending Finance": "bg-warning/10 text-warning-foreground",
  "Pending Executive": "bg-warning/10 text-warning-foreground",
  "Approved": "bg-success/15 text-success",
  "Rejected": "bg-destructive/10 text-destructive",
  "Closed": "bg-muted text-muted-foreground",
};
const priorityColor: Record<string, string> = {
  "High": "bg-destructive/10 text-destructive",
  "Medium": "bg-warning/10 text-warning-foreground",
  "Low": "bg-success/15 text-success",
};

type Plan = {
  id: string;
  fiscal_year: number;
  company?: string;
  branch?: string;
  department_id?: string;
  section_id?: string;
  position_id?: string;
  job_grade_id?: string;
  planned_headcount: number;
  currentHeadcount: number;
  vacancies: number;
  employment_type?: string;
  hiring_reason?: string;
  priority?: string;
  required_date?: string;
  salary_from?: number;
  salary_to?: number;
  currency?: string;
  budget_available?: boolean;
  budget_approved?: boolean;
  cost_center?: string;
  estimated_annual_cost?: number;
  status: string;
  notes?: string;
  departmentName: string;
  sectionName: string;
  positionName: string;
  jobGradeName: string;
};

const emptyPlan = (): Partial<Plan> => ({
  fiscal_year: CURRENT_YEAR,
  planned_headcount: 1,
  priority: "Medium",
  currency: "EGP",
  budget_available: false,
  budget_approved: false,
  status: "Draft",
});

export function ManpowerPage() {
  const qc = useQueryClient();
  const [fiscalYear, setFiscalYear] = useState(CURRENT_YEAR);
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Partial<Plan>>(emptyPlan());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useServerFn(getManpowerData);
  const fetchUpsert = useServerFn(upsertManpowerPlan);
  const fetchDelete = useServerFn(deleteManpowerPlan);
  const fetchStatus = useServerFn(updateManpowerStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["manpower", fiscalYear, filterDept, filterStatus, filterBranch],
    queryFn: () => fetchData({ data: {
      fiscal_year: fiscalYear,
      department_id: filterDept !== "all" ? filterDept : undefined,
      status: filterStatus,
      branch: filterBranch,
    }}),
  });

  const plans: Plan[] = data?.plans || [];
  const kpis = data?.kpis || { totalPlanned: 0, totalCurrent: 0, totalVacancies: 0, pendingApprovals: 0 };
  const lookups = data?.lookups || { departments: [], sections: [], positions: [], jobGrades: [] };

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter(p =>
      p.positionName?.toLowerCase().includes(q) ||
      p.departmentName?.toLowerCase().includes(q) ||
      p.jobGradeName?.toLowerCase().includes(q) ||
      p.branch?.toLowerCase().includes(q)
    );
  }, [plans, search]);

  const upsertMut = useMutation({
    mutationFn: (plan: Partial<Plan>) => fetchUpsert({ data: plan as any }),
    onSuccess: () => {
      toast.success(editPlan.id ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["manpower"] });
      setPanelOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetchDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Plan deleted");
      qc.invalidateQueries({ queryKey: ["manpower"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (args: { id: string; status: string }) => fetchStatus({ data: args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manpower"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openNew() {
    setEditPlan(emptyPlan());
    setPanelOpen(true);
  }
  function openEdit(p: Plan) {
    setEditPlan({ ...p });
    setPanelOpen(true);
  }
  function handleSave() {
    upsertMut.mutate(editPlan);
  }

  // Filter sections by selected department
  const availableSections = useMemo(() =>
    lookups.sections.filter((s: any) => !editPlan.department_id || s.department_id === editPlan.department_id),
    [lookups.sections, editPlan.department_id]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Manpower Planning</h1>
          <p className="text-sm text-muted-foreground">Plan, approve and monitor workforce requirements</p>
        </div>
        <div className="flex gap-2">
          <select
            value={fiscalYear}
            onChange={e => setFiscalYear(Number(e.target.value))}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"
          >
            {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-brand hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Plan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Total Planned" value={kpis.totalPlanned} tone="brand" />
        <KpiCard icon={CheckCircle2} label="Current (Filled)" value={kpis.totalCurrent} tone="success" />
        <KpiCard icon={Briefcase} label="Total Vacancies" value={kpis.totalVacancies} tone="warning" />
        <KpiCard icon={AlertCircle} label="Pending Approvals" value={kpis.pendingApprovals} tone="destructive" />
      </section>

      {/* Filters + Table */}
      <section className="rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs flex-1 min-w-48">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              placeholder="Search position, dept, grade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1 text-xs"
            />
          </div>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option value="all">All Departments</option>
            {lookups.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse text-sm">Loading manpower data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No plans found</p>
            <p className="text-xs text-muted-foreground mt-1">Add a manpower plan to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Position</th>
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Grade</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Planned</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Current</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Vacancies</th>
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Required By</th>
                  <th className="px-4 py-3 text-start font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-end font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.departmentName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.positionName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.jobGradeName}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-semibold">{p.planned_headcount}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{p.currentHeadcount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold mx-auto ${p.vacancies > 0 ? "bg-destructive/10 text-destructive" : "bg-success/15 text-success"}`}>
                        {p.vacancies}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.priority && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColor[p.priority] || "bg-muted text-muted-foreground"}`}>
                          {p.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.required_date ? format(new Date(p.required_date), "d MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative group inline-block">
                        <button className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusColor[p.status] || "bg-muted text-muted-foreground"}`}>
                          {p.status}
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        <div className="absolute start-0 top-full z-10 mt-1 hidden min-w-[180px] rounded-2xl border border-border bg-card p-1 shadow-xl group-focus-within:block group-hover:block">
                          {STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => statusMut.mutate({ id: p.id, status: s })}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs hover:bg-muted ${p.status === s ? "font-semibold" : ""}`}
                            >
                              {p.status === s && <CheckCircle2 className="h-3 w-3 text-brand" />}
                              {p.status !== s && <span className="h-3 w-3" />}
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add/Edit Slide-Over */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="relative ms-auto flex h-full w-full max-w-lg flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold">{editPlan.id ? "Edit Plan" : "New Manpower Plan"}</h2>
              <button onClick={() => setPanelOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Fiscal Year & Branch */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fiscal Year">
                  <select value={editPlan.fiscal_year || CURRENT_YEAR} onChange={e => setEditPlan(p => ({ ...p, fiscal_year: Number(e.target.value) }))} className={selectCls}>
                    {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Branch">
                  <input value={editPlan.branch || ""} onChange={e => setEditPlan(p => ({ ...p, branch: e.target.value }))} placeholder="e.g. Cairo" className={inputCls} />
                </Field>
              </div>

              {/* Department & Section */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department">
                  <select value={editPlan.department_id || ""} onChange={e => setEditPlan(p => ({ ...p, department_id: e.target.value, section_id: undefined }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {lookups.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
                  </select>
                </Field>
                <Field label="Section">
                  <select value={editPlan.section_id || ""} onChange={e => setEditPlan(p => ({ ...p, section_id: e.target.value }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {availableSections.map((s: any) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
                  </select>
                </Field>
              </div>

              {/* Position & Grade */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Position">
                  <select value={editPlan.position_id || ""} onChange={e => setEditPlan(p => ({ ...p, position_id: e.target.value }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {lookups.positions.map((pos: any) => <option key={pos.id} value={pos.id}>{pos.name_en}</option>)}
                  </select>
                </Field>
                <Field label="Job Grade">
                  <select value={editPlan.job_grade_id || ""} onChange={e => setEditPlan(p => ({ ...p, job_grade_id: e.target.value }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {lookups.jobGrades.map((g: any) => <option key={g.id} value={g.id}>{g.name_en}</option>)}
                  </select>
                </Field>
              </div>

              {/* Planned Headcount & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Planned Headcount">
                  <input type="number" min={1} value={editPlan.planned_headcount || 1} onChange={e => setEditPlan(p => ({ ...p, planned_headcount: Number(e.target.value) }))} className={inputCls} />
                </Field>
                <Field label="Priority">
                  <select value={editPlan.priority || "Medium"} onChange={e => setEditPlan(p => ({ ...p, priority: e.target.value }))} className={selectCls}>
                    {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </Field>
              </div>

              {/* Employment Type & Hiring Reason */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Employment Type">
                  <select value={editPlan.employment_type || ""} onChange={e => setEditPlan(p => ({ ...p, employment_type: e.target.value }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Hiring Reason">
                  <select value={editPlan.hiring_reason || ""} onChange={e => setEditPlan(p => ({ ...p, hiring_reason: e.target.value }))} className={selectCls}>
                    <option value="">— Select —</option>
                    {HIRING_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              {/* Required Date */}
              <Field label="Required By Date">
                <input type="date" value={editPlan.required_date || ""} onChange={e => setEditPlan(p => ({ ...p, required_date: e.target.value }))} className={inputCls} />
              </Field>

              {/* Salary Range */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Salary From">
                  <input type="number" min={0} value={editPlan.salary_from || ""} onChange={e => setEditPlan(p => ({ ...p, salary_from: Number(e.target.value) }))} className={inputCls} />
                </Field>
                <Field label="Salary To">
                  <input type="number" min={0} value={editPlan.salary_to || ""} onChange={e => setEditPlan(p => ({ ...p, salary_to: Number(e.target.value) }))} className={inputCls} />
                </Field>
                <Field label="Currency">
                  <input value={editPlan.currency || "EGP"} onChange={e => setEditPlan(p => ({ ...p, currency: e.target.value }))} className={inputCls} />
                </Field>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40">
                  <input type="checkbox" checked={!!editPlan.budget_available} onChange={e => setEditPlan(p => ({ ...p, budget_available: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-medium">Budget Available</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40">
                  <input type="checkbox" checked={!!editPlan.budget_approved} onChange={e => setEditPlan(p => ({ ...p, budget_approved: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-medium">Budget Approved</span>
                </label>
              </div>

              <Field label="Cost Center">
                <input value={editPlan.cost_center || ""} onChange={e => setEditPlan(p => ({ ...p, cost_center: e.target.value }))} placeholder="e.g. CC-HR-001" className={inputCls} />
              </Field>

              {/* Status */}
              <Field label="Status">
                <select value={editPlan.status || "Draft"} onChange={e => setEditPlan(p => ({ ...p, status: e.target.value }))} className={selectCls}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea rows={3} value={editPlan.notes || ""} onChange={e => setEditPlan(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." className={`${inputCls} resize-none`} />
              </Field>
            </div>

            <div className="flex items-center gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setPanelOpen(false)} className="flex-1 rounded-full border border-border py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={upsertMut.isPending}
                className="flex-1 rounded-full bg-gradient-brand py-2 text-sm font-semibold text-brand-foreground shadow-brand hover:opacity-90 disabled:opacity-60"
              >
                {upsertMut.isPending ? "Saving..." : editPlan.id ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative rounded-3xl bg-card p-6 shadow-2xl w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-semibold">Delete Plan?</h3>
            <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-full border border-border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(deleteId)}
                disabled={deleteMut.isPending}
                className="flex-1 rounded-full bg-destructive py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {deleteMut.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors";
const selectCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  const toneClasses: Record<string, string> = {
    brand: "bg-gradient-brand text-brand-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/10 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <span className={`inline-grid h-10 w-10 place-items-center rounded-2xl ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
