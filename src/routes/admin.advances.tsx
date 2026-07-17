import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  TrendingUp,
  AlertCircle,
  Loader2,
  X,
  FileText,
  CreditCard,
  BarChart3,
  Users,
} from "lucide-react";
import {
  listAllAdvances,
  getEmployeeOutstandingBalance,
  hrDecideAdvance,
  financeApprovePayment,
  financeMarkPaid,
  financeRejectAdvance,
  getAdvanceAuditLog,
  listAdvanceInstallments,
  type EmployeeAdvance,
  type AdvanceApproval,
  type AdvanceInstallment,
} from "@/backend/functions/advances.functions";
import type { AdvanceStatus } from "@/backend/schemas";

export const Route = createFileRoute("/admin/advances")({
  component: AdminAdvancesPage,
  validateSearch: (s: Record<string, unknown>) => {
    const tab = s.tab as string | undefined;
    const TABS = ["all", "hr", "finance", "repayment"];
    return { tab: TABS.includes(tab ?? "") ? (tab as string) : "all" };
  },
});

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_T_KEY: Record<AdvanceStatus, any> = {
  draft: "advancesDraft",
  pending_manager: "advancesPendingManager",
  pending_hr: "advancesPendingHR",
  pending_finance: "advancesPendingFinance",
  approved_for_payment: "advancesApproved",
  paid: "advancesPaid",
  rejected: "advancesRejected",
  cancelled: "advancesCancelled",
  returned: "advancesReturned",
};

const STATUS_STYLE: Record<AdvanceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  pending_manager: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  pending_hr: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  pending_finance: "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  approved_for_payment: "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
  paid: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-red-100 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  returned: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
};

function StatusBadge({ status, label }: { status: AdvanceStatus; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? ""}`}>
      {label}
    </span>
  );
}

function fmt(n: number | null | undefined, currency = "EGP") {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all", labelKey: "advancesAllRequests", icon: FileText },
  { key: "hr", labelKey: "advancesPendingHR", icon: Users },
  { key: "finance", labelKey: "advancesFinance", icon: CreditCard },
  { key: "repayment", labelKey: "advancesRepayment", icon: BarChart3 },
] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminAdvancesPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = search.tab ?? "all";
  const setTab = (t: string) => navigate({ search: { tab: t }, replace: true });

  const qc = useQueryClient();
  const listFn = useServerFn(listAllAdvances);
  const hrDecideFn = useServerFn(hrDecideAdvance);
  const financeApproveFn = useServerFn(financeApprovePayment);
  const financeMarkPaidFn = useServerFn(financeMarkPaid);
  const financeRejectFn = useServerFn(financeRejectAdvance);
  const getOutstandingFn = useServerFn(getEmployeeOutstandingBalance);
  const getAuditFn = useServerFn(getAdvanceAuditLog);
  const getInstallmentsFn = useServerFn(listAdvanceInstallments);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search2, setSearch2] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const [detailAdv, setDetailAdv] = useState<EmployeeAdvance | null>(null);
  const [auditLog, setAuditLog] = useState<AdvanceApproval[]>([]);
  const [installments, setInstallments] = useState<AdvanceInstallment[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [decideModal, setDecideModal] = useState<{ adv: EmployeeAdvance; role: "hr" | "finance" } | null>(null);
  const [paymentModal, setPaymentModal] = useState<EmployeeAdvance | null>(null);
  const [decideAction, setDecideAction] = useState<"approved" | "rejected" | "returned">("approved");
  const [decideComments, setDecideComments] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [deductionStart, setDeductionStart] = useState("");
  const [outstanding, setOutstanding] = useState<{ previous_balance: number; requested_amount: number; total_after: number } | null>(null);

  // ─── Query ─────────────────────────────────────────────────

  const effectiveStatus = tab === "hr" ? "pending_hr"
    : tab === "finance" ? "pending_finance"
    : tab === "repayment" ? "paid"
    : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "advances", effectiveStatus, search2, page],
    queryFn: () => listFn({ data: { status: effectiveStatus, search: search2 || undefined, page, limit } }),
  });

  const advances = data?.advances ?? [];
  const totalCount = data?.count ?? 0;

  const pendingHR = advances.filter((a) => a.status === "pending_hr").length;
  const pendingFinance = advances.filter((a) => a.status === "pending_finance").length;

  // ─── Open Detail ────────────────────────────────────────────

  const openDetail = useCallback(async (adv: EmployeeAdvance) => {
    setDetailAdv(adv);
    setAuditLoading(true);
    try {
      const [log, inst] = await Promise.all([
        getAuditFn({ data: { advance_id: adv.id } }),
        getInstallmentsFn({ data: { advance_id: adv.id } }),
      ]);
      setAuditLog(log);
      setInstallments(inst);
    } finally {
      setAuditLoading(false);
    }
  }, [getAuditFn, getInstallmentsFn]);

  // ─── Open Payment Modal ─────────────────────────────────────

  const openPaymentModal = useCallback(async (adv: EmployeeAdvance) => {
    setPaymentModal(adv);
    setApprovedAmount(String(adv.requested_amount));
    setInstallmentCount("3");
    const today = new Date();
    today.setDate(1);
    today.setMonth(today.getMonth() + 1);
    setDeductionStart(today.toISOString().slice(0, 10));
    try {
      const res = await getOutstandingFn({ data: { employee_id: adv.employee_id, requested_amount: adv.requested_amount } });
      setOutstanding(res);
    } catch {
      setOutstanding(null);
    }
  }, [getOutstandingFn]);

  // ─── Mutations ──────────────────────────────────────────────

  const hrMutation = useMutation({
    mutationFn: (v: { id: string; action: "approved" | "rejected" | "returned"; comments?: string }) =>
      hrDecideFn({ data: { id: v.id, action: v.action, comments: v.comments } }),
    onSuccess: () => {
      toast.success("Decision recorded");
      setDecideModal(null);
      setDecideComments("");
      qc.invalidateQueries({ queryKey: ["admin", "advances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const financeRejectMutation = useMutation({
    mutationFn: (v: { id: string; comments?: string }) =>
      financeRejectFn({ data: { id: v.id, comments: v.comments } }),
    onSuccess: () => {
      toast.success("Advance rejected");
      setDecideModal(null);
      setDecideComments("");
      qc.invalidateQueries({ queryKey: ["admin", "advances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const financeApproveMutation = useMutation({
    mutationFn: (v: { id: string; approved_amount: number; installment_count: number; deduction_start_date: string; comments?: string }) =>
      financeApproveFn({ data: v }),
    onSuccess: () => {
      toast.success("Payment approved — installments created");
      setPaymentModal(null);
      qc.invalidateQueries({ queryKey: ["admin", "advances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => financeMarkPaidFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Marked as paid");
      qc.invalidateQueries({ queryKey: ["admin", "advances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isBusy = hrMutation.isPending || financeApproveMutation.isPending || financeRejectMutation.isPending || markPaidMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl flex items-center gap-2">
          <Banknote className="h-7 w-7 text-brand" />
          {t("advancesTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("advancesSubtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("advancesTotalRequests"), value: totalCount, icon: FileText, color: "text-slate-600" },
          { label: t("advancesPendingHR"), value: pendingHR, icon: Users, color: "text-blue-600" },
          { label: t("advancesPendingFinance"), value: pendingFinance, icon: CreditCard, color: "text-purple-600" },
          { label: t("advancesPaid"), value: advances.filter((a) => a.status === "paid").length, icon: CheckCircle2, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={`rounded-xl bg-muted p-2 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              tab === tabItem.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tabItem.icon className="h-4 w-4" />
            {t(tabItem.labelKey as any)}
          </button>
        ))}
      </div>

      {/* Filters (only on All tab) */}
      {tab === "all" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search2}
              onChange={(e) => { setSearch2(e.target.value); setPage(1); }}
              placeholder={t("advancesSearch")}
              className="w-52 rounded-full border border-input bg-card py-1.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-full border border-input bg-card py-1.5 pl-3 pr-8 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">{t("advancesAllStatuses")}</option>
            <option value="pending_manager">{t("advancesPendingManager")}</option>
            <option value="pending_hr">{t("advancesPendingHR")}</option>
            <option value="pending_finance">{t("advancesPendingFinance")}</option>
            <option value="approved_for_payment">{t("advancesApproved")}</option>
            <option value="paid">{t("advancesPaid")}</option>
            <option value="rejected">{t("advancesRejected")}</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : advances.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">{t("advancesNoFound")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {[t("advancesRequestNumber"), t("advancesEmployee"), t("advancesAmount"), t("advancesReason"), t("advancesDate"), t("advancesStatus"), t("advancesActions")].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-brand">{adv.request_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{adv.employee?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{adv.employee?.department?.name_en ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmt(adv.requested_amount, adv.currency)}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate text-muted-foreground">{adv.reason ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(adv.created_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={adv.status as AdvanceStatus} label={t(STATUS_T_KEY[adv.status as AdvanceStatus] ?? "advancesDraft")} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openDetail(adv)}
                          className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" /> {t("advancesView")}
                        </button>
                        {adv.status === "pending_hr" && (
                          <button
                            onClick={() => { setDecideModal({ adv, role: "hr" }); setDecideAction("approved"); setDecideComments(""); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("advancesReview")}
                          </button>
                        )}
                        {adv.status === "pending_finance" && (
                          <>
                            <button
                              onClick={() => openPaymentModal(adv)}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> {t("advancesApprove")}
                            </button>
                            <button
                              onClick={() => { setDecideModal({ adv, role: "finance" }); setDecideAction("rejected"); setDecideComments(""); }}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" /> {t("advancesReject")}
                            </button>
                          </>
                        )}
                        {adv.status === "approved_for_payment" && (
                          <button
                            onClick={() => { if (confirm("Mark this advance as paid?")) markPaidMutation.mutate(adv.id); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("advancesMarkPaid")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalCount > limit && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">{t("advancesPage")} {page} {t("advancesOf")} {Math.ceil(totalCount / limit)}</span>
          <button
            disabled={page >= Math.ceil(totalCount / limit)}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────── */}
      {detailAdv && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setDetailAdv(null)} />
          <aside className="relative ms-auto flex h-full w-full max-w-xl flex-col bg-background shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
              <div>
                <p className="font-mono text-sm font-semibold text-brand">{detailAdv.request_number}</p>
                <h2 className="font-display text-lg font-semibold">{detailAdv.employee?.full_name ?? t("advancesEmployee")}</h2>
              </div>
              <button onClick={() => setDetailAdv(null)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 p-6">
              {/* Status + amounts */}
              <div className="grid grid-cols-2 gap-4">
                <InfoCard label={t("advancesStatus")}><StatusBadge status={detailAdv.status as AdvanceStatus} label={t(STATUS_T_KEY[detailAdv.status as AdvanceStatus] ?? "advancesDraft")} /></InfoCard>
                <InfoCard label={t("advancesRequestedAmount")}><span className="font-semibold">{fmt(detailAdv.requested_amount, detailAdv.currency)}</span></InfoCard>
                {detailAdv.approved_amount != null && (
                  <InfoCard label={t("advancesApprovedAmount")}><span className="font-semibold text-emerald-600">{fmt(detailAdv.approved_amount, detailAdv.currency)}</span></InfoCard>
                )}
                <InfoCard label={t("advancesRequestDate")}>{fmtDate(detailAdv.created_at)}</InfoCard>
                {detailAdv.expected_date && <InfoCard label={t("advancesExpectedDate")}>{fmtDate(detailAdv.expected_date)}</InfoCard>}
                <InfoCard label={t("advancesDepartment")}>{detailAdv.employee?.department?.name_en ?? "—"}</InfoCard>
                <InfoCard label={t("advancesPosition")}>{detailAdv.employee?.position?.name_en ?? "—"}</InfoCard>
              </div>

              {/* Reason */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("advancesReason")}</p>
                <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm">{detailAdv.reason ?? "—"}</p>
              </div>

              {/* Outstanding balance (if paid / approved) */}
              {(detailAdv.approved_amount != null) && (
                <BalanceTable
                  previousBalance={detailAdv.previous_balance}
                  requestedAmount={detailAdv.approved_amount ?? detailAdv.requested_amount}
                  currency={detailAdv.currency}
                />
              )}

              {/* Repayment */}
              {detailAdv.installment_count != null && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("advancesRepaymentSchedule")}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoCard label={t("advancesInstallments")}>{detailAdv.installment_count}×</InfoCard>
                    <InfoCard label={t("advancesMonthlyAmount")}>{fmt(detailAdv.installment_amount, detailAdv.currency)}</InfoCard>
                    <InfoCard label={t("advancesStart")}>{fmtDate(detailAdv.deduction_start_date)}</InfoCard>
                    <InfoCard label={t("advancesEnd")}>{fmtDate(detailAdv.deduction_end_date)}</InfoCard>
                  </div>
                  {installments.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            {[t("advancesDate"), t("advancesAmount"), t("advancesPaid"), t("advancesStatus")].map((h) => (
                              <th key={h} className="px-3 py-2 text-start font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {installments.map((inst) => (
                            <tr key={inst.id}>
                              <td className="px-3 py-2 font-mono">{inst.payroll_period}</td>
                              <td className="px-3 py-2">{fmt(inst.installment_amount, detailAdv.currency)}</td>
                              <td className="px-3 py-2">{fmt(inst.paid_amount, detailAdv.currency)}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 font-medium ${
                                  inst.status === "paid" ? "bg-emerald-50 text-emerald-700"
                                    : inst.status === "skipped" ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-50 text-slate-600"
                                }`}>{inst.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Audit log */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("advancesAuditTrail")}</p>
                {auditLoading ? (
                  <p className="text-xs text-muted-foreground">{t("advancesLoading")}</p>
                ) : auditLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("advancesNoActions")}</p>
                ) : (
                  <ol className="relative border-s border-border ps-5 space-y-4">
                    {auditLog.map((entry) => (
                      <li key={entry.id} className="relative">
                        <span className="absolute -start-[1.15rem] flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background">
                          <span className={`h-2 w-2 rounded-full ${
                            entry.action === "approved" || entry.action === "paid" ? "bg-emerald-500"
                              : entry.action === "rejected" ? "bg-red-500"
                              : entry.action === "returned" ? "bg-amber-500"
                              : "bg-blue-500"
                          }`} />
                        </span>
                        <p className="text-xs font-semibold capitalize">{entry.action} <span className="font-normal text-muted-foreground">by {entry.approver?.full_name ?? "System"} · {entry.approval_level}</span></p>
                        {entry.comments && <p className="mt-0.5 text-xs text-muted-foreground">{entry.comments}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── HR / Finance Decide Modal ─────────────────────────── */}
      {decideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setDecideModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {decideModal.role === "hr" ? t("advancesHRReview") : t("advancesFinanceRejection")}
                </h3>
                <p className="text-sm text-muted-foreground">{decideModal.adv.request_number}</p>
              </div>
              <button onClick={() => setDecideModal(null)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              {(["approved", "rejected", "returned"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setDecideAction(a)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium capitalize transition-all ${
                    decideAction === a
                      ? a === "approved" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : a === "rejected" ? "border-red-500 bg-red-50 text-red-700"
                        : "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Comments {decideAction !== "approved" && <span className="text-red-500">*</span>}</label>
              <textarea
                value={decideComments}
                onChange={(e) => setDecideComments(e.target.value)}
                rows={3}
                placeholder="Add comments…"
                className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDecideModal(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isBusy || (decideAction !== "approved" && !decideComments.trim())}
                onClick={() => {
                  if (decideModal.role === "hr") {
                    hrMutation.mutate({ id: decideModal.adv.id, action: decideAction, comments: decideComments || undefined });
                  } else {
                    financeRejectMutation.mutate({ id: decideModal.adv.id, comments: decideComments || undefined });
                  }
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  decideAction === "approved" ? "bg-emerald-600 hover:bg-emerald-700"
                    : decideAction === "rejected" ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Finance Payment Modal ─────────────────────────────── */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setPaymentModal(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{t("advancesApprovePayment")}</h3>
                <p className="text-sm text-muted-foreground">{paymentModal.request_number} · {paymentModal.employee?.full_name}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Outstanding balance summary */}
            {outstanding && (
              <BalanceTable
                previousBalance={outstanding.previous_balance}
                requestedAmount={outstanding.requested_amount}
                currency={paymentModal.currency}
              />
            )}

            {/* Payment fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Approved Amount ({paymentModal.currency})</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  min={1}
                  className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("advancesInstallmentMonths")}</label>
                <input
                  type="number"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  min={1}
                  max={60}
                  className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("advancesDeductionStart")}</label>
                <input
                  type="date"
                  value={deductionStart}
                  onChange={(e) => setDeductionStart(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Monthly amount preview */}
            {approvedAmount && installmentCount && Number(installmentCount) > 0 && (
              <div className="rounded-xl bg-purple-50 p-3 text-sm text-purple-800">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                Monthly deduction: <strong>{fmt(Number(approvedAmount) / Number(installmentCount), paymentModal.currency)}</strong>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPaymentModal(null)}
                className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isBusy || !approvedAmount || !deductionStart || Number(installmentCount) < 1}
                onClick={() =>
                  financeApproveMutation.mutate({
                    id: paymentModal.id,
                    approved_amount: Number(approvedAmount),
                    installment_count: Number(installmentCount),
                    deduction_start_date: deductionStart,
                  })
                }
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve & Create Installments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function BalanceTable({ previousBalance, requestedAmount, currency }: {
  previousBalance: number;
  requestedAmount: number;
  currency: string;
}) {
  const total = previousBalance + requestedAmount;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Outstanding Balance Summary
      </p>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 text-muted-foreground">Previous Outstanding Balance</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(previousBalance, currency)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-muted-foreground">New Advance Request</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(requestedAmount, currency)}</td>
            </tr>
            <tr className="bg-amber-50 font-semibold text-amber-800">
              <td className="px-4 py-2.5">Total Outstanding After Approval</td>
              <td className="px-4 py-2.5 text-right">{fmt(total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
