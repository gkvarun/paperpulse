import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, Minus, Plus, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import type { TopicalQuestion } from "../data/questions";
import { getSubject, seriesLabel, subjectCode } from "../data/subjects";
import { paperUrl } from "../lib/papacambridge";
import { Badge, Button, Card } from "./ui";

export function QuestionCard({ question }: { question: TopicalQuestion }) {
  const { worksheet, toggleWorksheetItem, questionResults, setQuestionResult } = useApp();
  const [open, setOpen] = useState(false);
  const subject = getSubject(question.subjectId);
  const code = subjectCode(subject);
  const inWorksheet = worksheet.includes(question.id);
  const result = questionResults[question.id];
  const ref = { code, series: question.series, year: question.year, paper: question.paper };
  const panelId = `ms-${question.id}`;
  const pagePassage = (question as any).recordType === "page-passage";
  const sourceUrl = (question as any).sourceUrl as string | undefined;
  const sourcePage = (question as any).sourcePage as number | undefined;

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <Card as="article" className={clsx("p-5 transition-colors hover:border-line-strong", inWorksheet && "border-foreground")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-foreground font-bold text-foreground">{question.topic}</Badge>
          <Badge>{question.series === "unknown" ? "Session unknown" : seriesLabel(question.series)} {question.year || "Year unknown"}</Badge>
          <Badge>Paper {question.paper}</Badge>
          <Badge>{pagePassage ? `Page ${sourcePage ?? question.questionNumber}` : `Q${question.questionNumber}`}</Badge>
          {!pagePassage && <Badge>{question.marks} {question.marks === 1 ? "mark" : "marks"}</Badge>}
          <a
            href={sourceUrl || paperUrl(ref, "qp")}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
            aria-label={pagePassage ? "Open original PDF source" : `Open source paper ${code} ${question.series}${String(question.year).slice(-2)} ${question.paper}`}
          >
            {code}
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>

        <p className="mt-4 text-pretty text-[15px] leading-relaxed">{question.prompt}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={inWorksheet ? "primary" : "outline"} onClick={() => toggleWorksheetItem(question.id)} aria-pressed={inWorksheet}>
            {inWorksheet ? <Minus className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
            {inWorksheet ? "Remove" : "Add to Worksheet"}
          </Button>
          {!pagePassage && (
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}>
              Mark Scheme
              <ChevronDown className={clsx("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
            </Button>
          )}
          {!pagePassage && (
            <div className="ml-auto flex items-center gap-1" role="group" aria-label="Self-assessment">
              <button
                type="button"
                onClick={() => setQuestionResult(question.id, result === "correct" ? null : "correct")}
                aria-pressed={result === "correct"}
                aria-label="Mark as correct"
                className={clsx("flex size-8 items-center justify-center rounded-lg border transition-colors", result === "correct" ? "border-foreground bg-foreground text-background" : "border-line text-muted hover:text-foreground")}
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setQuestionResult(question.id, result === "incorrect" ? null : "incorrect")}
                aria-pressed={result === "incorrect"}
                aria-label="Mark as incorrect"
                className={clsx("flex size-8 items-center justify-center rounded-lg border transition-colors", result === "incorrect" ? "border-dotted border-foreground text-foreground" : "border-line text-muted hover:text-foreground")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {!pagePassage && (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <ol className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                  {question.markScheme.map((line, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Card>
    </motion.li>
  );
}
