import { redirect } from "next/navigation";

export default async function SettingsIndex({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  redirect(`/w/${ws}/settings/profile`);
}
