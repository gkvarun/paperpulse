import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Library, RotateCcw, Search } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { QUESTIONS } from "../data/questions";
import { SUBJECTS, TRACKER_YEARS, YEARS, getSubject, subjectPapers } from "../data/subjects";
import { Button, Card, EmptyState, Field, PageHeader, Select } from "../components/ui";
import { QuestionCard } from "../components/question-card";

const MIN_YEAR = YEARS[YEARS.length - 1];
const MAX_YEAR = YEARS[0];

export function TopicalBank() {
  const { activeSubjectId, topicalIntent, consumeTopicalIntent, worksheet, setWorksheet } = useApp();
  const [subjectId, setSubjectId] = useState(activeSubjectId);
  const [topics, setTopics] = useState<string[]>([]);
  const [component, setComponent] = useState<number | "all">("all");
  const [from, setFrom] = useState(MIN_YEAR);
  const [to, setTo] = useState(MAX_YEAR);
  const [search, setSearch] = useState("");

  const subject = getSubject(subjectId);
  const papers = subjectPapers(subject);

  useEffect(() => {
    setSubjectId(activeSubjectId);
    setTopics([]);
    setComponent("all");
  }, [activeSubjectId]);

  useEffect(() => {
    if (!topicalIntent) return;
    if (topicalIntent.subjectId) setSubjectId(topicalIntent.subjectId);
    setTopics(topicalIntent.topic ? [topicalIntent.topic] : []);
    setSearch(topicalIntent.search ?? "");
    setComponent("all");
    consumeTopicalIntent();
  }, [topicalIntent, consumeTopicalIntent]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return QUESTIONS.filter(
      (x) =>
        x.subjectId === subjectId &&
        (topics.length === 0 || topics.includes(x.topic)) &&
        (component === "all" || Number(x.paper[0]) === component) &&
        x.year >= Math.min(from, to) &&
        x.year <= Math.max(from, to) &&
        (!q || x.prompt.toLowerCase().includes(q) || x.topic.toLowerCase().includes(q)),
    ).sort((a, b) => b.year - a.year);
  }, [subjectId, topics, component, from, to, search]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of QUESTIONS) if (x.subjectId === subjectId) map.set(x.topic, (map.get(x.topic) ?? 0) + 1);
    return map;
  }, [subjectId]);

  const reset = () => {
    setTopics([]);
    setComponent("all");
    setFrom(MIN_YEAR);
    setTo(MAX_YEAR);
    setSearch("");
  };

  const notAdded = results.filter((r) => !worksheet.includes(r.id));

  return (
    <div>
      <PageHeader
        title="Topical Bank"
        description="Filter past paper questions by topic, component and year, check them against the mark scheme, and collect them into a worksheet."
        actions={
          <Button variant="outline" disabled={notAdded.length === 0} onClick={() => setWorksheet([...worksheet, ...notAdded.map((r) => r.id)])}>
            Add all {notAdded.length > 0 ? notAdded.length : ""} to worksheet
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex h-fit flex-col gap-5 p-5 lg:sticky lg:top-24">
          <Field label="Subject">
            {(id) => (
              <Select
                id={id}
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopics([]);
                  setComponent("all");
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Topics</legend>
            <div className="flex flex-wrap gap-1.5">
              {subject.topics.map((t) => {
                const active = topics.includes(t);
                const count = counts.get(t) ?? 0;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTopics((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))}
                    className={clsx(
                      "rounded-md border px-2.5 py-1 text-xs font-medium tracking-tight transition-colors",
                      active ? "border-foreground bg-foreground text-background" : "border-line text-muted hover:border-line-strong hover:text-foreground",
                      count === 0 && !active && "opacity-50",
                    )}
                  >
                    {t}
                    <span className="ml-1 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field label="Paper type">
            {(id) => (
              <Select id={id} value={component} onChange={(e) => setComponent(e.target.value === "all" ? "all" : Number(e.target.value))}>
                <option value="all">All papers</option>
                {papers.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.short}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              {(id) => (
                <Select id={id} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                  {[...YEARS].reverse().map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="To">
              {(id) => (
                <Select id={id} value={to} onChange={(e) => setTo(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="flex gap-1.5">
            {[
              { label: "Last 3 yrs", from: MAX_YEAR - 2 },
              { label: "2018+", from: TRACKER_YEARS[TRACKER_YEARS.length - 1] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setFrom(preset.from);
                  setTo(MAX_YEAR);
                }}
                className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={reset} className="self-start">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset filters
          </Button>
        </Card>

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search within questions"
                aria-label="Search within questions"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted"
              />
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              <span className="font-bold text-foreground">{results.length}</span> {results.length === 1 ? "question" : "questions"}
            </p>
          </div>

          {results.length === 0 ? (
            <EmptyState icon={<Library className="size-5" />} title="No questions match" description="Widen the year range or clear topic filters to see more questions." action={<Button size="sm" onClick={reset}>Reset filters</Button>} />
          ) : (
            <ul className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {results.map((q) => (
                  <QuestionCard key={q.id} question={q} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
