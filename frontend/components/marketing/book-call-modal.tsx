"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Clock, Mail, ShieldCheck, Sparkles, User, Building } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface BookCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookCallModal({ open, onOpenChange }: BookCallModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    servicesCount: "10-50",
    preferredTime: "this-week",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      toast.error("Please agree to the Terms of Service and Privacy Policy to proceed.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Audit session requested! Check your inbox for confirmation.");
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setConsentGiven(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border-strong bg-surface p-0 overflow-hidden shadow-2xl">
        <div className="bg-surface-elevated border-b border-border-subtle p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-300 mb-2">
            <span>Confidential Architecture Audit</span>
          </div>
          <DialogTitle className="text-h3 font-display font-bold text-text-primary">
            Book an Architecture Exception Audit
          </DialogTitle>
          <DialogDescription className="text-body-sm text-text-secondary mt-1">
            We will run a private, read-only AST scan of your repository to map unmonitored waivers and cascading blast radius.
          </DialogDescription>
        </div>

        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-success-soft flex items-center justify-center text-success">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-h4 font-bold text-text-primary">You are on the schedule</h4>
                <p className="text-body-sm text-text-secondary max-w-sm mx-auto">
                  Our principal graph architect will review your architecture specs and send a calendar invitation to <strong className="text-text-primary">{formData.email}</strong>.
                </p>
              </div>
              <div className="rounded-lg bg-surface-subtle border border-border-subtle p-3 text-caption text-text-muted text-left space-y-1">
                <p className="font-semibold text-text-primary">What we cover in 15 minutes:</p>
                <p>• Zero-login AST scan across your microservices for #nosec and @skip.</p>
                <p>• 30-day temporal collision check for Cyber Week / peak traffic.</p>
                <p>• Shortest proof path demo on your staging branch.</p>
              </div>
              <Button onClick={handleReset} className="w-full">
                Back to Site
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                    <User className="size-3.5 text-text-muted" /> Full Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Alex Morgan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-canvas px-3 py-2 text-body-sm text-text-primary focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                    <Mail className="size-3.5 text-text-muted" /> Work Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="alex@acme-corp.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-canvas px-3 py-2 text-body-sm text-text-primary focus:border-brand focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                    <Building className="size-3.5 text-text-muted" /> Company Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Acme Payments Inc."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-canvas px-3 py-2 text-body-sm text-text-primary focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-caption font-medium text-text-secondary flex items-center gap-1.5">
                    <Clock className="size-3.5 text-text-muted" /> Microservices Count
                  </label>
                  <select
                    value={formData.servicesCount}
                    onChange={(e) => setFormData({ ...formData, servicesCount: e.target.value })}
                    className="w-full rounded-md border border-border-subtle bg-canvas px-3 py-2 text-body-sm text-text-primary focus:border-brand focus:outline-hidden"
                  >
                    <option value="1-10">1 - 10 services</option>
                    <option value="10-50">10 - 50 services</option>
                    <option value="50-200">50 - 200 services</option>
                    <option value="200+">200+ microservices</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-surface-subtle border border-border-subtle p-3 text-caption text-text-muted space-y-1">
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <ShieldCheck className="size-4" />
                  <span>Zero-Access & Data Protection Guarantee</span>
                </div>
                <p>
                  No production credentials required. We collect your contact details solely to coordinate this technical audit.
                  Your information is never sold or shared. To request data deletion or correction, email{" "}
                  <a href="mailto:privacy@invarix.dev" className="text-text-primary hover:underline">
                    privacy@invarix.dev
                  </a>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="audit-consent"
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border-subtle bg-canvas text-brand focus:ring-brand/40"
                  required
                />
                <label htmlFor="audit-consent" className="text-caption text-text-secondary leading-snug cursor-pointer select-none">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-brand hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy" target="_blank" className="text-brand hover:underline">
                    Privacy Policy
                  </Link>
                  . I consent to INVARIX contacting me to schedule this 15-minute architecture audit.
                </label>
              </div>

              <Button
                type="submit"
                loading={loading}
                disabled={!consentGiven}
                className="w-full gap-2 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar className="size-4" />
                Confirm 15-Minute Architecture Audit
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
