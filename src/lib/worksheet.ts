import { getQuestion, type TopicalQuestion } from "../data/questions";
import { getSubject, seriesLabel, subjectCode } from "../data/subjects";

export const resolveWorksheet = (ids: string[]) => ids.map(getQuestion).filter((q): q is TopicalQuestion => !!q);

export const totalMarks = (qs: TopicalQuestion[]) => qs.reduce((sum, q) => sum + q.marks, 0);

export function sourceLabel(q: TopicalQuestion) {
  const code = subjectCode(getSubject(q.subjectId));
  return `${code} ${seriesLabel(q.series)} ${q.year} · Paper ${q.paper} Q${q.questionNumber}`;
}

export function downloadAnswerKey(title: string, qs: TopicalQuestion[]) {
  const lines = [
    `${title} — Answer Key`,
    `${qs.length} questions · ${totalMarks(qs)} marks`,
    "",
    ...qs.flatMap((q, i) => [
      `${i + 1}. [${q.marks} ${q.marks === 1 ? "mark" : "marks"}] ${q.topic} — ${sourceLabel(q)}`,
      ...q.markScheme.map((m) => `   • ${m}`),
      "",
    ]),
    "Generated with PaperPulse",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.trim().replace(/[^\w-]+/g, "-").toLowerCase() || "worksheet"}-answer-key.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
