import type { Metadata } from "next";
import { ReviewDetail } from "@/components/reviews/review-detail";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewDetailPage({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { id } = await params;
  return <ReviewDetail id={decodeURIComponent(id)} />;
}
