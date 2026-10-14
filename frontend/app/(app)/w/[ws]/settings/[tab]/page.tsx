import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { TABS, type SettingsTab } from "@/components/settings/tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ ws: string; tab: string }> }) {
  const { tab } = await params;
  if (!(tab in TABS)) notFound();
  return <SettingsScreen tab={tab as SettingsTab} />;
}
