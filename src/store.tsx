import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePersistentState, clearPersistentState } from "./lib/use-persistent-state";
import {
  seedQuestionResults,
  seedRecords,
  type PaperRecord,
  type PaperRecords,
  type QuestionResult,
  type QuestionResults,
} from "./lib/tracker";
import type { Qualification } from "./data/subjects";
import type { PaperRef } from "./lib/papacambridge";

export type View = "dashboard" | "finder" | "topical" | "worksheet" | "analytics" | "settings";
export type Theme = "dark" | "light";

export interface TopicalIntent {
  subjectId?: string;
  topic?: string;
  search?: string;
}

interface AppState {
  view: View;
  setView: (v: View) => void;
  theme: Theme;
  toggleTheme: () => void;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  qualification: Qualification;
  setQualification: (q: Qualification) => void;
  trackedSubjects: string[];
  setTrackedSubjects: (ids: string[]) => void;

  records: PaperRecords;
  savePaperRecord: (id: string, record: PaperRecord | null) => void;

  worksheet: string[];
  setWorksheet: (ids: string[]) => void;
  toggleWorksheetItem: (id: string) => void;
  worksheetOpen: boolean;
  setWorksheetOpen: (open: boolean) => void;

  questionResults: QuestionResults;
  setQuestionResult: (id: string, result: QuestionResult | null) => void;

  finderIntent: PaperRef | null;
  openInFinder: (ref: PaperRef) => void;
  consumeFinderIntent: () => void;
  topicalIntent: TopicalIntent | null;
  openInTopical: (intent: TopicalIntent) => void;
  consumeTopicalIntent: () => void;

  resetAll: (mode: "empty" | "sample") => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("dashboard");
  const [theme, setTheme] = usePersistentState<Theme>("theme", "dark");
  const [activeSubjectId, setActiveSubjectId] = usePersistentState("activeSubject", "physics");
  const [qualification, setQualification] = usePersistentState<Qualification>("qualification", "A-Level");
  const [trackedSubjects, setTrackedSubjects] = usePersistentState<string[]>("trackedSubjects", ["physics", "chemistry", "mathematics"]);
  const [records, setRecords] = usePersistentState<PaperRecords>("records", seedRecords);
  const [worksheet, setWorksheet] = usePersistentState<string[]>("worksheet", []);
  const [questionResults, setQuestionResults] = usePersistentState<QuestionResults>("questionResults", seedQuestionResults);
  const [worksheetOpen, setWorksheetOpen] = useState(false);
  const [finderIntent, setFinderIntent] = useState<PaperRef | null>(null);
  const [topicalIntent, setTopicalIntent] = useState<TopicalIntent | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f9f9f9");
  }, [theme]);

  const savePaperRecord = useCallback(
    (id: string, record: PaperRecord | null) =>
      setRecords((prev) => {
        const next = { ...prev };
        if (record === null || record.status === "not-started") delete next[id];
        else next[id] = record;
        return next;
      }),
    [setRecords],
  );

  const toggleWorksheetItem = useCallback(
    (id: string) => setWorksheet((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setWorksheet],
  );

  const setQuestionResult = useCallback(
    (id: string, result: QuestionResult | null) =>
      setQuestionResults((prev) => {
        const next = { ...prev };
        if (result === null) delete next[id];
        else next[id] = result;
        return next;
      }),
    [setQuestionResults],
  );

  const resetAll = useCallback(
    (mode: "empty" | "sample") => {
      clearPersistentState();
      setRecords(mode === "sample" ? seedRecords() : {});
      setQuestionResults(mode === "sample" ? seedQuestionResults() : {});
      setWorksheet([]);
    },
    [setRecords, setQuestionResults, setWorksheet],
  );

  const value = useMemo<AppState>(
    () => ({
      view,
      setView,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      activeSubjectId,
      setActiveSubjectId,
      qualification,
      setQualification,
      trackedSubjects,
      setTrackedSubjects,
      records,
      savePaperRecord,
      worksheet,
      setWorksheet,
      toggleWorksheetItem,
      worksheetOpen,
      setWorksheetOpen,
      questionResults,
      setQuestionResult,
      finderIntent,
      openInFinder: (ref) => {
        setFinderIntent(ref);
        setView("finder");
      },
      consumeFinderIntent: () => setFinderIntent(null),
      topicalIntent,
      openInTopical: (intent) => {
        setTopicalIntent(intent);
        setView("topical");
      },
      consumeTopicalIntent: () => setTopicalIntent(null),
      resetAll,
    }),
    [view, theme, setTheme, activeSubjectId, setActiveSubjectId, qualification, setQualification, trackedSubjects, setTrackedSubjects, records, savePaperRecord, worksheet, setWorksheet, toggleWorksheetItem, worksheetOpen, questionResults, setQuestionResult, finderIntent, topicalIntent, resetAll],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
