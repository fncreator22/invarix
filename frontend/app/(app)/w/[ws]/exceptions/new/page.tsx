import type { Metadata } from "next";
import { ExceptionForm } from "@/components/exceptions/exception-form";

export const metadata: Metadata = { title: "New exception" };

export default function NewExceptionPage() {
  return <ExceptionForm />;
}
