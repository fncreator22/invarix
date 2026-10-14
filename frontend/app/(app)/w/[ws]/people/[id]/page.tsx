import type { Metadata } from "next";
import { PersonDetail } from "@/components/registry/registry";

export const metadata: Metadata = { title: "Person" };

export default async function Page({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { id } = await params;
  return <PersonDetail id={decodeURIComponent(id)} />;
}
