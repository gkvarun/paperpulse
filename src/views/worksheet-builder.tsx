import { Download, FileStack, Printer, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { usePersistentState } from "../lib/use-persistent-state";
import { downloadAnswerKey, resolveWorksheet, totalMarks } from "../lib/worksheet";
import { Button, Card, EmptyState, PageHeader } from "../components/ui";
import { WorksheetList } from "../components/worksheet-list";
import { PrintableWorksheet } from "../components/printable-worksheet";

export function WorksheetBuilder() {
  const { worksheet, setWorksheet, setView } = useApp();
  const [title, setTitle] = usePersistentState("worksheetTitle", "Topical Worksheet");
  const [includeAnswers, setIncludeAnswers] = usePersistentState("worksheetAnswers", false);
  const items = resolveWorksheet(worksheet);
  const topics = [...new Set(items.map((q) => q.topic))];

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Worksheet Builder"
          description="Reorder questions by dragging or with the arrows, then print a clean worksheet or download the compiled answer key."
          actions={
            <>
              <Button variant="ghost" disabled={!items.length} onClick={() => setWorksheet([])}>
                <Trash2 className="size-4" aria-hidden="true" />
                Clear
              </Button>
              <Button disabled={!items.length} onClick={() => downloadAnswerKey(title, items)}>
                <Download className="size-4" aria-hidden="true" />
                Answer key
              </Button>
              <Button variant="primary" disabled={!items.length} onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden="true" />
                Print / PDF
              </Button>
            </>
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<FileStack className="size-5" />}
            title="No questions yet"
            description="Use “Add to Worksheet” on any question in the Topical Bank to start building."
            action={<Button size="sm" onClick={() => setView("topical")}>Open Topical Bank</Button>}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <WorksheetList />
            <Card className="flex h-fit flex-col gap-5 p-5 lg:sticky lg:top-24">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Worksheet title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium"
                />
              </label>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-xs text-muted">Questions</dt>
                  <dd className="text-2xl font-black tracking-tight">{items.length}</dd>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <dt className="text-xs text-muted">Total marks</dt>
                  <dd className="text-2xl font-black tracking-tight">{totalMarks(items)}</dd>
                </div>
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Topics covered</p>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <span key={t} className="rounded-md border border-line px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeAnswers}
                onClick={() => setIncludeAnswers((v) => !v)}
                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left text-sm font-medium"
              >
                Append answer key when printing
                <span className={clsx("relative h-5 w-9 shrink-0 rounded-full border transition-colors", includeAnswers ? "border-foreground bg-foreground" : "border-line bg-hover")}>
                  <span className={clsx("absolute top-0.5 size-3.5 rounded-full transition-all", includeAnswers ? "left-[18px] bg-background" : "left-0.5 bg-muted")} />
                </span>
              </button>
            </Card>
          </div>
        )}
      </div>
      <PrintableWorksheet title={title} includeAnswers={includeAnswers} />
    </>
  );
}
