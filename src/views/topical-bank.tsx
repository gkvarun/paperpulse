import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Library, RotateCcw, Search } from "lucide-react";
import { useApp } from "../store";
import { QUESTIONS } from "../data/questions";
import { QUALIFICATIONS, SERIES, SUBJECTS, TRACKER_YEARS, YEARS, getSubject, subjectCode, subjectPapers, variantsFor, type Qualification } from "../data/subjects";
import { paperUrl, type PaperRef } from "../lib/papacambridge";
import { Button, Card, EmptyState, Field, PageHeader, Select } from "../components/ui";
import { QuestionCard } from "../components/question-card";
import { semanticSearch, type IndexedQuestion } from "../lib/semantic-search";

const MIN_YEAR = YEARS[YEARS.length - 1];
const MAX_YEAR = YEARS[0];

export function TopicalBank() {
  const { activeSubjectId, topicalIntent, consumeTopicalIntent, worksheet, setWorksheet } = useApp();
  const [subjectId, setSubjectId] = useState(activeSubjectId);
  const [component, setComponent] = useState<number | "all">("all");
  const [qualification, setQualification] = useState<Qualification>("A-Level");
  const [showSourcePapers, setShowSourcePapers] = useState(false);
  const [from, setFrom] = useState(MIN_YEAR);
  const [to, setTo] = useState(MAX_YEAR);
  const [search, setSearch] = useState("");
  const [corpus, setCorpus] = useState<IndexedQuestion[]>(QUESTIONS as unknown as IndexedQuestion[]);
  const [corpusSource, setCorpusSource] = useState<"bundled" | "index" | "api">("bundled");
  const [semanticResults, setSemanticResults] = useState<IndexedQuestion[]>(QUESTIONS as unknown as IndexedQuestion[]);
  const [searching, setSearching] = useState(false);

  const subject = getSubject(subjectId);
  const papers = subjectPapers(subject, qualification);
  const sourcePapers = useMemo(() => {
    const code = subjectCode(subject, qualification);
    if (!code) return [];
    const rows: { year: number; session: string; paper: string; url: string }[] = [];
    for (const year of YEARS.filter((y) => y >= Math.min(from, to) && y <= Math.max(from, to))) {
      for (const session of SERIES) {
        for (const paper of papers) {
          if (component !== "all" && paper.number !== component) continue;
          for (const variant of variantsFor(session.code)) {
            const ref: PaperRef = { code, series: session.code, year, paper: String(paper.number) + String(variant) };
            rows.push({ year, session: session.label, paper: ref.paper, url: paperUrl(ref, "qp") });
          }
        }
      }
    }
    return rows.sort((a, b) => b.year - a.year || a.session.localeCompare(b.session) || a.paper.localeCompare(b.paper));
  }, [subject, qualification, papers, from, to, component]);

  const downloadSourceList = () => {
    const content = sourcePapers.map((paper) => paper.url).join(String.fromCharCode(10)) + String.fromCharCode(10);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "paperpulse-" + subject.id + "-" + qualification.toLowerCase().replaceAll(" ", "-") + "-" + Math.min(from, to) + "-" + Math.max(from, to) + "-pdf-urls.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    setSubjectId(activeSubjectId);
    setComponent("all");
  }, [activeSubjectId]);

  useEffect(() => {
    if (!topicalIntent) return;
    if (topicalIntent.subjectId) setSubjectId(topicalIntent.subjectId);
    setSearch([topicalIntent.search, topicalIntent.topic].filter(Boolean).join(" "));
    setComponent("all");
    consumeTopicalIntent();
  }, [topicalIntent, consumeTopicalIntent]);

  // Load indexed questions from the configured API or published JSON index.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const api = import.meta.env.VITE_TOPICAL_SEARCH_API_URL?.trim();
      if (api) { try { const r = await fetch(api); if (!r.ok) throw new Error("API " + r.status); const p = await r.json(); const rows = Array.isArray(p) ? p : p.questions ?? p.records; if (Array.isArray(rows) && rows.length) { if (!cancelled) { setCorpus(rows); setCorpusSource("api"); } return; } } catch (e) { console.warn("Question API failed; trying local index.", e); } }
      try { const r = await fetch("/question-index.json"); if (r.ok) { const p = await r.json(); const rows = Array.isArray(p) ? p : p.questions ?? p.records; const valid = Array.isArray(rows) ? rows.filter((x: any) => x && x.id && x.subjectId && x.topic && x.prompt && Number.isFinite(Number(x.year)) && x.paper) : []; if (valid.length) { if (!cancelled) { setCorpus(valid); setCorpusSource("index"); } return; } } } catch (e) { console.warn("Question index unavailable.", e); }
      if (!cancelled) { setCorpus(QUESTIONS as unknown as IndexedQuestion[]); setCorpusSource("bundled"); }
    }; void load(); return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false; setSearching(true);
    const retrievalQuery = search.trim();
    const run = async () => { const rows = retrievalQuery ? await semanticSearch(retrievalQuery, corpus, 5000) : corpus; if (!cancelled) { setSemanticResults(rows); setSearching(false); } };
    void run().catch((e) => { console.error("Semantic search failed", e); if (!cancelled) { setSemanticResults(corpus as typeof QUESTIONS); setSearchMode("keyword"); setSearching(false); } });
    return () => { cancelled = true; };
  }, [search, corpus]);

  const results = useMemo(() => {
    return semanticResults.filter(
      (x) =>
        x.subjectId === subjectId &&
        (component === "all" || Number(x.paper[0]) === component) &&
        x.year >= Math.min(from, to) &&
        x.year <= Math.max(from, to)
    ).sort((a, b) => b.year - a.year);
  }, [semanticResults, subjectId, component, from, to]);

  const reset = () => {
    setComponent("all");
    setFrom(MIN_YEAR);
    setTo(MAX_YEAR);
    setSearch("");
  };

  const notAdded = results.filter((r) => !worksheet.includes(r.id));

  return (
    <div>
      <PageHeader
        title="Topical Bank"
        description="Search indexed past-paper questions by words or phrases, filter by qualification, subject, paper and year, and collect questions into a worksheet."
        actions={
          <Button variant="outline" disabled={notAdded.length === 0} onClick={() => setWorksheet([...worksheet, ...notAdded.map((r) => r.id)])}>
            Add all {notAdded.length > 0 ? notAdded.length : ""} to worksheet
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex h-fit flex-col gap-5 p-5 lg:sticky lg:top-24">
          <Field label="Subject">
            {(id) => (
              <Select
                id={id}
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                                setComponent("all");
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>


          <Field label="Qualification">
            {(id) => (
              <Select id={id} value={qualification} onChange={(e) => { setQualification(e.target.value as Qualification); setComponent("all"); }}>
                {QUALIFICATIONS.filter((q) => Boolean(subject.codes[q])).map((q) => <option key={q} value={q}>{q}</option>)}
              </Select>
            )}
          </Field>

          <Field label="Paper type">
            {(id) => (
              <Select id={id} value={component} onChange={(e) => setComponent(e.target.value === "all" ? "all" : Number(e.target.value))}>
                <option value="all">All papers</option>
                {papers.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.short}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              {(id) => (
                <Select id={id} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                  {[...YEARS].reverse().map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="To">
              {(id) => (
                <Select id={id} value={to} onChange={(e) => setTo(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="flex gap-1.5">
            {[
              { label: "Last 3 yrs", from: MAX_YEAR - 2 },
              { label: "2018+", from: TRACKER_YEARS[TRACKER_YEARS.length - 1] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setFrom(preset.from);
                  setTo(MAX_YEAR);
                }}
                className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-line p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Source paper selector</p>
                <p className="mt-1 text-xs text-muted">{sourcePapers.length.toLocaleString()} generated PDF links for the selected subject, qualification, paper and years.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSourcePapers((v) => !v)}>{showSourcePapers ? "Hide" : "View"}</Button>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={downloadSourceList} disabled={!sourcePapers.length}>Download PDF URL list</Button>
            {showSourcePapers && (
              <div className="mt-3 max-h-56 overflow-y-auto border-t border-line pt-2">
                {sourcePapers.slice(0, 100).map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 py-1.5 text-xs hover:text-foreground">
                    <span>{p.year} · {p.session} · Paper {p.paper}</span>
                    <span className="text-muted">PDF ↗</span>
                  </a>
                ))}
                {sourcePapers.length > 100 && <p className="pt-2 text-xs text-muted">Showing first 100 links. Download the URL list to get all {sourcePapers.length.toLocaleString()} generated links.</p>}
              </div>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-muted">These are candidate source links, not confirmed available papers. To make their questions searchable, run the PDF importer on the downloaded list and publish the resulting question index. Browsers cannot reliably bulk-read third-party PDFs directly because of cross-origin restrictions.</p>
          </div>

          <Button variant="ghost" size="sm" onClick={reset} className="self-start">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset filters
          </Button>
        </Card>

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question text, keywords or phrases"
                aria-label="Search within questions"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted"
              />
            </div>
            <p className="text-sm text-muted" aria-live="polite">
              <span className="font-bold text-foreground">{results.length}</span> {results.length === 1 ? (corpusSource === "bundled" ? "question" : "result") : (corpusSource === "bundled" ? "questions" : "results")}{searching ? " · searching…" : search.trim() ? " · keyword search" : ""} · {corpusSource === "bundled" ? "demo data" : corpusSource === "api" ? "indexed question API" : "published index"}
            </p>
          </div>

          {results.length === 0 ? (
            <EmptyState icon={<Library className="size-5" />} title="No questions match" description="Try different keywords or widen the year range to find more questions." action={<Button size="sm" onClick={reset}>Reset filters</Button>} />
          ) : (
            <ul className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {results.map((q) => (
                  <QuestionCard key={q.id} question={q} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

