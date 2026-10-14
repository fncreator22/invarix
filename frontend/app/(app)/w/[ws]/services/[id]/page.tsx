import type { Metadata } from "next";
import { ServiceDetail } from "@/components/registry/registry";

export const metadata: Metadata = { title: "Service" };

export default async function Page({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { id } = await params;
  return <ServiceDetail id={decodeURIComponent(id)} />;
}
