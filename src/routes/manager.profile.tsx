import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User, Mail, Phone, Building2, UserCog, Wallet, FileSignature,
  CalendarClock, IdCard, Lock, LogOut, Smartphone, Shield, MapPin,
  Wifi, Check, X, Eye, EyeOff, Signal, Bell, Globe, Fingerprint,
  Banknote, CalendarDays, MessageSquare, ChevronRight, Settings,
  BadgeCheck, Clock, TrendingUp, Users, BarChart3, Star,
} from "lucide-react";
import { getMe, getMyProfileDetails } from "@/backend/functions/auth.functions";
import { listMyDevices, registerMyDevice, removeMyDevice } from "@/backend/functions/devices.functions";
import { AvatarUploader } from "@/components/AvatarUploader";
import { InstallButton } from "@/components/InstallButton";
import { useI18n, useTranslators } from "@/lib/i18n";
import { useStore, getCurrentDeviceId, deviceLabelGuess } from "@/lib/store";
import { changePassword, signOut } from "@/lib/auth";

export const Route = createFileRoute("/manager/profile")({
  component: ManagerProfilePage,
});

// ─── Tab Types ────────────────────────────────────────────────────────────────
type Tab = "overview" | "settings" | "devices" | "access";

function ManagerProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { tBranch, tDept } = useTranslators();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [openPwd, setOpenPwd] = useState(false);

  const meFn = useServerFn(getMe);
  const detailsFn = useServerFn(getMyProfileDetails);
  const { data: realMe } = useQuery({ queryKey: ["me", "profile"], queryFn: () => meFn(), staleTime: 30_000 });
  const { data: details } = useQuery({ queryKey: ["me", "details"], queryFn: () => detailsFn(), staleTime: 30_000 });

  const realProfile = realMe?.profile as {
    id?: string; full_name?: string | null; email?: string | null;
    avatar_url?: string | null; emp_code?: string | null;
  } | undefined;

  const me = useStore((s) => s.employees.find((e) => e.id === s.currentEmployeeId));
  const locations = useStore((s) => s.locations);
  const networks = useStore((s) => s.networks);
  const myLocations = locations.filter((l) => l.name === me?.branch);
  const myNetworks = networks.filter((n) => n.branch === me?.branch);

  const [deviceId, setDeviceId] = useState("");
  useEffect(() => { setDeviceId(getCurrentDeviceId()); }, []);

  const qc = useQueryClient();
  const listFn = useServerFn(listMyDevices);
  const registerFn = useServerFn(registerMyDevice);
  const removeFn = useServerFn(removeMyDevice);
  const { data: myDevices = [] } = useQuery({
    queryKey: ["my-devices"],
    queryFn: () => listFn(),
    enabled: !!realProfile?.id,
  });

  const myDevice = myDevices.find((d: any) => d.id === deviceId);
  const deviceStatus: "approved" | "pending" | "revoked" | "unregistered" =
    myDevice?.status === "approved" ? "approved" :
    myDevice?.status === "pending" ? "pending" :
    myDevice?.status === "revoked" ? "revoked" : "unregistered";

  const displayName = realProfile?.full_name ?? me?.name ?? realProfile?.email ?? "—";
  const initials = displayName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  async function handleRegister() {
    if (!deviceId) return;
    try {
      await registerFn({ data: { device_id: deviceId, label: deviceLabelGuess(), user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null } });
      toast.success("Device registered — awaiting approval");
      qc.invalidateQueries({ queryKey: ["my-devices"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed to register device"); }
  }

  async function handleRemove(id: string) {
    try {
      await removeFn({ data: { device_id: id } });
      toast.success("Device removed");
      qc.invalidateQueries({ queryKey: ["my-devices"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed to remove device"); }
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "devices", label: "Devices", icon: Smartphone },
    { id: "access", label: "Access", icon: Shield },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">

      {/* ── Hero Card ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-card shadow-md">
        {/* Gradient Banner */}
        <div className="h-32 w-full bg-gradient-to-r from-brand via-brand/80 to-brand/50" />

        {/* Avatar + Identity */}
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4 -mt-10">
              <div className="relative flex-shrink-0">
                {realProfile?.id ? (
                  <AvatarUploader
                    userId={realProfile.id}
                    name={displayName}
                    url={realProfile.avatar_url}
                    size="lg"
                    canEdit
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-brand to-brand/60 shadow-xl flex items-center justify-center text-brand-foreground text-2xl font-bold">
                    {initials}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
              </div>
              <div className="mb-1 min-w-0">
                <h1 className="truncate text-xl font-black text-foreground leading-tight">{displayName}</h1>
                {realProfile?.email && realProfile.email !== displayName && (
                  <p className="truncate text-sm text-muted-foreground mt-0.5">{realProfile.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {realProfile?.emp_code && (
                    <span className="rounded-lg bg-muted px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground/60">
                      #{realProfile.emp_code}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand border border-brand/20">
                    <Star className="h-3 w-3" /> Manager
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                    <BadgeCheck className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <button
                onClick={() => setOpenPwd(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Lock className="h-3.5 w-3.5" /> Change Password
              </button>
              <button
                onClick={async () => { await signOut(); window.location.href = "/auth"; }}
                className="inline-flex items-center gap-1.5 rounded-xl border bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Building2, label: "Department", value: details?.department ?? "—" },
              { icon: UserCog, label: "Reports To", value: details?.manager ?? "Direct Report" },
              { icon: FileSignature, label: "Contract", value: details?.contract_type ?? "—" },
              {
                icon: CalendarClock,
                label: "Contract Days",
                value: details?.contract_remaining_days == null
                  ? "—"
                  : details.contract_remaining_days < 0
                    ? `Expired ${Math.abs(details.contract_remaining_days)}d ago`
                    : `${details.contract_remaining_days} days left`,
              },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <stat.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="truncate text-sm font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto rounded-2xl bg-card p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 min-w-max items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Personal Info */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <User className="h-4 w-4 text-brand" /> Personal Information
              </h2>
            </div>
            <dl className="divide-y divide-border/40">
              {[
                { icon: IdCard, label: "Employee Code", value: details?.emp_code, mono: true },
                { icon: User, label: "Full Name", value: details?.full_name },
                { icon: Mail, label: "Email", value: details?.email },
                { icon: Phone, label: "Phone", value: details?.phone },
                { icon: IdCard, label: "National ID", value: details?.national_id, mono: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <row.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{row.label}</span>
                  </div>
                  <span className={`max-w-[55%] truncate text-sm font-semibold ${row.mono ? "font-mono" : ""} ${row.value ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {row.value || "—"}
                  </span>
                </div>
              ))}
            </dl>
          </div>

          {/* Employment Info */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-brand" /> Employment Details
              </h2>
            </div>
            <dl className="divide-y divide-border/40">
              {[
                { icon: Building2, label: "Department", value: details?.department },
                { icon: UserCog, label: "Direct Manager", value: details?.manager },
                {
                  icon: Wallet,
                  label: "Salary",
                  value: details?.salary_amount != null
                    ? `${details.salary_amount.toLocaleString()} EGP${details.salary_mode ? ` (${details.salary_mode})` : ""}`
                    : null,
                },
                { icon: FileSignature, label: "Contract Type", value: details?.contract_type },
                {
                  icon: CalendarClock,
                  label: "Contract Remaining",
                  value: details?.contract_remaining_days == null
                    ? null
                    : details.contract_remaining_days < 0
                      ? `Expired ${Math.abs(details.contract_remaining_days)} day(s) ago`
                      : `${details.contract_remaining_days} day(s)`,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <row.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{row.label}</span>
                  </div>
                  <span className={`max-w-[55%] truncate text-sm font-semibold ${row.value ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {row.value || "—"}
                  </span>
                </div>
              ))}
            </dl>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl bg-card overflow-hidden lg:col-span-2">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <BarChart3 className="h-4 w-4 text-brand" /> Quick Links
              </h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/40 sm:grid-cols-4">
              {[
                { to: "/manager/team", icon: Users, label: "My Team", color: "text-indigo-500 bg-indigo-500/10" },
                { to: "/manager/advances", icon: Banknote, label: "Advances", color: "text-emerald-500 bg-emerald-500/10" },
                { to: "/manager/trips", icon: CalendarDays, label: "Trips", color: "text-amber-500 bg-amber-500/10" },
                { to: "/manager/tasks", icon: BarChart3, label: "Tasks", color: "text-purple-500 bg-purple-500/10" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="group flex flex-col items-center gap-2 px-4 py-5 hover:bg-muted/40 transition-colors">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${link.color} transition-transform group-hover:scale-110`}>
                    <link.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-foreground">{link.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Settings ─────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Language & Notifications */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Settings className="h-4 w-4 text-brand" /> Preferences
              </h2>
            </div>
            <div className="divide-y divide-border/40">
              {/* Language */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Globe className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Language</p>
                    <p className="text-xs text-muted-foreground">Interface language</p>
                  </div>
                </div>
                <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
                  {(["en", "ar"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`rounded-lg px-3 py-1.5 transition-all ${lang === l ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      {l === "en" ? "EN" : "ع"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive alerts and updates</p>
                  </div>
                </div>
                <span className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-brand transition-colors">
                  <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white shadow transition-transform" />
                </span>
              </div>

              {/* Change Password */}
              <button
                onClick={() => setOpenPwd(true)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div className="text-start">
                    <p className="text-sm font-semibold">Change Password</p>
                    <p className="text-xs text-muted-foreground">Update your security credentials</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Face & Fingerprint */}
              <Link to="/employee/biometrics" className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Fingerprint className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Face & Fingerprint</p>
                    <p className="text-xs text-muted-foreground">Biometric authentication</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* App Install + Logout */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-card px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Install App</p>
                  <p className="text-xs text-muted-foreground">Add to home screen (PWA)</p>
                </div>
              </div>
              <InstallButton />
            </div>

            <button
              onClick={async () => { await signOut(); window.location.href = "/auth"; }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border bg-destructive/5 px-4 py-4 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out of Account
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Devices ──────────────────────────────────────────────────── */}
      {activeTab === "devices" && (
        <div className="rounded-2xl bg-card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Smartphone className="h-4 w-4 text-brand" /> Registered Devices
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Devices that are authorized to access your account</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Current Device */}
            <div className={`rounded-2xl border-2 p-4 ${
              deviceStatus === "approved" ? "border-emerald-500/40 bg-emerald-500/5" :
              deviceStatus === "pending" ? "border-amber-500/40 bg-amber-500/5" :
              "bg-destructive/5"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground">
                    <Smartphone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">This Device</p>
                    <p className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">{deviceId || "Detecting..."}</p>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  deviceStatus === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                  deviceStatus === "pending" ? "bg-amber-500/15 text-amber-600" :
                  "bg-destructive/15 text-destructive"
                }`}>
                  {deviceStatus === "approved" && <Check className="h-3 w-3" />}
                  {deviceStatus === "approved" ? "Approved" :
                   deviceStatus === "pending" ? "Awaiting Approval" :
                   deviceStatus === "revoked" ? "Revoked" : "Not Registered"}
                </span>
              </div>

              <div className="mt-4">
                {deviceStatus === "approved" ? (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <BadgeCheck className="h-4 w-4" /> Device authorized — you have full access
                  </p>
                ) : deviceStatus === "pending" ? (
                  <p className="text-xs text-muted-foreground">Your registration is under review by an administrator.</p>
                ) : deviceStatus === "revoked" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-destructive font-semibold">This device was revoked by an administrator.</p>
                    <button onClick={() => handleRemove(deviceId)} className="rounded-xl bg-background px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors">
                      Remove & Re-register
                    </button>
                  </div>
                ) : (
                  <button onClick={handleRegister} className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground shadow-sm hover:opacity-90 transition-opacity">
                    Register This Device
                  </button>
                )}
              </div>
            </div>

            {/* Other Devices */}
            {myDevices.filter((d: any) => d.id !== deviceId).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Other Devices</h3>
                <div className="space-y-2">
                  {myDevices.filter((d: any) => d.id !== deviceId).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                          <Smartphone className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{d.label || "Unknown Device"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate">{d.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          d.status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                          d.status === "pending" ? "bg-amber-500/15 text-amber-600" :
                          "bg-destructive/15 text-destructive"
                        }`}>{d.status}</span>
                        <button onClick={() => handleRemove(d.id)} className="rounded-lg bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Access ───────────────────────────────────────────────────── */}
      {activeTab === "access" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Locations */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <MapPin className="h-4 w-4 text-brand" /> Assigned Locations
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {myLocations.length}
              </span>
            </div>
            <div className="p-4">
              {myLocations.length === 0 ? (
                <div className="rounded-xl bg-muted/30 p-6 text-center">
                  <MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No geofence locations assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myLocations.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-background text-brand">
                          <MapPin className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-sm font-semibold">{tBranch(l.name)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        l.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>
                        {l.active ? "Active" : "Off"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Networks */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Wifi className="h-4 w-4 text-brand" /> Authorized Networks
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {myNetworks.length}
              </span>
            </div>
            <div className="p-4">
              {myNetworks.length === 0 ? (
                <div className="rounded-xl bg-muted/30 p-6 text-center">
                  <Wifi className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No networks authorized</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myNetworks.map((n) => (
                    <div key={n.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-background text-brand">
                          <Wifi className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{n.ssid}</p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Shield className="h-3 w-3" />{tBranch(n.branch)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        n.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>
                        <Signal className="h-3 w-3" />{n.active ? "Active" : "Off"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ─────────────────────────────────────────── */}
      {openPwd && <ChangePasswordModal onClose={() => setOpenPwd(false)} />}
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== conf) { toast.error("Passwords do not match"); return; }
    if (next.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const res = await changePassword(cur, next);
    setBusy(false);
    if (res === "ok") { toast.success("Password changed successfully"); onClose(); }
    else if (res === "wrong-current") toast.error("Current password is incorrect");
    else if (res === "too-short") toast.error("Password is too short");
    else if (res === "no-session") toast.error("No active session");
    else toast.error("Failed to change password");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">Change Password</h2>
            <p className="text-xs text-muted-foreground">Update your security credentials</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <PwdField label="Current Password" value={cur} onChange={setCur} />
        <PwdField label="New Password" value={next} onChange={setNext} />
        <PwdField label="Confirm New Password" value={conf} onChange={setConf} />

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-card py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground shadow-sm disabled:opacity-60 hover:opacity-90 transition-opacity">
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PwdField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute right-0 top-0 grid h-full w-10 place-items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
