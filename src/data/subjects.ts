export type Qualification = "A-Level" | "AS-Level" | "IGCSE";
export type SeriesCode = "m" | "s" | "w";

export interface PaperComponent {
  number: number;
  label: string;
  short: string;
}

export interface Subject {
  id: string;
  name: string;
  /** Syllabus code per qualification. AS and A Level share a syllabus. */
  codes: Partial<Record<Qualification, string>>;
  papers: Partial<Record<Qualification, PaperComponent[]>>;
  topics: string[];
}

export const QUALIFICATIONS: Qualification[] = ["A-Level", "AS-Level", "IGCSE"];

export const SERIES: { code: SeriesCode; label: string; short: string }[] = [
  { code: "m", label: "Feb/March", short: "FM" },
  { code: "s", label: "May/June", short: "MJ" },
  { code: "w", label: "Oct/Nov", short: "ON" },
];

export const YEARS = Array.from({ length: 10 }, (_, i) => 2024 - i);
export const TRACKER_YEARS = Array.from({ length: 7 }, (_, i) => 2024 - i);

/** Feb/March only publishes variant 2; June and November publish 1–3. */
export const variantsFor = (series: SeriesCode) => (series === "m" ? [2] : [1, 2, 3]);

const sciencePapers = (asOnly: boolean): PaperComponent[] =>
  [
    { number: 1, label: "Paper 1 — Multiple Choice", short: "P1 MCQ" },
    { number: 2, label: "Paper 2 — AS Structured", short: "P2 Structured" },
    { number: 3, label: "Paper 3 — Practical", short: "P3 Practical" },
    { number: 4, label: "Paper 4 — A2 Structured", short: "P4 A2 Structured" },
    { number: 5, label: "Paper 5 — Planning & Analysis", short: "P5 Planning" },
  ].filter((p) => !asOnly || p.number <= 3);

const igcseSciencePapers: PaperComponent[] = [
  { number: 2, label: "Paper 2 — Extended MCQ", short: "P2 MCQ" },
  { number: 4, label: "Paper 4 — Extended Theory", short: "P4 Theory" },
  { number: 6, label: "Paper 6 — Alternative to Practical", short: "P6 ATP" },
];

export const SUBJECTS: Subject[] = [
  {
    id: "physics",
    name: "Physics",
    codes: { "A-Level": "9702", "AS-Level": "9702", IGCSE: "0625" },
    papers: { "A-Level": sciencePapers(false), "AS-Level": sciencePapers(true), IGCSE: igcseSciencePapers },
    topics: ["Kinematics", "Dynamics", "Forces & Moments", "Work, Energy & Power", "Waves", "Electricity", "Fields", "Quantum Physics", "Nuclear Physics"],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    codes: { "A-Level": "9701", "AS-Level": "9701", IGCSE: "0620" },
    papers: { "A-Level": sciencePapers(false), "AS-Level": sciencePapers(true), IGCSE: igcseSciencePapers },
    topics: ["Atomic Structure", "Chemical Bonding", "Energetics", "Equilibria", "Reaction Kinetics", "Organic Chemistry", "Electrochemistry"],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    codes: { "A-Level": "9709", "AS-Level": "9709", IGCSE: "0580" },
    papers: {
      "A-Level": [
        { number: 1, label: "Paper 1 — Pure Mathematics 1", short: "P1 Pure 1" },
        { number: 3, label: "Paper 3 — Pure Mathematics 3", short: "P3 Pure 3" },
        { number: 4, label: "Paper 4 — Mechanics", short: "P4 Mechanics" },
        { number: 5, label: "Paper 5 — Probability & Statistics 1", short: "P5 Stats 1" },
        { number: 6, label: "Paper 6 — Probability & Statistics 2", short: "P6 Stats 2" },
      ],
      "AS-Level": [
        { number: 1, label: "Paper 1 — Pure Mathematics 1", short: "P1 Pure 1" },
        { number: 4, label: "Paper 4 — Mechanics", short: "P4 Mechanics" },
        { number: 5, label: "Paper 5 — Probability & Statistics 1", short: "P5 Stats 1" },
      ],
      IGCSE: [
        { number: 2, label: "Paper 2 — Extended (Non-calculator)", short: "P2 Extended" },
        { number: 4, label: "Paper 4 — Extended (Calculator)", short: "P4 Extended" },
      ],
    },
    topics: ["Quadratics", "Functions", "Differentiation", "Integration", "Trigonometry", "Vectors", "Probability", "Mechanics"],
  },
  {
    id: "further-math",
    name: "Further Mathematics",
    codes: { "A-Level": "9231", "AS-Level": "9231", IGCSE: "0606" },
    papers: {
      "A-Level": [
        { number: 1, label: "Paper 1 — Further Pure 1", short: "P1 FP1" },
        { number: 2, label: "Paper 2 — Further Pure 2", short: "P2 FP2" },
        { number: 3, label: "Paper 3 — Further Mechanics", short: "P3 F.Mech" },
        { number: 4, label: "Paper 4 — Further Statistics", short: "P4 F.Stats" },
      ],
      "AS-Level": [{ number: 1, label: "Paper 1 — Further Pure 1", short: "P1 FP1" }],
      IGCSE: [
        { number: 1, label: "Paper 1 — Additional Maths", short: "P1" },
        { number: 2, label: "Paper 2 — Additional Maths", short: "P2" },
      ],
    },
    topics: ["Matrices", "Complex Numbers", "Polar Coordinates", "Proof by Induction", "Differential Equations"],
  },
  {
    id: "it",
    name: "Information Technology",
    codes: { "A-Level": "9626", "AS-Level": "9626", IGCSE: "0417" },
    papers: {
      "A-Level": [
        { number: 1, label: "Paper 1 — Theory", short: "P1 Theory" },
        { number: 2, label: "Paper 2 — Practical", short: "P2 Practical" },
        { number: 3, label: "Paper 3 — Advanced Theory", short: "P3 Adv. Theory" },
        { number: 4, label: "Paper 4 — Advanced Practical", short: "P4 Adv. Practical" },
      ],
      "AS-Level": [
        { number: 1, label: "Paper 1 — Theory", short: "P1 Theory" },
        { number: 2, label: "Paper 2 — Practical", short: "P2 Practical" },
      ],
      IGCSE: [
        { number: 1, label: "Paper 1 — Theory", short: "P1 Theory" },
        { number: 2, label: "Paper 2 — Document Production", short: "P2 Practical" },
        { number: 3, label: "Paper 3 — Data Analysis & Website", short: "P3 Practical" },
      ],
    },
    topics: ["Data Processing", "Hardware & Software", "Networks", "Spreadsheets", "Databases"],
  },
  {
    id: "computer-science",
    name: "Computer Science",
    codes: { "A-Level": "9618", "AS-Level": "9618", IGCSE: "0478" },
    papers: {
      "A-Level": [
        { number: 1, label: "Paper 1 — Theory Fundamentals", short: "P1 Theory" },
        { number: 2, label: "Paper 2 — Problem-solving & Programming", short: "P2 Programming" },
        { number: 3, label: "Paper 3 — Advanced Theory", short: "P3 Adv. Theory" },
        { number: 4, label: "Paper 4 — Practical", short: "P4 Practical" },
      ],
      "AS-Level": [
        { number: 1, label: "Paper 1 — Theory Fundamentals", short: "P1 Theory" },
        { number: 2, label: "Paper 2 — Problem-solving & Programming", short: "P2 Programming" },
      ],
      IGCSE: [
        { number: 1, label: "Paper 1 — Computer Systems", short: "P1 Systems" },
        { number: 2, label: "Paper 2 — Algorithms & Programming", short: "P2 Algorithms" },
      ],
    },
    topics: ["Data Representation", "Logic Gates", "Algorithms", "Databases", "Networking", "Processor Fundamentals"],
  },
  {
    id: "biology",
    name: "Biology",
    codes: { "A-Level": "9700", "AS-Level": "9700", IGCSE: "0610" },
    papers: { "A-Level": sciencePapers(false), "AS-Level": sciencePapers(true), IGCSE: igcseSciencePapers },
    topics: ["Cell Structure", "Biological Molecules", "Enzymes", "Transport", "Genetics", "Immunity"],
  },
  {
    id: "economics",
    name: "Economics",
    codes: { "A-Level": "9708", "AS-Level": "9708", IGCSE: "0455" },
    papers: {
      "A-Level": [
        { number: 1, label: "Paper 1 — AS Multiple Choice", short: "P1 MCQ" },
        { number: 2, label: "Paper 2 — AS Data Response & Essays", short: "P2 Structured" },
        { number: 3, label: "Paper 3 — A2 Multiple Choice", short: "P3 A2 MCQ" },
        { number: 4, label: "Paper 4 — A2 Data Response & Essays", short: "P4 A2 Structured" },
      ],
      "AS-Level": [
        { number: 1, label: "Paper 1 — AS Multiple Choice", short: "P1 MCQ" },
        { number: 2, label: "Paper 2 — AS Data Response & Essays", short: "P2 Structured" },
      ],
      IGCSE: [
        { number: 1, label: "Paper 1 — Multiple Choice", short: "P1 MCQ" },
        { number: 2, label: "Paper 2 — Structured Questions", short: "P2 Structured" },
      ],
    },
    topics: ["Demand & Supply", "Elasticity", "Market Failure", "Macroeconomic Policy", "International Trade", "Inflation"],
  },
];

export const getSubject = (id: string) => SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];

export const subjectCode = (subject: Subject, q: Qualification = "A-Level") =>
  subject.codes[q] ?? subject.codes["A-Level"] ?? "";

export const subjectPapers = (subject: Subject, q: Qualification = "A-Level") =>
  subject.papers[q] ?? subject.papers["A-Level"] ?? [];

export const seriesLabel = (code: SeriesCode) => SERIES.find((s) => s.code === code)?.label ?? code;
