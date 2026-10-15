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

## Current extraction limitations

The importer creates **page-level passages**, not verified individual questions. Each imported passage is marked `reviewRequired: true` and `topic: "Unclassified"`. This makes text searchable but does not yet satisfy complete topical question extraction. Scanned PDFs require OCR, and page layouts with diagrams/tables need extra handling. Before advertising the index as a complete topical bank, add question/sub-question segmentation, topic classification against the relevant syllabus, and validation against the original PDF.

For larger collections, precompute embeddings during ingestion and return them in the API/index rather than generating every embedding in the student's browser. Set `VITE_TOPICAL_SEARCH_API_URL` in the deployment environment to use a deployed index API.
