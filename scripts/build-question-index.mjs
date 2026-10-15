#!/usr/bin/env node
/**
 * Build a searchable question index from PDFs you are licensed/authorized to process.
 * Usage: node scripts/build-question-index.mjs ./authorized-papers ./public/question-index.json
 * This first-pass extractor keeps page-level text and metadata. Human review is required
 * to split complex layouts into question/sub-question records reliably.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const [,, inputDir, outputFile = "./public/question-index.json"] = process.argv;
if (!inputDir) {
  console.error("Usage: node scripts/build-question-index.mjs <pdf-directory> [output-json]");
  process.exit(1);
}
const files = (await fs.readdir(inputDir)).filter(f => f.toLowerCase().endsWith(".pdf"));
const records = [];
for (const file of files) {
  const bytes = new Uint8Array(await fs.readFile(path.join(inputDir,file)));
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const match = file.match(/(\d{4}).*?(s|w|m).*?(\d{4,5})/i);
  for (let pageNo=1; pageNo<=doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items.map(x => "str" in x ? x.str : "").join(" ").replace(/\s+/g," ").trim();
    if (!text) continue;
    records.push({
      id: file.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+ "-p"+pageNo,
      sourceFile: file, sourcePage: pageNo, year: match ? Number(match[1]) : null,
      series: match ? match[2].toLowerCase() : null,
      syllabusCode: match ? match[3] : null,
      text, reviewRequired: true
    });
  }
  console.log("Extracted", file, doc.numPages, "pages");
}
await fs.mkdir(path.dirname(outputFile), {recursive:true});
await fs.writeFile(outputFile, JSON.stringify({generatedAt:new Date().toISOString(), count:records.length, records},null,2));
console.log("Wrote",records.length,"page records to",outputFile,"(manual question segmentation/review required)");
