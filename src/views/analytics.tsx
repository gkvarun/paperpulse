import { useMemo } from "react";
import { useApp } from "../store";
import { QUESTIONS } from "../data/questions";
import { SUBJECTS, getSubject, subjectPapers } from "../data/subjects";
import { STATUS_LABELS, slotsForSubject, type PaperStatus } from "../lib/tracker";
import { Card, PageHeader, ProgressBar } from "../components/ui";
import { StatusSwatch } from "../components/status-swatch";

const STATUSES: PaperStatus[] = ["completed", "in-progress", "needs-revision", "not-started"];

export function Analytics() {
  const { trackedSubjects, records, questionResults, activeSubjectId } = useApp();
  const subjects = SUBJECTS.filter((s) => trackedSubjects.includes(s.id));

  const distribution = useMemo(() => {
    const counts: Record<PaperStatus, number> = { completed: 0, "in-progress": 0, "needs-revision": 0, "not-started": 0 };
    let total = 0;
    for (const s of subjects)
      for (const slot of slotsForSubject(s)) {
        total++;
        counts[records[slot.id]?.status ?? "not-started"]++;
      }
    return { counts, total };
  }, [subjects, records]);

  const subject = getSubject(activeSubjectId);
  const byComponent = useMemo(
    () =>
      subjectPapers(subject).map((p) => {
        const slots = slotsForSubject(subject).filter((s) => s.component === p.number);
        const recs = slots.map((s) => records[s.id]).filter(Boolean);
        const scores = recs.map((r) => r!.score).filter((x): x is number => typeof x === "number");
        return {
          paper: p,
          completed: recs.filter((r) => r!.status === "completed").length,
          total: slots.length,
          avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        };
      }),
    [subject, records],
  );

  const topicAccuracy = useMemo(() => {
    const map = new Map<string, { topic: string; subjectId: string; correct: number; attempted: number }>();
    for (const q of QUESTIONS) {
      const r = questionResults[q.id];
      if (!r || !trackedSubjects.includes(q.subjectId)) continue;
      const key = `${q.subjectId}:${q.topic}`;
      const e = map.get(key) ?? { topic: q.topic, subjectId: q.subjectId, correct: 0, attempted: 0 };
      e.attempted++;
      if (r === "correct") e.correct++;
      map.set(key, e);
    }
    return [...map.values()].sort((a, b) => a.correct / a.attempted - b.correct / b.attempted);
  }, [questionResults, trackedSubjects]);

  const recent = useMemo(
    () =>
      Object.entries(records)
        .filter(([, r]) => r.completedAt && trackedSubjects.includes(r.subjectId))
        .sort(([, a], [, b]) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
        .slice(0, 8),
    [records, trackedSubjects],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="A deeper look at how your practice is distributed and where marks are being lost." />

      <Card as="section" className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Status distribution</h2>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-hover" role="img" aria-label="Status distribution across all tracked variants">
          {STATUSES.filter((s) => s !== "not-started").map((s) => (
            <div
              key={s}
              style={{ width: `${(distribution.counts[s] / Math.max(1, distribution.total)) * 100}%` }}
              className={s === "completed" ? "bg-foreground" : s === "in-progress" ? "bg-accent" : "bg-muted"}
            />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUSES.map((s) => (
            <li key={s} className="rounded-lg border border-line p-3">
              <p className="flex items-center gap-2 text-xs text-muted">
                <StatusSwatch status={s} />
                {STATUS_LABELS[s]}
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight">{distribution.counts[s]}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section" className="p-5">
          <h2 className="text-lg font-bold tracking-tight">{subject.name} by component</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {byComponent.map((c) => (
              <li key={c.paper.number}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{c.paper.label}</span>
                  <span className="shrink-0 text-muted">
                    {c.completed}/{c.total}
                    {c.avg !== null && <span className="font-bold text-foreground"> · {c.avg}%</span>}
                  </span>
                </div>
                <ProgressBar value={(c.completed / c.total) * 100} label={`${c.paper.label} completion`} />
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="text-lg font-bold tracking-tight">Topic accuracy</h2>
          {topicAccuracy.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Mark questions correct or incorrect in the Topical Bank to build this view.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {topicAccuracy.map((t) => {
                const pct = (t.correct / t.attempted) * 100;
                return (
                  <li key={`${t.subjectId}-${t.topic}`}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {t.topic} <span className="text-xs text-muted">{getSubject(t.subjectId).name}</span>
                      </span>
                      <span className="text-muted">
                        <span className="font-bold text-foreground">{Math.round(pct)}%</span> of {t.attempted}
                      </span>
                    </div>
                    <ProgressBar value={pct} label={`${t.topic} accuracy`} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card as="section" className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Recently completed</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map(([id, r]) => (
              <li key={id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="flex items-center gap-3">
                  <StatusSwatch status={r.status} />
                  <span className="font-mono font-bold">{id}</span>
                  <span className="hidden text-muted sm:inline">{getSubject(r.subjectId).name}</span>
                </span>
                <span className="text-muted">
                  {r.score !== undefined && <span className="mr-3 font-bold text-foreground">{r.score}%</span>}
                  {r.completedAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
