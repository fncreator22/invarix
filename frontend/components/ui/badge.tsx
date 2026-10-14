import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/** 05 §7.3: 22 px tall, caption text, soft fill with matching text, 14 px icon. */
const badgeVariants = cva(
  "inline-flex h-[22px] w-fit shrink-0 items-center gap-1 overflow-hidden rounded-none border border-transparent px-2 text-caption font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-brand-soft text-brand",
        neutral: "bg-neutral-soft text-text-secondary",
        outline: "border-border text-text-secondary",
        low: "bg-sev-low-soft text-sev-low",
        moderate: "bg-sev-moderate-soft text-sev-moderate",
        high: "bg-sev-high-soft text-sev-high",
        critical: "bg-sev-critical-soft text-sev-critical",
        info: "bg-info-soft text-info",
        proof: "bg-proof-soft text-proof",
        dashed: "border-dashed border-border-strong text-text-secondary",
        solid: "bg-brand-solid text-text-on-brand",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
