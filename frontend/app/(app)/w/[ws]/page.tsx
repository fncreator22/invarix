import { redirect } from "next/navigation";

export default async function WorkspaceIndex({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  redirect(`/w/${ws}/home`);
}
