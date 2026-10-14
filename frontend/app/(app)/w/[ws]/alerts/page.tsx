import type { Metadata } from "next";
import { AlertsList } from "@/components/alerts/alerts-list";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return <AlertsList />;
}
