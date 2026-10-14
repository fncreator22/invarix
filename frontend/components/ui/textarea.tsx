import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldClasses } from "@/components/ui/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClasses, "flex field-sizing-content min-h-24 py-2", className)}
      {...props}
    />
  )
}

export { Textarea }
