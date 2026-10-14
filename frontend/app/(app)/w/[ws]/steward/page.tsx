import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/page-header";
import { StewardChat } from "@/components/steward/steward-chat";

export const metadata: Metadata = { title: "Steward" };

export default async function StewardPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <PageContainer className="flex h-[calc(100dvh-8.5rem)] max-w-[760px] flex-col space-y-0 pb-0">
      <PageHeader title="Steward" subtitle="Answers from the graph, with the proof. Nothing changes until you approve." />
      <div className="min-h-0 flex-1">
        <StewardChat initialPrompt={q} />
      </div>
    </PageContainer>
  );
}
