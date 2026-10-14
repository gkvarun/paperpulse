import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { STATUS_LABELS, type PaperStatus } from "../lib/tracker";
import { DOC_LABELS, paperFileName, paperUrl, type PaperRef } from "../lib/papacambridge";
import { seriesLabel } from "../data/subjects";
import { Button, Modal } from "./ui";
import { StatusSwatch } from "./status-swatch";

const STATUSES: PaperStatus[] = ["not-started", "in-progress", "completed", "needs-revision"];

export function PaperRecordDialog({ paper, subjectId, onClose }: { paper: (PaperRef & { id: string }) | null; subjectId: string; onClose: () => void }) {
  const { records, savePaperRecord } = useApp();
  const existing = paper ? records[paper.id] : undefined;
  const [status, setStatus] = useState<PaperStatus>("not-started");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!paper) return;
    setStatus(existing?.status ?? "not-started");
    setScore(existing?.score !== undefined ? String(existing.score) : "");
    setNotes(existing?.notes ?? "");
    setDate(existing?.completedAt ?? "");
    // Reset the form only when a different paper is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper?.id]);

  const lastPaper = useRef(paper);
  if (paper) lastPaper.current = paper;
  const shown = paper ?? lastPaper.current;
  if (!shown) return null;

  const save = () => {
    if (!paper) return;
    const parsed = score.trim() === "" ? undefined : Math.max(0, Math.min(100, Math.round(Number(score))));
    savePaperRecord(paper.id, {
      subjectId,
      year: paper.year,
      status,
      score: Number.isFinite(parsed) ? parsed : undefined,
      notes: notes.trim() || undefined,
      completedAt: status === "completed" ? date || new Date().toISOString().slice(0, 10) : date || undefined,
    });
    onClose();
  };

  return (
    <Modal open={!!paper} onClose={onClose} title={`${shown.code} · Paper ${shown.paper}`} description={`${seriesLabel(shown.series)} ${shown.year}`}>
      <form
        className="flex flex-col gap-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Status</legend>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  if (s === "completed" && !date) setDate(new Date().toISOString().slice(0, 10));
                }}
                aria-pressed={status === s}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium tracking-tight transition-colors",
                  status === s ? "border-foreground bg-hover" : "border-line hover:bg-hover",
                )}
              >
                <StatusSwatch status={s} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Score (%)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 78"
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-muted"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Lost marks on Q4 — revisit circular motion."
            className="resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-relaxed placeholder:text-muted"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {(["qp", "ms"] as const).map((doc) => (
            <a
              key={doc}
              href={paperUrl(shown, doc)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium hover:bg-hover"
              title={paperFileName(shown, doc)}
            >
              {DOC_LABELS[doc]}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            <Check className="size-4" aria-hidden="true" />
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
