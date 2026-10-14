import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 05 §6.4: title, subtitle, right-aligned actions (max one primary). */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 text-text-muted">{eyebrow}</p>}
        <h1 className="text-h1 font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-body text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Content container with the shell padding and max widths from 05 §6.1. */
export function PageContainer({
  children,
  width = "list",
  className,
}: {
  children: ReactNode;
  width?: "list" | "home" | "full";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-8 px-4 py-6 sm:px-5 md:px-6 lg:px-8",
        width === "list" && "max-w-[1200px]",
        width === "home" && "max-w-[1360px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
