import { redirect } from "next/navigation";
import { normalizeWorkspaceSlug } from "@/lib/workspace";

export default async function WorkspaceIndex({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  redirect(`/w/${normalizeWorkspaceSlug(ws)}/home`);
}
