import * as React from "react"
import { cn } from "@/lib/utils"

/** 05 §7.2: 40 px, sunken fill, 3:1 border, brand focus ring, danger when aria-invalid. */
const fieldClasses =
  "w-full min-w-0 rounded-md border border-border-strong bg-sunken px-3 text-body text-text-primary transition-[border-color,box-shadow] duration-(--dur-fast) outline-none placeholder:text-text-muted hover:border-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger"

function Input({
  className,
  type,
  suppressHydrationWarning = true,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning={suppressHydrationWarning}
      className={cn(
        fieldClasses,
        "h-10 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-text-primary",
        className
      )}
      {...props}
    />
  )
}

export { Input, fieldClasses }
