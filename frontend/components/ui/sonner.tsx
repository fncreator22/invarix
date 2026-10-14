"use client"

import { CircleCheck, Info, Loader2, CircleX, TriangleAlert } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useMediaQuery } from "@/lib/hooks"

/** 05 §11: top-right on desktop, bottom on mobile, max 3 stacked, 4 s default. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "system" } = useTheme()
  const desktop = useMediaQuery("(min-width: 640px)", true)

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      position={desktop ? "top-right" : "bottom-center"}
      visibleToasts={3}
      duration={4000}
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-success" />,
        info: <Info className="size-4 text-info" />,
        warning: <TriangleAlert className="size-4 text-warning" />,
        error: <CircleX className="size-4 text-danger" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--bg-raised)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-subtle)",
          "--border-radius": "var(--radius-md)",
          zIndex: "var(--z-toast)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "shadow-e2 font-sans", description: "text-text-secondary" } }}
      {...props}
    />
  )
}

export { Toaster }
