import type { Metadata } from "next";
import { ControlsList } from "@/components/registry/registry";

export const metadata: Metadata = { title: "Controls" };

export default function Page() {
  return <ControlsList />;
}
