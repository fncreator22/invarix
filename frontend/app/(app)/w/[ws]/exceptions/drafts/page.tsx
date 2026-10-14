import type { Metadata } from "next";
import { StagedDrafts } from "@/components/exceptions/staged-drafts";

export const metadata: Metadata = { title: "Capture from text" };

export default function DraftsPage() {
  return <StagedDrafts />;
}
