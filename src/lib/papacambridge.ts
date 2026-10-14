import type { SeriesCode } from "../data/subjects";

const BASE = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload";

export type DocType = "qp" | "ms" | "er" | "gt";

export const DOC_LABELS: Record<DocType, string> = {
  qp: "Question Paper",
  ms: "Mark Scheme",
  er: "Examiner Report",
  gt: "Grade Thresholds",
};

export interface PaperRef {
  code: string;
  series: SeriesCode;
  year: number;
  /** Component + variant, e.g. "12" or "42". */
  paper: string;
}

export const yy = (year: number) => String(year).slice(-2);

export function paperFileName(ref: PaperRef, doc: DocType) {
  const session = `${ref.code}_${ref.series}${yy(ref.year)}`;
  return doc === "er" || doc === "gt" ? `${session}_${doc}.pdf` : `${session}_${doc}_${ref.paper}.pdf`;
}

export const paperUrl = (ref: PaperRef, doc: DocType) => `${BASE}/${paperFileName(ref, doc)}`;

export const paperId = (ref: PaperRef) => `${ref.code}_${ref.series}${yy(ref.year)}_${ref.paper}`;

/** Parses strings like "9702_s23_qp_12", "9702 w22 42" or "9702/s23/12". */
export function parsePaperQuery(input: string): PaperRef | null {
  const match = input.trim().toLowerCase().match(/^(\d{4})[\s_/-]*([msw])(\d{2})[\s_/-]*(?:qp|ms)?[\s_/-]*(\d{2})$/);
  if (!match) return null;
  const [, code, series, year, paper] = match;
  return { code, series: series as SeriesCode, year: 2000 + Number(year), paper };
}
