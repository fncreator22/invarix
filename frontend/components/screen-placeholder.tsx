import { Constellation } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/page-header";

/** Temporary page body for R0 routes whose screen is built in the follow-up task. */
export function ScreenPlaceholder({
  title,
  subtitle,
  screenId,
  children,
}: {
  title: string;
  subtitle?: string;
  screenId: string;
  children?: React.ReactNode;
}) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={subtitle} />
      <section className="card-e1 flex flex-col items-center px-6 py-14 text-center">
        <Constellation className="mb-4 text-brand" />
        <h2 className="font-sans text-h3 font-semibold">This screen is coming next</h2>
        <p className="mt-1.5 max-w-md text-text-secondary">
          The shell, navigation and data layer are in place. The {title.toLowerCase()} screen ({screenId}) is built in
          the next step.
        </p>
        {children && <div className="mt-4 text-body-sm text-text-muted">{children}</div>}
      </section>
    </PageContainer>
  );
}
