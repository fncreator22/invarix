import type { Metadata } from "next";
import { AlertDetail } from "@/components/alerts/alert-detail";

export const metadata: Metadata = { title: "Alert" };

export default async function AlertDetailPage({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { id } = await params;
  return <AlertDetail id={decodeURIComponent(id)} />;
}
