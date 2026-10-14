import { SUBJECTS, TRACKER_YEARS, subjectCode, subjectPapers, variantsFor, type SeriesCode, type Subject } from "../data/subjects";
import { QUESTIONS } from "../data/questions";
import { paperId } from "./papacambridge";

export type PaperStatus = "not-started" | "in-progress" | "completed" | "needs-revision";

export const STATUS_LABELS: Record<PaperStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
  "needs-revision": "Needs Revision",
};

export interface PaperRecord {
  subjectId: string;
  year: number;
  status: PaperStatus;
  score?: number;
  notes?: string;
  completedAt?: string;
}

export type PaperRecords = Record<string, PaperRecord>;
export type QuestionResult = "correct" | "incorrect";
export type QuestionResults = Record<string, QuestionResult>;

export interface SessionSlot {
  series: SeriesCode;
  variant: number;
  label: string;
}

export const SESSION_SLOTS: SessionSlot[] = (["m", "s", "w"] as SeriesCode[]).flatMap((series) =>
  variantsFor(series).map((variant) => ({
    series,
    variant,
    label: `${series === "m" ? "FM" : series === "s" ? "MJ" : "ON"} v${variant}`,
  })),
);

export function slotsForSubject(subject: Subject) {
  const code = subjectCode(subject);
  return subjectPapers(subject).flatMap((component) =>
    TRACKER_YEARS.flatMap((year) =>
      SESSION_SLOTS.map((slot) => ({
        id: paperId({ code, series: slot.series, year, paper: `${component.number}${slot.variant}` }),
        year,
        component: component.number,
      })),
    ),
  );
}

export function subjectStats(subject: Subject, records: PaperRecords) {
  const slots = slotsForSubject(subject);
  let completed = 0;
  let inProgress = 0;
  let revision = 0;
  const scores: number[] = [];
  for (const slot of slots) {
    const r = records[slot.id];
    if (!r) continue;
    if (r.status === "completed") completed++;
    if (r.status === "in-progress") inProgress++;
    if (r.status === "needs-revision") revision++;
    if (typeof r.score === "number" && r.status !== "not-started") scores.push(r.score);
  }
  return {
    total: slots.length,
    completed,
    inProgress,
    revision,
    attempted: completed + inProgress + revision,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

export function yearStats(subjects: Subject[], records: PaperRecords) {
  return TRACKER_YEARS.map((year) => {
    let total = 0;
    let completed = 0;
    for (const s of subjects) {
      for (const slot of slotsForSubject(s)) {
        if (slot.year !== year) continue;
        total++;
        if (records[slot.id]?.status === "completed") completed++;
      }
    }
    return { year, total, completed, rate: total ? completed / total : 0 };
  });
}

export function weakTopics(results: QuestionResults, records: PaperRecords, subjectIds: string[]) {
  const tally = new Map<string, { subjectId: string; topic: string; correct: number; incorrect: number }>();
  for (const q of QUESTIONS) {
    const result = results[q.id];
    if (!result || !subjectIds.includes(q.subjectId)) continue;
    const key = `${q.subjectId}:${q.topic}`;
    const entry = tally.get(key) ?? { subjectId: q.subjectId, topic: q.topic, correct: 0, incorrect: 0 };
    entry[result]++;
    tally.set(key, entry);
  }
  const revisionCount = Object.values(records).filter((r) => r.status === "needs-revision").length;
  const alerts = [...tally.values()]
    .filter((t) => t.incorrect > 0 && t.incorrect >= t.correct)
    .sort((a, b) => b.incorrect - a.incorrect);
  return { alerts, revisionCount };
}

/** Deterministic starter progress so the dashboard is meaningful on first visit. */
export function seedRecords(): PaperRecords {
  const records: PaperRecords = {};
  const plan: { subjectId: string; components: number[]; years: number[] }[] = [
    { subjectId: "physics", components: [1, 2, 4], years: [2024, 2023, 2022, 2021] },
    { subjectId: "mathematics", components: [1, 3], years: [2024, 2023, 2022] },
    { subjectId: "chemistry", components: [2], years: [2023, 2022] },
  ];
  let n = 0;
  for (const p of plan) {
    const subject = SUBJECTS.find((s) => s.id === p.subjectId)!;
    const code = subjectCode(subject);
    for (const year of p.years) {
      for (const component of p.components) {
        for (const slot of SESSION_SLOTS) {
          n++;
          if (n % 3 === 0) continue;
          const id = paperId({ code, series: slot.series, year, paper: `${component}${slot.variant}` });
          const status: PaperStatus = n % 11 === 0 ? "needs-revision" : n % 7 === 0 ? "in-progress" : "completed";
          const score = status === "in-progress" ? undefined : 52 + ((n * 37) % 45);
          const month = String(1 + (n % 9)).padStart(2, "0");
          const day = String(1 + (n % 27)).padStart(2, "0");
          records[id] = {
            subjectId: p.subjectId,
            year,
            status,
            score,
            completedAt: status === "completed" ? `2026-${month}-${day}` : undefined,
          };
        }
      }
    }
  }
  return records;
}

export function seedQuestionResults(): QuestionResults {
  return {
    [QUESTIONS[4].id]: "incorrect",
    [QUESTIONS[5].id]: "incorrect",
    [QUESTIONS[0].id]: "correct",
    [QUESTIONS[2].id]: "correct",
    [QUESTIONS[11].id]: "incorrect",
    [QUESTIONS[15].id]: "incorrect",
    [QUESTIONS[14].id]: "correct",
  };
}
