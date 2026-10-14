import type { Metadata } from "next";
import { PeopleList } from "@/components/registry/registry";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  return <PeopleList />;
}
