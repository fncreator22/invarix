import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/** 05 §7.1 button variants and sizes. */
const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-none font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-(--dur-fast) ease-(--ease-out) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand-solid text-text-on-brand shadow-highlight hover:-translate-y-px hover:shadow-glow",
        aurora:
          "bg-aurora text-text-on-brand shadow-glow [text-shadow:var(--on-aurora-text-shadow)] hover:-translate-y-px hover:brightness-110",
        secondary:
          "border border-border bg-surface text-text-primary hover:border-border-strong hover:bg-raised",
        outline:
          "border border-border-strong bg-transparent text-text-primary hover:bg-brand-soft",
        ghost: "text-text-secondary hover:bg-brand-soft hover:text-text-primary",
        destructive:
          "bg-sev-critical text-text-on-brand hover:brightness-110 dark:text-canvas",
        "destructive-outline":
          "border border-sev-critical text-sev-critical hover:bg-sev-critical-soft",
        link: "h-auto px-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-body-sm has-[>svg]:px-2.5",
        default: "h-9 px-4 text-body has-[>svg]:px-3",
        lg: "h-11 px-5 text-body font-semibold",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Inline spinner replaces the leading icon; label stays, width locked, aria-busy. */
    loading?: boolean
  }

function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {children}
      </Slot.Root>
    )
  }
  return (
    <button
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none")}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {/* Keep only text children so the label stays and the icon is replaced. */}
          {React.Children.toArray(children).filter((c) => typeof c === "string" || typeof c === "number")}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { Button, buttonVariants }
