import { CircleX } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form field (05 §7.2): label above, helper below, error replaces helper with an icon.
 * Give the control `id`, `aria-invalid` and `aria-describedby={describedBy(id, error)}`.
 */
export function Field({
  id,
  label,
  helper,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  helper?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-body-sm font-medium text-text-primary">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-body-sm text-danger">
          <CircleX aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : (
        helper && (
          <p id={`${id}-helper`} className="text-body-sm text-text-muted">
            {helper}
          </p>
        )
      )}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hasHelper = true) =>
  error ? `${id}-error` : hasHelper ? `${id}-helper` : undefined;
