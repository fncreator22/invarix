import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Shown on auth pages when no Clerk key is configured (local development without secrets). */
export function AuthNotConfigured() {
  return (
    <section className="card-e1 w-full max-w-md p-6 text-center shadow-e3">
      <span className="mx-auto mb-4 inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
        <KeyRound aria-hidden className="size-5" />
      </span>
      <h1 className="text-h2 font-semibold">Local Dev Mode Active</h1>
      <p className="mt-2 text-body-sm text-text-secondary">
        Authentication is automatically bypassed for local development. You can jump directly into the demo workspace.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/w/northwind-pay/home">
            Enter Demo Dashboard <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
