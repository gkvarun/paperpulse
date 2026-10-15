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
