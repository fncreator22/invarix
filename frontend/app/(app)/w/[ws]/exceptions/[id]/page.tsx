import type { Metadata } from "next";
import { ExceptionDetail } from "@/components/exceptions/exception-detail";

export const metadata: Metadata = { title: "Exception" };

export default async function ExceptionDetailPage({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { id } = await params;
  return <ExceptionDetail id={decodeURIComponent(id)} />;
}
