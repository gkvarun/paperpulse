import { useApp } from "../store";
import { resolveWorksheet, sourceLabel, totalMarks } from "../lib/worksheet";

/** Rendered only for print; the interactive app shell is hidden with print:hidden. */
export function PrintableWorksheet({ title, includeAnswers }: { title: string; includeAnswers: boolean }) {
  const { worksheet } = useApp();
  const items = resolveWorksheet(worksheet);
  const heading = title.trim() || "Topical Worksheet";
  const withAnswers = includeAnswers;

  return (
    <div className="hidden font-sans text-black print:block">
      <header className="mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm">
          {items.length} questions · {totalMarks(items)} marks · Name: ____________________ Date: __________
        </p>
      </header>
      <ol className="flex flex-col gap-8">
        {items.map((q, i) => (
          <li key={q.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-bold">Question {i + 1}</p>
              <p className="text-xs">
                [{q.marks}] · {sourceLabel(q)}
              </p>
            </div>
            <p className="mt-2 leading-relaxed">{q.prompt}</p>
            <div className="mt-3 flex flex-col gap-5" aria-hidden="true">
              {Array.from({ length: Math.min(8, Math.max(2, q.marks)) }, (_, k) => (
                <div key={k} className="border-b border-dotted border-black/60" />
              ))}
            </div>
          </li>
        ))}
      </ol>
      {withAnswers && (
        <section className="mt-10 break-before-page">
          <h2 className="mb-4 border-b-2 border-black pb-2 text-xl font-black">Answer Key</h2>
          <ol className="flex flex-col gap-4">
            {items.map((q, i) => (
              <li key={q.id} className="break-inside-avoid text-sm">
                <p className="font-bold">
                  {i + 1}. {q.topic} — {sourceLabel(q)}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {q.markScheme.map((m, k) => (
                    <li key={k}>{m}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
