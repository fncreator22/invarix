import type { Metadata } from "next";
import { ReviewsInbox } from "@/components/reviews/reviews-inbox";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <ReviewsInbox />;
}
