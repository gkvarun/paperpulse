# Semantic topical search (JavaScript)

## What this adds
- Browser-side semantic embeddings using Transformers.js and the MiniLM sentence embedding model.
- Cosine-similarity ranking, with keyword fallback when the model or embeddings are unavailable.
- A PDF.js ingestion script for authorized PDFs that creates a page-level source index.

## Setup
Install dependencies:

```bash
npm install @xenova/transformers pdfjs-dist
```

Build an initial source index from PDFs you are authorized to process:

```bash
node scripts/build-question-index.mjs ./authorized-papers ./public/question-index.json
```

The first pass extracts page text and source metadata. It intentionally marks every record `reviewRequired: true`: multi-column layouts, diagrams, question subparts and mark-scheme alignment require segmentation and human QA before being shown as individual questions. Scanned PDFs require OCR, which is not provided by this text-layer extractor.

## Embedding and production notes
Each indexed question should have an `embedding` generated with `embedText(question.prompt + " " + question.topic)`, then persist the vector with its metadata. For large corpora, do not download the entire JSON index to every browser; expose a server endpoint and use a vector database/index on the server. Keep metadata filters (subject, qualification, syllabus, year, session, paper) separate from semantic ranking.

This tool does not discover or download papers from third-party archives. Only ingest material you have permission to process and publish, and preserve source links and rights status. A page-level extraction index is not yet a complete question-level catalogue.
