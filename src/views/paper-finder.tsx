import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, ExternalLink, Eye, FileText, ListChecks, Check } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../store";
import { QUALIFICATIONS, SERIES, SUBJECTS, YEARS, getSubject, seriesLabel, subjectCode, subjectPapers, variantsFor, type Qualification, type SeriesCode } from "../data/subjects";
import { DOC_LABELS, paperFileName, paperId, paperUrl, type DocType, type PaperRef } from "../lib/papacambridge";
import { STATUS_LABELS } from "../lib/tracker";
import { Badge, Button, Card, Field, PageHeader, Select } from "../components/ui";
import { PaperRecordDialog } from "../components/paper-record-dialog";
import { StatusSwatch } from "../components/status-swatch";

const DOCS: DocType[] = ["qp", "ms", "er", "gt"];

export function PaperFinder() {
  const { activeSubjectId, qualification, setQualification, finderIntent, consumeFinderIntent, records } = useApp();
  const [subjectId, setSubjectId] = useState(activeSubjectId);
  const [year, setYear] = useState(2023);
  const [series, setSeries] = useState<SeriesCode>("s");
  const [component, setComponent] = useState(1);
  const [variant, setVariant] = useState(2);
  const [previewDoc, setPreviewDoc] = useState<DocType>("qp");
  const [logOpen, setLogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const subject = getSubject(subjectId);
  const code = subjectCode(subject, qualification);
  const papers = subjectPapers(subject, qualification);
  const variants = variantsFor(series);

  useEffect(() => setSubjectId(activeSubjectId), [activeSubjectId]);

  useEffect(() => {
    if (!papers.some((p) => p.number === component)) setComponent(papers[0]?.number ?? 1);
  }, [papers, component]);

  useEffect(() => {
    if (!variants.includes(variant)) setVariant(variants[0]);
  }, [variants, variant]);

  useEffect(() => {
    if (!finderIntent) return;
    for (const s of SUBJECTS) {
      const q = (Object.keys(s.codes) as Qualification[]).find((k) => s.codes[k] === finderIntent.code);
      if (q) {
        setSubjectId(s.id);
        setQualification(q);
        break;
      }
    }
    setYear(finderIntent.year);
    setSeries(finderIntent.series);
    setComponent(Number(finderIntent.paper[0]));
    setVariant(Number(finderIntent.paper[1]));
    consumeFinderIntent();
  }, [finderIntent, consumeFinderIntent, setQualification]);

  const ref: PaperRef = useMemo(() => ({ code, series, year, paper: `${component}${variant}` }), [code, series, year, component, variant]);
  const id = paperId(ref);
  const record = records[id];
  const previewUrl = paperUrl(ref, previewDoc);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked inside iframes.
    }
  };

  return (
    <div>
      <PageHeader
        title="Paper Finder"
        description="Pick a qualification, subject and session. PaperPulse builds the PapaCambridge directory links for the question paper, mark scheme, examiner report and grade thresholds."
      />

      <Card className="p-4 md:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Qualification">
            {(fid) => (
              <Select id={fid} value={qualification} onChange={(e) => setQualification(e.target.value as Qualification)}>
                {QUALIFICATIONS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Subject" className="col-span-2 md:col-span-1">
            {(fid) => (
              <Select id={fid} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({subjectCode(s, qualification)})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Year">
            {(fid) => (
              <Select id={fid} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Series">
            {(fid) => (
              <Select id={fid} value={series} onChange={(e) => setSeries(e.target.value as SeriesCode)}>
                {SERIES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label} ({s.code})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Paper">
            {(fid) => (
              <Select id={fid} value={component} onChange={(e) => setComponent(Number(e.target.value))}>
                {papers.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Variant">
            {(fid) => (
              <Select id={fid} value={variant} onChange={(e) => setVariant(Number(e.target.value))}>
                {variants.map((v) => (
                  <option key={v} value={v}>
                    Paper {component}
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-3">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Selected paper</p>
            <p className="mt-2 font-mono text-xl font-bold tracking-tight">{id}</p>
            <p className="mt-1 text-sm text-muted">
              {subject.name} · {seriesLabel(series)} {year} · {qualification}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                <StatusSwatch status={record?.status ?? "not-started"} />
                {STATUS_LABELS[record?.status ?? "not-started"]}
                {record?.score !== undefined && <span className="text-muted">· {record.score}%</span>}
              </span>
              <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
                <ListChecks className="size-3.5" aria-hidden="true" />
                Log
              </Button>
            </div>
          </Card>

          <ul className="flex flex-col gap-2">
            {DOCS.map((doc) => (
              <li key={doc}>
                <Card className={clsx("flex items-center gap-3 p-3 transition-colors", previewDoc === doc && "border-foreground")}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line">
                    <FileText className="size-4 text-muted" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold tracking-tight">{DOC_LABELS[doc]}</p>
                    <p className="truncate font-mono text-xs text-muted">{paperFileName(ref, doc)}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setPreviewDoc(doc)} aria-label={`Preview ${DOC_LABELS[doc]}`} aria-pressed={previewDoc === doc}>
                    <Eye className="size-4" />
                  </Button>
                  <a
                    href={paperUrl(ref, doc)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-foreground"
                    aria-label={`Open ${DOC_LABELS[doc]} in new tab`}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <Card className="flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="flex gap-1 rounded-lg border border-line p-0.5" role="tablist" aria-label="Document">
              {DOCS.map((doc) => (
                <button
                  key={doc}
                  type="button"
                  role="tab"
                  aria-selected={previewDoc === doc}
                  onClick={() => setPreviewDoc(doc)}
                  className={clsx(
                    "relative rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors",
                    previewDoc === doc ? "text-background" : "text-muted hover:text-foreground",
                  )}
                >
                  {previewDoc === doc && <motion.span layoutId="doc-tab" className="absolute inset-0 rounded-md bg-foreground" transition={{ duration: 0.2 }} />}
                  <span className="relative">{doc}</span>
                </button>
              ))}
            </div>
            <Badge className="hidden sm:inline-flex">{paperFileName(ref, previewDoc)}</Badge>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={copyLink}>
                {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background hover:opacity-85">
                Open PDF
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="relative flex-1 bg-hover">
            <AnimatePresence mode="wait">
              <motion.iframe
                key={previewUrl}
                src={previewUrl}
                title={`${DOC_LABELS[previewDoc]} preview for ${id}`}
                className="absolute inset-0 size-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          </div>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
            Files are served by PapaCambridge. If the embedded preview is blocked by your browser, use “Open PDF”.
          </p>
        </Card>
      </div>

      <PaperRecordDialog paper={logOpen ? { ...ref, id } : null} subjectId={subjectId} onClose={() => setLogOpen(false)} />
    </div>
  );
}
