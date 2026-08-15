import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, MapPin, Wifi, ShieldCheck, Smartphone } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { InstallButton } from "@/components/InstallButton";
import { LanguageToggle, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff Link — Secure Employee Attendance" },
      { name: "description", content: "GPS geo-fencing, authorized network validation, leave management, and real-time reporting for modern workforces." },
    ],
  }),
  component: Index,
});

function Slider() {
  const [current, setCurrent] = useState(0);
  const images = ["/slider1.png", "/slider2.png"];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-[2.25rem] border border-border bg-card shadow-brand">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Slide ${i + 1}`}
          className={`w-full object-cover transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0 absolute inset-0 h-full"
          }`}
        />
      ))}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-brand" : "w-2 bg-brand/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Index() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
        <AppLogo width={320} />
        <div className="flex items-center gap-2">
          <InstallButton variant="ghost" />
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-[1400px] px-6 pb-20 pt-8">
        <section className="grid items-center gap-10 lg:grid-cols-[2fr_3fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Geo-fenced • Network-verified
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t("appName")}.<br />
              <span className="text-brand">Attendance that can't be faked.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">{t("tagline")}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/employee"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <Smartphone className="h-4 w-4" />
                {t("continueAs")} {t("employee")}
                <ArrowRight className="h-4 w-4 rtl-flip transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5"
              >
                {t("continueAs")} {t("administrator")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: MapPin, label: "GPS Geo-Fencing" },
                { icon: Wifi, label: "Wi-Fi / IP Verified" },
                { icon: ShieldCheck, label: "Audit-grade Logs" },
              ].map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-sm shadow-soft">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-foreground">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image Slider */}
          <Slider />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© 2026 Staff Link Developer : Mr.Hafez Rahim</span>
          <span>v1.0 • Built for mobile, tablet, and web</span>
        </div>
      </footer>
    </div>
  );
}
