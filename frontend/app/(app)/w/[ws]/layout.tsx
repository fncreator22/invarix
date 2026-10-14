import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ ws: string }>;
}) {
  const { ws } = await params;
  return <AppShell slug={ws}>{children}</AppShell>;
}
