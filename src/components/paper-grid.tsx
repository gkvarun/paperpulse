import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, StickyNote } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { TRACKER_YEARS, getSubject, subjectCode, subjectPapers } from "../data/subjects";
import { paperId, type PaperRef } from "../lib/papacambridge";
import { SESSION_SLOTS, STATUS_LABELS, type PaperStatus } from "../lib/tracker";
import { Card } from "./ui";
import { StatusSwatch, statusCellClass } from "./status-swatch";
import { PaperRecordDialog } from "./paper-record-dialog";

const LEGEND: PaperStatus[] = ["not-started", "in-progress", "completed", "needs-revision"];

export function PaperGrid() {
  const { activeSubjectId, records } = useApp();
  const subject = getSubject(activeSubjectId);
  const code = subjectCode(subject);
  const papers = subjectPapers(subject);
  const [component, setComponent] = useState(papers[0].number);
  const [selected, setSelected] = useState<(PaperRef & { id: string }) | null>(null);

  useEffect(() => setComponent(subjectPapers(getSubject(activeSubjectId))[0].number), [activeSubjectId]);

  return (
    <Card as="section" className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Paper Tracker · {subject.name} <span className="font-mono text-sm text-muted">{code}</span>
          </h2>
          <p className="mt-1 text-sm text-muted">Click any variant to log status, score, notes and completion date.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-line p-0.5" role="tablist" aria-label="Paper component">
          {papers.map((p) => (
            <button
              key={p.number}
              type="button"
              role="tab"
              aria-selected={component === p.number}
              onClick={() => setComponent(p.number)}
              className={clsx("relative rounded-md px-3 py-1.5 text-xs font-bold tracking-tight", component === p.number ? "text-background" : "text-muted hover:text-foreground")}
              title={p.label}
            >
              {component === p.number && <motion.span layoutId="grid-tab" className="absolute inset-0 rounded-md bg-foreground" transition={{ duration: 0.2 }} />}
              <span className="relative">P{p.number}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th scope="col" className="w-16 text-left text-xs font-medium text-muted">
                <span className="sr-only">Year</span>
              </th>
              {SESSION_SLOTS.map((s) => (
                <th key={s.label} scope="col" className="text-center text-[11px] font-medium uppercase tracking-wider text-muted">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRACKER_YEARS.map((year) => (
              <tr key={year}>
                <th scope="row" className="text-left font-mono text-sm font-bold">
                  {year}
                </th>
                {SESSION_SLOTS.map((slot) => {
                  const ref: PaperRef = { code, series: slot.series, year, paper: `${component}${slot.variant}` };
                  const id = paperId(ref);
                  const rec = records[id];
                  const status = rec?.status ?? "not-started";
                  return (
                    <td key={slot.label}>
                      <button
                        type="button"
                        onClick={() => setSelected({ ...ref, id })}
                        aria-label={`${id}: ${STATUS_LABELS[status]}${rec?.score !== undefined ? `, ${rec.score}%` : ""}`}
                        className={clsx(
                          "relative flex h-11 w-full items-center justify-center rounded-md text-xs font-bold transition-transform hover:scale-[1.04] active:scale-95",
                          statusCellClass[status],
                        )}
                      >
                        {status === "completed" ? (
                          rec?.score !== undefined ? (
                            <span>{rec.score}</span>
                          ) : (
                            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                          )
                        ) : status === "not-started" ? (
                          <span className="font-mono text-[10px] font-medium opacity-60">
                            {component}
                            {slot.variant}
                          </span>
                        ) : (
                          rec?.score !== undefined && <span>{rec.score}</span>
                        )}
                        {rec?.notes && <StickyNote className="absolute right-1 top-1 size-2.5 opacity-70" aria-hidden="true" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
        {LEGEND.map((s) => (
          <li key={s} className="flex items-center gap-2 text-xs text-muted">
            <StatusSwatch status={s} />
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>

      <PaperRecordDialog paper={selected} subjectId={subject.id} onClose={() => setSelected(null)} />
    </Card>
  );
}
