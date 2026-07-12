import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, X, Lock, Search, ChevronLeft, UserPlus, UserMinus, History, CheckCircle2, AlertCircle } from "lucide-react";
import {
  listUsersWithRoles,
  assignRole,
  removeRole,
  bulkChangeRole,
  listRoleAudit,
  type RoleAuditEntry,
} from "@/backend/functions/auth.functions";
import {
  getRoleMatrix,
  setRolePermission,
  getUserOverrides,
  setUserOverride,
  PERMISSION_PAGES,
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "@/backend/functions/permissions.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/settings_/roles")({ component: RolesPage });

const ALL_ROLES = ["admin", "hr", "manager", "employee", "staff", "user"] as const;
type Role = (typeof ALL_ROLES)[number];
const MANAGED_ROLES = ["hr", "manager", "user"] as const;
type ManagedRole = (typeof MANAGED_ROLES)[number];

const roleColor: Record<Role, string> = {
  admin:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-700",
  hr:       "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-300 dark:ring-purple-700",
  manager:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700",
  employee: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700",
  staff:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-700",
  user:     "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 ring-1 ring-slate-300 dark:ring-slate-600",
};

const ROLE_DESC: Record<Role, string> = {
  admin: "Full access to every admin surface. Cannot be revoked from this UI.",
  hr: "Manages employees, leaves, payroll and settings.",
  manager: "Approves team requests and reviews team performance.",
  employee: "Standard employee panel access only.",
  staff: "Read-only staff view for shared kiosks.",
  user: "Baseline authenticated user with no admin capabilities.",
};

function RolesPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Settings
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Assign roles and fine-tune what each role or user can do. Add and remove actions require confirmation.</p>
        </div>
      </header>
      <Tabs defaultValue="users" className="space-y-5">
        <TabsList>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="role-perms">Role Permissions</TabsTrigger>
          <TabsTrigger value="user-perms">User Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersAndRoles /></TabsContent>
        <TabsContent value="role-perms"><RolePermissionsTab /></TabsContent>
        <TabsContent value="user-perms"><UserOverridesTab /></TabsContent>
      </Tabs>
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4" />
        <p><strong>Admin</strong> always has full access. <strong>Employee</strong> and <strong>Staff</strong> see only their own panel and cannot access admin pages here.</p>
      </div>
    </div>
  );
}

type PendingAction =
  | { kind: "assign"; user: { id: string; name: string; email: string }; role: Role }
  | { kind: "remove"; user: { id: string; name: string; email: string }; role: Role };

type BulkPending = {
  action: "assign" | "remove";
  role: Role;
  users: Array<{ id: string; name: string; email: string; roles: Role[] }>;
};

function UsersAndRoles() {
  const qc = useQueryClient();
  const list = useServerFn(listUsersWithRoles);
  const assign = useServerFn(assignRole);
  const remove = useServerFn(removeRole);
  const bulk = useServerFn(bulkChangeRole);
  const q = useQuery({ queryKey: ["users-with-roles"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<Role>("hr");
  const [bulkAction, setBulkAction] = useState<"assign" | "remove">("assign");
  const [bulkPending, setBulkPending] = useState<BulkPending | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = (q.data ?? []) as any[];
    if (!s) return all;
    return all.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(s) ||
      (u.email ?? "").toLowerCase().includes(s),
    );
  }, [q.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    qc.invalidateQueries({ queryKey: ["role-audit"] });
  };
  const mA = useMutation({
    mutationFn: (v: { user_id: string; role: Role }) => assign({ data: v }),
    onSuccess: () => { inv(); toast.success("Role assigned"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mR = useMutation({
    mutationFn: (v: { user_id: string; role: Role }) => remove({ data: v }),
    onSuccess: () => { inv(); toast.success("Role removed"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mBulk = useMutation({
    mutationFn: (v: { user_ids: string[]; role: Role; action: "assign" | "remove" }) => bulk({ data: v }),
    onSuccess: (res) => {
      inv();
      setSelected(new Set());
      const ok = res.succeeded.length;
      const skipped = res.skipped.length;
      const verb = res.action === "assign" ? "assigned" : "removed";
      toast.success(`Role ${verb} for ${ok} user${ok === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function confirmPending() {
    if (!pending) return;
    if (pending.kind === "assign") {
      mA.mutate({ user_id: pending.user.id, role: pending.role });
    } else {
      mR.mutate({ user_id: pending.user.id, role: pending.role });
    }
    setPending(null);
  }

  function openBulkConfirm() {
    const all = (q.data ?? []) as any[];
    const chosen = all.filter((u) => selected.has(u.id));
    if (chosen.length === 0) { toast.error("Select at least one user"); return; }
    setBulkPending({
      action: bulkAction,
      role: bulkRole,
      users: chosen.map((u) => ({ id: u.id, name: u.full_name || "—", email: u.email, roles: u.roles as Role[] })),
    });
  }

  function confirmBulk() {
    if (!bulkPending) return;
    mBulk.mutate({
      user_ids: bulkPending.users.map((u) => u.id),
      role: bulkPending.role,
      action: bulkPending.action,
    });
    setBulkPending(null);
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleSelectPage(rows: any[]) {
    setSelected((s) => {
      const n = new Set(s);
      const allChecked = rows.every((r) => n.has(r.id));
      if (allChecked) rows.forEach((r) => n.delete(r.id));
      else rows.forEach((r) => { if (!r.roles.includes("admin")) n.add(r.id); });
      return n;
    });
  }

  // pending user summary for single-action dialog: pull current roles from list
  const pendingUserRoles = useMemo<Role[]>(() => {
    if (!pending) return [];
    const u = (q.data ?? []).find((x: any) => x.id === pending.user.id) as any;
    return (u?.roles ?? []) as Role[];
  }, [pending, q.data]);

  return (
    <div className="space-y-4">
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{(q.error as Error).message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-input bg-background py-1.5 ps-7 pe-2 text-sm outline-none focus:border-ring"
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-start font-semibold w-8">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={paginated.length > 0 && paginated.every((u: any) => selected.has(u.id))}
                  onChange={() => toggleSelectPage(paginated)}
                />
              </th>
              <th className="px-4 py-3 text-start font-semibold">User</th>
              <th className="px-4 py-3 text-start font-semibold">Roles</th>
              <th className="px-4 py-3 text-start font-semibold">Assign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((u: any) => (
              <tr key={u.id} className={selected.has(u.id) ? "bg-brand/5" : undefined}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.full_name || u.email}`}
                    checked={selected.has(u.id)}
                    disabled={u.roles.includes("admin")}
                    onChange={() => toggleSelect(u.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                    {u.roles.map((r: Role) => (
                      <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${roleColor[r] ?? "bg-muted"}`}>
                        <Shield className="h-3 w-3" /> {r}
                        {!u.roles.includes("admin") && (
                          <button
                            onClick={() => setPending({ kind: "remove", user: { id: u.id, name: u.full_name || "—", email: u.email }, role: r })}
                            className="ml-1 opacity-70 hover:opacity-100"
                            aria-label={`Remove ${r} role`}
                          ><X className="h-3 w-3" /></button>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {!u.roles.includes("admin") && (
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value as Role;
                        if (v) {
                          setPending({ kind: "assign", user: { id: u.id, name: u.full_name || "—", email: u.email }, role: v });
                          e.currentTarget.value = "";
                        }
                      }}
                      className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
                      <option value="">+ add role…</option>
                      {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {!q.isLoading && paginated.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/30 p-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {selected.size} selected
        </span>
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value as "assign" | "remove")}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="assign">Add role</option>
          <option value="remove">Remove role</option>
        </select>
        <select
          value={bulkRole}
          onChange={(e) => setBulkRole(e.target.value as Role)}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          {ALL_ROLES.filter((r) => r !== "admin").map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={openBulkConfirm}
          disabled={selected.size === 0 || mBulk.isPending}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-brand disabled:opacity-50"
        >
          Apply to {selected.size || 0}
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium"
          >Clear</button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Showing {paginated.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{(safePage - 1) * pageSize + paginated.length} of {filtered.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >Previous</button>
          <span className="px-2 text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >Next</button>
        </div>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {pending.kind === "assign" ? (
                    <><UserPlus className="h-5 w-5 text-brand" /> Assign role “{pending.role}”?</>
                  ) : (
                    <><UserMinus className="h-5 w-5 text-destructive" /> Remove role “{pending.role}”?</>
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      {pending.kind === "assign"
                        ? `This will grant the “${pending.role}” role to:`
                        : `This will revoke the “${pending.role}” role from:`}
                    </p>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="font-semibold text-foreground">{pending.user.name}</p>
                      <p className="text-xs text-muted-foreground">{pending.user.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground mr-1">Current roles:</span>
                        {pendingUserRoles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                        {pendingUserRoles.map((r) => (
                          <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor[r] ?? "bg-muted"}`}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_DESC[pending.role]}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmPending}
                  className={pending.kind === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                >
                  {pending.kind === "assign" ? "Assign role" : "Remove role"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirmation dialog */}
      <AlertDialog open={!!bulkPending} onOpenChange={(o) => { if (!o) setBulkPending(null); }}>
        <AlertDialogContent className="max-w-2xl">
          {bulkPending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {bulkPending.action === "assign" ? (
                    <><UserPlus className="h-5 w-5 text-brand" /> Add “{bulkPending.role}” to {bulkPending.users.length} user{bulkPending.users.length === 1 ? "" : "s"}?</>
                  ) : (
                    <><UserMinus className="h-5 w-5 text-destructive" /> Remove “{bulkPending.role}” from {bulkPending.users.length} user{bulkPending.users.length === 1 ? "" : "s"}?</>
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm">
                    <p>Review the selection and each user’s current roles before confirming.</p>
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-start font-semibold">User</th>
                            <th className="px-3 py-2 text-start font-semibold">Current roles</th>
                            <th className="px-3 py-2 text-start font-semibold">Effect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bulkPending.users.map((u) => {
                            const has = u.roles.includes(bulkPending.role);
                            const effect = bulkPending.action === "assign"
                              ? (has ? "no change" : `+ ${bulkPending.role}`)
                              : (has ? `− ${bulkPending.role}` : "no change");
                            return (
                              <tr key={u.id}>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-foreground">{u.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {u.roles.length === 0 && <span className="text-muted-foreground">none</span>}
                                    {u.roles.map((r) => (
                                      <span key={r} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${roleColor[r] ?? "bg-muted"}`}>{r}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className={`px-3 py-2 font-mono text-[11px] ${effect === "no change" ? "text-muted-foreground" : bulkPending.action === "assign" ? "text-emerald-600" : "text-destructive"}`}>{effect}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_DESC[bulkPending.role]}</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulk}
                  className={bulkPending.action === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                >
                  {bulkPending.action === "assign" ? "Add role to all" : "Remove role from all"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <RecentRoleChanges />
    </div>
  );
}

function RecentRoleChanges() {
  const fn = useServerFn(listRoleAudit);
  const q = useQuery({ queryKey: ["role-audit"], queryFn: () => fn({ data: { limit: 50 } }) });
  const rows = (q.data ?? []) as RoleAuditEntry[];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Recent role changes</h2>
        <span className="text-xs text-muted-foreground">Last {rows.length}</span>
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{(q.error as Error).message}</p>}
      {!q.isLoading && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          No role changes recorded yet. Run <code className="rounded bg-background px-1 py-0.5">docs/migrations/role-audit.sql</code> in the Supabase SQL editor to enable audit logging.
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">When</th>
                <th className="px-3 py-2 text-start font-semibold">Action</th>
                <th className="px-3 py-2 text-start font-semibold">Role</th>
                <th className="px-3 py-2 text-start font-semibold">Target</th>
                <th className="px-3 py-2 text-start font-semibold">By</th>
                <th className="px-3 py-2 text-start font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.action === "assign" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {r.action === "assign" ? <UserPlus className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />} {r.action}
                    </span>
                    {r.batch_id && <span className="ms-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">bulk</span>}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.role}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{r.target_name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.target_email || r.target_id.slice(0, 8)}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.actor_email || "system"}</td>
                  <td className="px-3 py-2">
                    {r.ok ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> ok</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive" title={r.error ?? ""}><AlertCircle className="h-3 w-3" /> {r.error || "failed"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RolePermissionsTab() {
  const qc = useQueryClient();
  const fetchMatrix = useServerFn(getRoleMatrix);
  const setPerm = useServerFn(setRolePermission);
  const q = useQuery({ queryKey: ["role-matrix"], queryFn: () => fetchMatrix() });
  const [role, setRole] = useState<ManagedRole>("hr");

  const map = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of q.data ?? []) m.set(`${(r as any).role}::${(r as any).page}`, r);
    return m;
  }, [q.data]);

  const m = useMutation({
    mutationFn: (v: { role: ManagedRole; page: string; action: PermissionAction; value: boolean }) =>
      setPerm({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-matrix"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MANAGED_ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${role === r ? "bg-brand text-brand-foreground shadow-brand" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >{r}</button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Editing permissions for role: <strong className="capitalize text-foreground">{role}</strong> — {ROLE_DESC[role]}</p>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">Page</th>
              {PERMISSION_ACTIONS.map((a) => (
                <th key={a} className="px-3 py-3 text-center font-semibold capitalize">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERMISSION_PAGES.map((p) => {
              const row = map.get(`${role}::${p.slug}`) ?? {};
              return (
                <tr key={p.slug}>
                  <td className="px-4 py-3 font-medium">{p.label}</td>
                  {PERMISSION_ACTIONS.map((a) => {
                    const checked = !!row[`can_${a}`];
                    return (
                      <td key={a} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={m.isPending}
                          onChange={(e) => m.mutate({ role, page: p.slug, action: a, value: e.target.checked })}
                          className="h-4 w-4 cursor-pointer accent-[hsl(var(--brand))]"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserOverridesTab() {
  const qc = useQueryClient();
  const list = useServerFn(listUsersWithRoles);
  const fetchOverrides = useServerFn(getUserOverrides);
  const setOverride = useServerFn(setUserOverride);
  const users = useQuery({ queryKey: ["users-with-roles"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (users.data ?? []).filter((u: any) => {
      if (!s) return true;
      return (u.full_name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
    }).slice(0, 50);
  }, [users.data, search]);

  const overrides = useQuery({
    queryKey: ["user-overrides", userId],
    queryFn: () => fetchOverrides({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  const overrideMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of overrides.data ?? []) m.set((r as any).page, r);
    return m;
  }, [overrides.data]);

  const m = useMutation({
    mutationFn: (v: { userId: string; page: string; action: PermissionAction; value: boolean | null }) =>
      setOverride({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-overrides", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedUser = (users.data ?? []).find((u: any) => u.id === userId);

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="rounded-3xl border border-border bg-card p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full rounded-lg border border-input bg-background py-1.5 ps-7 pe-2 text-sm outline-none focus:border-ring"
          />
        </div>
        <div className="max-h-[60vh] space-y-1 overflow-auto">
          {filtered.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No users</p>}
          {filtered.map((u: any) => {
            const managed = (u.roles ?? []).some((r: string) => (MANAGED_ROLES as readonly string[]).includes(r) || r === "admin");
            return (
              <button
                key={u.id}
                onClick={() => setUserId(u.id)}
                className={`w-full rounded-lg px-2 py-2 text-start text-sm ${userId === u.id ? "bg-brand/10 text-brand" : "hover:bg-muted"}`}
              >
                <p className="truncate font-medium">{u.full_name || "—"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                {!managed && <p className="text-[10px] text-warning-foreground">No admin role</p>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card">
        {!userId && (
          <div className="p-8 text-center text-sm text-muted-foreground">Select a user to manage overrides.</div>
        )}
        {userId && (
          <div>
            <div className="border-b border-border p-4">
              <p className="font-display text-base font-semibold">{selectedUser?.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Inherit = use role default. Allow / Deny override the role.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">Page</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-3 text-center font-semibold capitalize">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSION_PAGES.map((p) => {
                    const row = overrideMap.get(p.slug) ?? {};
                    return (
                      <tr key={p.slug}>
                        <td className="px-4 py-3 font-medium">{p.label}</td>
                        {PERMISSION_ACTIONS.map((a) => {
                          const v = row[`can_${a}`];
                          const cur: "inherit" | "allow" | "deny" =
                            v === null || v === undefined ? "inherit" : v ? "allow" : "deny";
                          return (
                            <td key={a} className="px-3 py-2 text-center">
                              <select
                                value={cur}
                                disabled={m.isPending}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const next = val === "inherit" ? null : val === "allow";
                                  m.mutate({ userId, page: p.slug, action: a, value: next });
                                }}
                                className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
                              >
                                <option value="inherit">Inherit</option>
                                <option value="allow">Allow</option>
                                <option value="deny">Deny</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}