import type { Metadata } from "next";
import { ExceptionsList } from "@/components/exceptions/exceptions-list";

export const metadata: Metadata = { title: "Exceptions" };

export default function ExceptionsPage() {
  return <ExceptionsList />;
}
