"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Delete, Loader2, Mail, ShieldCheck } from "lucide-react";

interface LoginFormProps {
  onLogin: () => void | Promise<unknown>;
}

type LoginStep = "email" | "otp";

export function LoginForm({ onLogin }: LoginFormProps) {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to send OTP");
        return;
      }

      setStep("otp");
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Invalid OTP");
        setOtp("");
        return;
      }

      await onLogin();
    } catch {
      setError("Connection failed");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const appendOtpDigit = (digit: string) => {
    setOtp((current) => `${current}${digit}`.slice(0, 6));
  };

  return (
    <div className="pos-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl lg:grid-cols-[1fr_420px]">
        <div className="hidden bg-gray-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-gray-950">
              <ShieldCheck size={22} />
            </div>
            <p className="page-kicker text-gray-400">Admin Console</p>
            <h1 className="mt-3 max-w-md text-4xl font-bold tracking-normal text-white">
              Run service, staff, and payments from one focused workspace.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-gray-400">
              Secure email login for managers and counter staff with live POS operations after sign-in.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="font-bold">Orders</p>
              <p className="mt-1 text-xs text-gray-400">Live status</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="font-bold">Kitchen</p>
              <p className="mt-1 text-xs text-gray-400">Item flow</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="font-bold">Staff</p>
              <p className="mt-1 text-xs text-gray-400">PIN access</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-950 text-white">
            {step === "email" ? <Mail size={24} /> : <ShieldCheck size={24} />}
          </div>
            <p className="page-kicker">Nexus POS</p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-gray-950">Sign in to admin</h1>
            <p className="mt-2 text-sm text-gray-500">
            {step === "email"
              ? "Enter your admin email"
              : "Enter the 6-digit email code"}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="h-12 w-full rounded-lg border border-gray-200 px-4 text-sm font-medium outline-none transition focus:border-blue-500"
              autoComplete="email"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !normalizedEmail}
              className="primary-button h-12 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                aria-label="Back to email"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 text-sm text-gray-500 truncate">{normalizedEmail}</div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6).replace(/\D/g, ""))}
              placeholder="000000"
              maxLength={6}
              className="h-14 w-full rounded-lg border border-gray-200 text-center font-mono text-3xl tracking-widest outline-none transition focus:border-blue-500"
              autoComplete="one-time-code"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="primary-button h-12 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === "back") {
                      setOtp((current) => current.slice(0, -1));
                    } else if (btn) {
                      appendOtpDigit(btn);
                    }
                  }}
                  className="flex h-14 items-center justify-center rounded-lg bg-gray-100 text-xl font-bold transition-colors hover:bg-gray-200 disabled:opacity-50"
                  disabled={!btn}
                  aria-label={btn === "back" ? "Delete digit" : btn || "Spacer"}
                >
                  {btn === "back" ? <Delete size={20} /> : btn}
                </button>
              ))}
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
