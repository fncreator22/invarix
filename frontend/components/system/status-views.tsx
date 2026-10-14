"use client";

import Link from "next/link";
import { Compass, DatabaseBackup, Lock, RotateCw, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IdText } from "@/components/id-text";
import { cn } from "@/lib/utils";

function Frame({
  icon,
  title,
  children,
  actions,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center", className)}>
      <span className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</span>
      <h1 className="text-h2 font-semibold text-text-primary">{title}</h1>
      {children && <div className="mt-2 text-body text-text-secondary">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </section>
  );
}

/** SCR-X-01: never hints whether the thing exists. */
export function NotFoundView({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <Frame
      icon={<Compass aria-hidden className="size-6" />}
      title="We can't find that."
      actions={
        <Button asChild>
          <Link href={homeHref}>Go home</Link>
        </Button>
      }
    >
      <p>The link may be wrong, or you may not have access to it.</p>
    </Frame>
  );
}

/** SCR-X-02 */
export function ForbiddenView({ requiredRole, homeHref = "/" }: { requiredRole?: string; homeHref?: string }) {
  return (
    <Frame
      icon={<Lock aria-hidden className="size-6" />}
      title="You don't have access to this action."
      actions={
        <Button asChild variant="secondary">
          <Link href={homeHref}>Back to home</Link>
        </Button>
      }
    >
      <p>
        {requiredRole
          ? `This needs the ${requiredRole} role or higher. Ask a workspace admin to change your role.`
          : "Ask a workspace admin if you need access."}
      </p>
    </Frame>
  );
}

/** SCR-X-06: friendly message, copyable request ID, Retry. */
export function ServerErrorView({
  requestId,
  onRetry,
  message = "Something went wrong on our side. Your data is safe. Try again in a moment.",
}: {
  requestId?: string | null;
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <Frame
      icon={<ServerCrash aria-hidden className="size-6" />}
      title="We couldn't load this."
      actions={
        onRetry && (
          <Button onClick={onRetry}>
            <RotateCw aria-hidden />
            Try again
          </Button>
        )
      }
    >
      <p>{message}</p>
      {requestId && (
        <p className="mt-3 inline-flex items-center gap-1 text-body-sm text-text-muted">
          Request ID <IdText id={requestId} full />
        </p>
      )}
    </Frame>
  );
}

/** SCR-X-04 */
export function DataMissingView({
  isAdmin,
  onRehydrate,
  busy,
}: {
  isAdmin: boolean;
  onRehydrate?: () => void;
  busy?: boolean;
}) {
  return (
    <Frame
      icon={<DatabaseBackup aria-hidden className="size-6" />}
      title="This workspace needs to be restored."
      actions={
        isAdmin &&
        onRehydrate && (
          <Button onClick={onRehydrate} loading={busy}>
            Rehydrate from sample
          </Button>
        )
      }
    >
      <p>
        {isAdmin
          ? "Its graph data is no longer available. Reload the sample data to continue. Restoring from a bundle arrives in beta."
          : "Its graph data is no longer available. Ask a workspace admin to restore it."}
      </p>
    </Frame>
  );
}
