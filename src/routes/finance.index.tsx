import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, Banknote, StickyNote, Bell, CheckCheck } from "lucide-react";
import { useStore, markNotificationRead, markAllNotificationsRead } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/finance/")({
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const { t } = useI18n();
  const session = useSession();

  // We reuse manager/admin notification logic but scoped to finance if we ever have finance-specific notifications
  const notifications = useStore((s) => s.notifications).filter(
    (n) => n.audience === "hr"
  );
  const unread = notifications.filter((n) => !n.read).length;

  const cards = [
    { to: "/finance/payroll", icon: Wallet, label: t("payrollRun") || "Run Payroll", value: t("manage") || "Manage" },
    { to: "/finance/advances", icon: Banknote, label: t("advances") || "Advances", value: t("review") || "Review" },
    { to: "/finance/sticky-notes", icon: StickyNote, label: t("notes") || "Notes", value: t("view") || "View" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">{t("financePanel") || "Finance Panel"}</p>
        <h1 className="font-display text-2xl font-semibold">{session?.name ?? ""}</h1>
        <p className="text-sm text-muted-foreground">{t("financeDepartment") || "Finance Department"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label + c.to}
            to={c.to}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <c.icon className="h-5 w-5 text-brand" />
            <p className="mt-2 font-display text-2xl font-semibold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
            <Bell className="h-4 w-4 text-brand" /> {t("recentNotifications")}
            {unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">{unread}</span>}
          </h2>
          {unread > 0 && (
            <button
              onClick={() => markAllNotificationsRead((n) => n.audience === "hr")}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand"
            >
              <CheckCheck className="h-3 w-3" /> {t("markAllRead")}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noNotifications")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id} onClick={() => markNotificationRead(n.id)} className={`cursor-pointer py-2.5 ${n.read ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(n.ts).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
