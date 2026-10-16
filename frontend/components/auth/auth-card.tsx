"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Building2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthBridge } from "@/lib/auth";
import { toast } from "sonner";

export interface AuthCardProps {
  initialMode?: "sign-in" | "sign-up" | "forgot-password";
  redirectUrl?: string;
}

export function AuthCard({ initialMode = "sign-in", redirectUrl = "/workspaces" }: AuthCardProps) {
  const router = useRouter();
  const { signInLocally } = useAuthBridge();

  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password" | "otp-verify">(initialMode);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP State
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(45);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const user = {
        id: `usr_${Date.now()}`,
        name: email.split("@")[0].replace(".", " "),
        email: email,
        orgName: orgName || "Primary Workspace",
        role: "admin",
      };

      if (signInLocally) {
        signInLocally(user);
      }

      toast.success(`Welcome back, ${user.name}!`);
      router.push(redirectUrl);
    }, 600);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const user = {
        id: `usr_${Date.now()}`,
        name: name,
        email: email,
        orgName: orgName || `${name.split(" ")[0]}'s Org`,
        role: "admin",
      };

      if (signInLocally) {
        signInLocally(user);
      }

      toast.success("Account and Workspace initialized!");
      router.push("/onboarding");
    }, 700);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your work email address.");
      return;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(mockOtp);
      setMode("otp-verify");
      toast.info(`One-Time Code (OTP) sent to ${email}`, {
        description: `Security Verification Code: [ ${mockOtp} ]`,
        duration: 10000,
      });
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpCode.join("");
    if (entered.length < 6) {
      toast.error("Please enter the complete 6-digit OTP code.");
      return;
    }
    if (generatedOtp && entered !== generatedOtp) {
      toast.error("Invalid verification code. Please check your code or resend.");
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user = {
        id: `usr_${Date.now()}`,
        name: email.split("@")[0],
        email: email,
        role: "admin",
      };
      if (signInLocally) {
        signInLocally(user);
      }
      toast.success("Password successfully verified & updated!");
      router.push(redirectUrl);
    }, 700);
  };

  const handleQuickSandbox = () => {
    toast.info("Entering Live Northwind Pay Sandbox with 0 credentials...");
    router.push("/w/northwind-pay/home");
  };

  return (
    <div className="card-e2 w-full max-w-[460px] overflow-hidden border border-border-default/80 bg-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header Badge & Title */}
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-[11px] font-mono font-medium text-brand">
          <ShieldCheck className="size-3.5" />
          <span>INVARIX Zero-Trust Architecture Auth</span>
        </div>

        <h1 className="text-h2 font-semibold text-text-primary tracking-tight">
          {mode === "sign-in" && "Sign in to INVARIX"}
          {mode === "sign-up" && "Create your workspace"}
          {mode === "forgot-password" && "Reset your password"}
          {mode === "otp-verify" && "Verify 6-digit OTP"}
        </h1>

        <p className="mt-1.5 text-body-sm text-text-secondary">
          {mode === "sign-in" && "Access your isolated tri-planar graphs and active pre-merge gates."}
          {mode === "sign-up" && "Start preventing cascading multi-service risk collisions in your CI/CD."}
          {mode === "forgot-password" && "Enter your registered email to receive a secure recovery code."}
          {mode === "otp-verify" && `Enter the 6-digit code sent to ${email}.`}
        </p>
      </div>

      {/* Tabs for Sign In vs Sign Up */}
      {(mode === "sign-in" || mode === "sign-up") && (
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-sunken p-1 border border-border-subtle">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`rounded-md py-1.5 text-caption font-medium transition-all ${
              mode === "sign-in"
                ? "bg-surface text-text-primary shadow-xs font-semibold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`rounded-md py-1.5 text-caption font-medium transition-all ${
              mode === "sign-up"
                ? "bg-surface text-text-primary shadow-xs font-semibold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Register / Get Started
          </button>
        </div>
      )}

      {/* SIGN IN FORM */}
      {mode === "sign-in" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Mail className="size-3.5 text-text-muted" />
              Work Email
            </label>
            <Input
              type="email"
              required
              placeholder="alex@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                <Lock className="size-3.5 text-text-muted" />
                Password
              </label>
              <button
                type="button"
                onClick={() => setMode("forgot-password")}
                className="text-caption text-brand hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-sunken text-body-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-caption text-text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3.5 rounded border-border-default text-brand focus:ring-brand"
              />
              Remember this device for 30 days
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-medium">
            {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}
            Sign In to Workspace
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-text-muted">
              <span className="bg-surface px-2">or quick explore</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleQuickSandbox}
            className="w-full border-border-strong/70 text-text-primary hover:bg-raised gap-2"
          >
            <Sparkles className="size-4 text-brand" />
            Launch Live Sandbox (0 Login)
          </Button>
        </form>
      )}

      {/* SIGN UP FORM */}
      {mode === "sign-up" && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <User className="size-3.5 text-text-muted" />
              Full Name
            </label>
            <Input
              type="text"
              required
              placeholder="Elena Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Building2 className="size-3.5 text-text-muted" />
              Company or Organization Name
            </label>
            <Input
              type="text"
              required
              placeholder="Acme Payments Cloud"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Mail className="size-3.5 text-text-muted" />
              Work Email
            </label>
            <Input
              type="email"
              required
              placeholder="elena@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Lock className="size-3.5 text-text-muted" />
              Set Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-sunken text-body-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-text-muted">
                <span className="font-medium">Password strength:</span>
                <span
                  className={
                    password.length >= 10
                      ? "text-emerald-500 font-semibold"
                      : password.length >= 6
                      ? "text-amber-500 font-semibold"
                      : "text-red-500 font-semibold"
                  }
                >
                  {password.length >= 10 ? "Strong" : password.length >= 6 ? "Medium" : "Weak"}
                </span>
              </div>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer text-caption text-text-muted leading-tight">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 size-3.5 rounded border-border-default text-brand focus:ring-brand"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-brand hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-medium">
            {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
            Create Account & Provision Workspace
          </Button>
        </form>
      )}

      {/* FORGOT PASSWORD FORM */}
      {mode === "forgot-password" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Mail className="size-3.5 text-text-muted" />
              Your Registered Email
            </label>
            <Input
              type="email"
              required
              placeholder="elena@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-medium">
            {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
            Send 6-Digit OTP Recovery Code
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="text-caption text-text-muted hover:text-text-primary"
            >
              ← Back to Sign In
            </button>
          </div>
        </form>
      )}

      {/* OTP VERIFICATION & NEW PASSWORD FORM */}
      {mode === "otp-verify" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <label className="text-caption font-medium text-text-secondary block text-center">
              6-Digit Security Verification Code
            </label>
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-box-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    const updated = [...otpCode];
                    updated[idx] = val;
                    setOtpCode(updated);
                    if (val && idx < 5) {
                      const next = document.getElementById(`otp-box-${idx + 1}`);
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otpCode[idx] && idx > 0) {
                      const prev = document.getElementById(`otp-box-${idx - 1}`);
                      prev?.focus();
                    }
                  }}
                  className="size-11 sm:size-12 rounded-lg border border-border-strong bg-sunken text-center font-mono text-lg font-bold text-text-primary focus:border-brand focus:outline-none"
                />
              ))}
            </div>
            {generatedOtp && (
              <p className="text-center font-mono text-[11px] text-text-muted">
                Demo Test OTP: <span className="font-bold text-brand">{generatedOtp}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Lock className="size-3.5 text-text-muted" />
              New Password
            </label>
            <Input
              type="password"
              required
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
              <Lock className="size-3.5 text-text-muted" />
              Confirm New Password
            </label>
            <Input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-sunken text-body-sm"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-medium">
            {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
            Verify Code & Complete Sign In
          </Button>

          <div className="flex items-center justify-between pt-2 text-caption text-text-muted">
            <button
              type="button"
              onClick={() => {
                const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(mockOtp);
                toast.info(`New OTP sent: [ ${mockOtp} ]`);
              }}
              className="hover:text-text-primary text-brand font-medium"
            >
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="hover:text-text-primary"
            >
              ← Cancel
            </button>
          </div>
        </form>
      )}

      {/* Footer Info & Architecture Guarantee */}
      <div className="mt-6 border-t border-border-subtle pt-4 text-center">
        <p className="text-[11px] text-text-muted">
          All workspace data strictly isolated in FalkorDB tri-planar graphs (
          <code className="font-mono text-[10px] text-brand">platform</code>,{" "}
          <code className="font-mono text-[10px] text-brand">org_ws</code>,{" "}
          <code className="font-mono text-[10px] text-brand">mem_ws</code>).
        </p>
      </div>
    </div>
  );
}
