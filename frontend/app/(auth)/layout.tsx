import type { ReactNode } from "react";
import { Prewarm } from "@/components/marketing/prewarm";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background">
      <Prewarm />
      {children}
    </div>
  );
}
