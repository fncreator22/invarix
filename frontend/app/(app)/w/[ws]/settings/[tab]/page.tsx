import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { TABS, TAB_ALIASES, type SettingsTab } from "@/components/settings/tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ ws: string; tab: string }> }) {
  const { tab } = await params;
  const resolved = (tab in TABS ? tab : TAB_ALIASES[tab]) as SettingsTab | undefined;
  if (!resolved) notFound();
  return <SettingsScreen tab={resolved} />;
}

