import { useMemo } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "../store";
import { SUBJECTS, getSubject, subjectCode } from "../data/subjects";
import { subjectStats, weakTopics, yearStats } from "../lib/tracker";
import { Card, PageHeader, ProgressBar } from "../components/ui";
import { PaperGrid } from "../components/paper-grid";

function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint: string; icon: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted">
        <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </Card>
  );
}

export function Dashboard() {
  const { trackedSubjects, records, questionResults, setActiveSubjectId, activeSubjectId, openInTopical } = useApp();
  const subjects = SUBJECTS.filter((s) => trackedSubjects.includes(s.id));

  const perSubject = useMemo(() => subjects.map((s) => ({ subject: s, ...subjectStats(s, records) })), [subjects, records]);
  const years = useMemo(() => yearStats(subjects, records), [subjects, records]);
  const weak = useMemo(() => weakTopics(questionResults, records, trackedSubjects), [questionResults, records, trackedSubjects]);

  const total = perSubject.reduce((a, s) => a + s.total, 0);
  const completed = perSubject.reduce((a, s) => a + s.completed, 0);
  const allScores = Object.values(records).filter((r) => trackedSubjects.includes(r.subjectId) && typeof r.score === "number" && r.status !== "not-started");
  const avg = allScores.length ? Math.round(allScores.reduce((a, r) => a + (r.score ?? 0), 0) / allScores.length) : null;
  const rate = total ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Your past paper progress across tracked subjects, with the areas that need attention." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Completion rate" value={`${rate.toFixed(1)}%`} hint={`${completed} of ${total} variants`} icon={<Gauge className="size-4" />} />
        <Stat label="Papers completed" value={completed} hint={`across ${subjects.length} subjects`} icon={<CheckCircle2 className="size-4" />} />
        <Stat label="Average score" value={avg === null ? "—" : `${avg}%`} hint={`from ${allScores.length} self-assessed papers`} icon={<Target className="size-4" />} />
        <Stat label="Needs revision" value={weak.revisionCount} hint={`${weak.alerts.length} weak topic alerts`} icon={<AlertTriangle className="size-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card as="section" className="p-5 xl:col-span-2">
          <h2 className="text-lg font-bold tracking-tight">Progress by subject</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {perSubject.map(({ subject, total, completed, averageScore }) => {
              const pct = total ? (completed / total) * 100 : 0;
              const active = subject.id === activeSubjectId;
              return (
                <li key={subject.id}>
                  <button type="button" onClick={() => setActiveSubjectId(subject.id)} className="group w-full text-left" aria-pressed={active}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-bold tracking-tight">
                        {subject.name} <span className="font-mono text-xs font-normal text-muted">{subjectCode(subject)}</span>
                        {active && <span className="ml-2 text-xs font-medium text-muted">· shown below</span>}
                      </span>
                      <span className="text-muted">
                        <span className="font-bold text-foreground">{pct.toFixed(0)}%</span> · {completed}/{total}
                        {averageScore !== null && ` · avg ${averageScore}%`}
                      </span>
                    </div>
                    <ProgressBar value={pct} label={`${subject.name} completion`} className="group-hover:bg-line" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Weak topic alerts
          </h2>
          {weak.alerts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No weak topics yet. Self-assess questions in the Topical Bank to surface them here.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {weak.alerts.slice(0, 5).map((a) => (
                <li key={`${a.subjectId}-${a.topic}`}>
                  <button
                    type="button"
                    onClick={() => openInTopical({ subjectId: a.subjectId, topic: a.topic })}
                    className="group flex w-full items-center gap-3 rounded-lg border border-dotted border-line-strong p-3 text-left hover:border-foreground"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tracking-tight">{a.topic}</p>
                      <p className="text-xs text-muted">
                        {getSubject(a.subjectId).name} · {a.incorrect} wrong, {a.correct} right
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card as="section" className="p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <TrendingUp className="size-4" aria-hidden="true" />
          Progress by year
        </h2>
        <ul className="mt-5 grid grid-cols-7 items-end gap-2 sm:gap-4">
          {years.map((y) => (
            <li key={y.year} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold">{Math.round(y.rate * 100)}%</span>
              <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-hover" role="img" aria-label={`${y.year}: ${y.completed} of ${y.total} completed`}>
                <div className="w-full rounded-md bg-foreground transition-all duration-700" style={{ height: `${Math.max(2, y.rate * 100)}%` }} />
              </div>
              <span className="font-mono text-xs text-muted">{y.year}</span>
            </li>
          ))}
        </ul>
      </Card>

      <PaperGrid />
    </div>
  );
}
