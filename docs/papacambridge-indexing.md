# Importing authorized past-paper PDFs into PaperPulse

The Topical Bank now prefers, in order:

1. `VITE_TOPICAL_SEARCH_API_URL` (an endpoint returning an array or `{ questions: [...] }` / `{ records: [...] }`);
2. `/question-index.json` published with the frontend;
3. the bundled demo dataset as a fallback.

When it falls back to demo data, the UI labels the source as **demo data**. This prevents sample results from being mistaken for an imported catalogue.

## Import direct PDF URLs

Create a text file with one direct PDF URL per line. Use URLs you are authorized to access and process; do not bypass login, rate limits, or site restrictions.

```sh
npm install
node scripts/import-papacambridge-pdfs.mjs ./papacambridge-pdf-urls.txt ./public/question-index.json
npm run build
```

The importer downloads the listed PDFs, extracts text with PDF.js, and writes a frontend-compatible index. It does not crawl PapaCambridge, guess hidden PDF URLs, or bypass access restrictions. If a source blocks automated downloads, use its permitted download flow and process locally saved PDFs instead.

## Generate the PDF URL list from Paper Finder

The Paper Finder uses `src/data/subjects.ts` for supported syllabus codes, qualifications, years, sessions, paper components and variants, and `src/lib/papacambridge.ts` to construct PapaCambridge direct PDF links. Do not manually recreate those mappings: use the exporter, which imports those same selector definitions.

Install dependencies, then export the generated question-paper links:

```bash
npm install
npm run export:paper-urls -- --from 2012 --to 2026 --out ./papacambridge-pdf-urls.txt
```

To export just one subject, pass its ID, for example:

```bash
npm run export:paper-urls -- --subject physics --from 2012 --to 2026
```

The command writes a text URL list plus a JSON manifest with selector metadata.

To generate the selector URLs **and** run the PDF segmentation/indexing step in one command, use:

```bash
npm run index:papers
```

This expands the Paper Finder's supported subject/qualification/paper/session/variant combinations across 2012–2026, then attempts to download and segment every candidate PDF into `public/question-index.json`. It can take a long time and many candidate links may not exist. For safer testing, first run the exporter for one subject or a narrower year range and run the importer on that smaller list. By default, it exports every URL implied by the Paper Finder selectors; some combinations may not exist on the source. To attempt filtering to URLs confirmed by concurrent HTTP HEAD checks, add `--check` (some servers do not support HEAD consistently, so inspect the resulting list).

Then run the importer on the generated list:

```bash
node scripts/import-papacambridge-pdfs.mjs ./papacambridge-pdf-urls.txt ./public/question-index.json
```

The importer skips inaccessible, missing, or non-PDF responses and reports which PDFs produced segmented records. Start with a single subject or small year range, inspect the output and server response behavior, then expand to the complete set. Bulk indexing can take significant time and bandwidth; comply with the source site's terms and avoid overwhelming the host.

## Question segmentation status and limits

The importer now uses PDF.js text positions to reconstruct reading-order lines, detects likely top-level question numbers at the left margin, and emits separate records for recognizable subparts such as `(a)`, `(b)`, and `(i)`. Each sub-question retains the question stem, parent question number, source URL, and source page range. A small syllabus-keyword classifier assigns a likely topic where possible; records retain `reviewRequired: true` because layout and topic classification are heuristic.

This is **best-effort segmentation, not guaranteed-perfect extraction**. Cambridge papers differ in layout and numbering, and a line that resembles a question number can be misidentified. Text-only extraction can lose reading order around multi-column layouts, tables, equations and diagrams. Image-only scanned pages need OCR, and visual subparts may need manual review. Mark schemes are not merged into extracted question records by this script.

## Verify the output

1. Run the importer on a small batch first.
2. Open `public/question-index.json` and check each record's `prompt`, `questionNumber`, `parentQuestionNumber`, `sourceUrl`, `sourcePage`, `sourcePageEnd`, and `topic`.
3. Compare the extracted record against the cited page in the original PDF.
4. Re-run on the full authorized URL list only after the sample is acceptable.

The importer emits question/sub-question records rather than raw page passages when it detects boundaries. If it cannot detect any question boundaries in a PDF, it warns and emits no records for that PDF rather than pretending pages are questions.

For larger collections, precompute embeddings during ingestion and return them in the API/index rather than generating every document vector in the student's browser. Set `VITE_TOPICAL_SEARCH_API_URL` in the deployment environment to use a deployed index API.
