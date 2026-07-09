import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestMyOtp, verifyMyOtp } from "@/lib/otp.functions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/employee/verify-otp")({
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const navigate = useNavigate();
  const request = useServerFn(requestMyOtp);
  const verify = useServerFn(verifyMyOtp);

  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error" | "info"; msg: string }>({
    kind: "idle", msg: "",
  });
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (cooldown <= 0 && expiresIn <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      setExpiresIn((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown, expiresIn]);

  const send = useCallback(async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setStatus({ kind: "info", msg: "Sending code…" });
    try {
      const r = await request({ data: {} });
      if (!r.ok) {
        if (r.cooldown) setCooldown(r.cooldown);
        setStatus({ kind: "error", msg: r.error ?? "Failed to send code" });
      } else {
        setMaskedMobile(r.mobileMasked ?? null);
        setCooldown(r.cooldown ?? 45);
        setExpiresIn(Math.max(0, Math.floor((r.expiresAt - Date.now()) / 1000)));
        setStatus({ kind: "info", msg: `Code sent to ${r.mobileMasked ?? "your phone"}.` });
      }
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setSending(false);
    }
  }, [request, sending, cooldown]);

  const submit = useCallback(async () => {
    if (code.length < 4 || verifying) return;
    setVerifying(true);
    try {
      const r = await verify({ data: { code } });
      if (r.ok) {
        setStatus({ kind: "ok", msg: "Verified! Redirecting…" });
        setTimeout(() => navigate({ to: "/employee" }), 800);
      } else {
        setCode("");
        setStatus({
          kind: "error",
          msg: r.attemptsRemaining !== undefined
            ? `${r.error} (${r.attemptsRemaining} left)`
            : (r.error ?? "Invalid code"),
        });
      }
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setVerifying(false);
    }
  }, [code, verify, verifying, navigate]);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-10">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Verify your phone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {maskedMobile
            ? `Enter the 6-digit code we sent to ${maskedMobile}.`
            : "Send a one-time code to your phone on file, then enter it below."}
        </p>
      </div>

      <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={submit}>
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
        </InputOTPGroup>
      </InputOTP>

      {expiresIn > 0 && (
        <p className="text-xs text-muted-foreground">
          Code expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, "0")}
        </p>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button onClick={submit} disabled={code.length < 6 || verifying} className="w-full">
          {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify code
        </Button>
        <Button
          variant="outline"
          onClick={send}
          disabled={sending || cooldown > 0}
          className="w-full"
        >
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {cooldown > 0 ? `Resend in ${cooldown}s` : maskedMobile ? "Resend code" : "Send code"}
        </Button>
      </div>

      {status.msg && (
        <p
          className={
            "text-center text-sm " +
            (status.kind === "error"
              ? "text-destructive"
              : status.kind === "ok"
                ? "text-emerald-600"
                : "text-muted-foreground")
          }
        >
          {status.msg}
        </p>
      )}
    </div>
  );
}