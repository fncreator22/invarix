import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

/** SCR-X-01: never hints whether the thing exists. */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div aria-hidden className="aurora-mesh pointer-events-none absolute inset-0" />
      <Link href="/" aria-label="Reprieve home" className="relative mb-10">
        <Logo />
      </Link>
      <main id="main" className="relative flex max-w-md flex-col items-center">
        <span className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Compass aria-hidden className="size-6" />
        </span>
        <h1 className="text-h1 font-semibold">We can&apos;t find that.</h1>
        <p className="mt-2 text-body text-text-secondary">The link may be wrong, or you may not have access to it.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/onboarding">Go to my workspace</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
