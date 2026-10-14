import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Long-form legal text with a table of contents (SCR-M-03). */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-28 pb-24 sm:px-6">
      <header className="max-w-2xl">
        <p className="eyebrow text-brand">Legal</p>
        <h1 className="mt-3 text-display-lg font-bold">{title}</h1>
        <p className="mt-3 text-body-sm text-text-muted">Last updated {updated}</p>
        <div className="mt-6 rounded-lg border border-warning/40 bg-warning-soft p-4 text-body-sm text-text-primary">{intro}</div>
      </header>
      <div className="mt-12 grid gap-10 md:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="md:sticky md:top-24 md:self-start">
          <p className="eyebrow text-text-muted">On this page</p>
          <ol className="mt-3 space-y-1 text-body-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex min-h-7 items-center gap-2 rounded-sm text-text-secondary hover:text-text-primary">
                  <span className="tabular w-5 text-text-muted">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-[70ch] space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
              <h2 id={`${s.id}-h`} className="text-h2 font-semibold">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-body-lg text-text-secondary [&_li]:ml-5 [&_li]:list-disc">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
