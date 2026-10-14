import type { Metadata } from "next";
import { ServicesList } from "@/components/registry/registry";

export const metadata: Metadata = { title: "Services" };

export default function Page() {
  return <ServicesList />;
}
