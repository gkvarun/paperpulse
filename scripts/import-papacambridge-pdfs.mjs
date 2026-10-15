#!/usr/bin/env node
/**
 * Import PDF URLs that you are authorized to access/process into a searchable page index.
 *
 * Usage:
 *   node scripts/import-papacambridge-pdfs.mjs ./papacambridge-pdf-urls.txt ./public/question-index.json
 *
 * The URL list must contain one direct PDF URL per line. This intentionally does not
 * crawl or bypass site restrictions. Only import papers you are authorized to process.
 * PDF pages are indexed as page-level passages, not verified individual questions.
 * Scanned/image-only PDFs need OCR; extracted records are flagged for review.
 */
import fs from "node:fs/promises";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const [, , urlList = "./papacambridge-pdf-urls.txt", outputFile = "./public/question-index.json"] = process.argv;
const urls = (await fs.readFile(urlList, "utf8")).split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith("#"));
if (!urls.length) {
  console.error("Add one direct PDF URL per line to", urlList);
  process.exit(1);
}
const subjectByCode = {
  "0625": "physics", "9702": "physics",
  "0620": "chemistry", "9701": "chemistry",
  "0580": "mathematics", "9709": "mathematics",
  "9231": "further-math", "9626": "it", "9618": "computer-science",
  "0478": "computer-science", "0417": "it", "0606": "additional-math",
  "0580": "mathematics", "0610": "biology", "9700": "biology"
};
const records = [];
for (const sourceUrl of urls) {
  let url;
  try { url = new URL(sourceUrl); } catch { console.warn("Skipping invalid URL:", sourceUrl); continue; }
  if (url.protocol !== "https:" && url.protocol !== "http:") { console.warn("Skipping non-web URL:", sourceUrl); continue; }
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "past-paper.pdf");
  if (!filename.toLowerCase().endsWith(".pdf")) { console.warn("Skipping URL that does not end in .pdf:", sourceUrl); continue; }
  const response = await fetch(sourceUrl, { headers: { "User-Agent": "PaperPulse-Authorized-PDF-Indexer/1.0" } });
  if (!response.ok) { console.warn("Download failed", response.status, sourceUrl); continue; }
  const contentType = response.headers.get("content-type") || "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!contentType.includes("pdf") && !(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    console.warn("Response was not a PDF; skipped:", sourceUrl); continue;
  }
  const name = filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const code = (filename + " " + url.pathname).match(/(?:^|\D)(970[0-9]|96[0-9]{2}|92[0-9]{2}|06[0-9]{2}|05[0-9]{2}|04[0-9]{2})(?:\D|$)/)?.[1] || "";
  const subjectId = subjectByCode[code] || "other";
  const yearMatch = (filename + " " + url.pathname).match(/(?:19|20)\d{2}|(?:^|[_-])(?:s|w|m)(\d{2})(?:[_-]|\b)/i);
  const year = yearMatch ? Number(yearMatch[0].match(/(?:19|20)\d{2}/)?.[0] || ((Number(yearMatch[1]) >= 50 ? "19" : "20") + yearMatch[1])) : null;
  const series = /(?:^|[_-])m\d{2}(?:[_-]|\b)|march/i.test(filename) ? "m" : /(?:^|[_-])w\d{2}(?:[_-]|\b)|winter|october/i.test(filename) ? "w" : /(?:^|[_-])s\d{2}(?:[_-]|\b)|summer|may|june/i.test(filename) ? "s" : "unknown";
  const paper = (filename + " " + url.pathname).match(/(?:qp|ms|paper)[_-]?(\d{1,2})/i)?.[1] || "0";
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  let extracted = 0;
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    extracted++;
    records.push({
      id: name + "-page-" + pageNo,
      subjectId, topic: "Unclassified", year: year || 0, series, paper,
      questionNumber: pageNo, marks: 0, prompt: text, markScheme: [],
      sourceUrl, sourceFile: filename, sourcePage: pageNo,
      syllabusCode: code || null, recordType: "page-passage",
      reviewRequired: true
    });
  }
  console.log(filename + ": extracted text from " + extracted + "/" + doc.numPages + " pages");
}
// Precompute document vectors during ingestion so the student browser embeds only the query.
try {
  const { pipeline } = await import("@xenova/transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  for (let i = 0; i < records.length; i++) {
    const output = await extractor(records[i].topic + ". " + records[i].prompt, { pooling: "mean", normalize: true });
    records[i].embedding = Array.from(output.data);
    if ((i + 1) % 25 === 0 || i + 1 === records.length) console.log("Embedded", i + 1, "of", records.length);
  }
} catch (error) {
  console.warn("Embedding model unavailable during import; index will use keyword fallback.", error);
}
await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: records.length, records }, null, 2));
console.log("Wrote " + records.length + " page passages to " + outputFile + ". These are not yet segmented into individual questions or topic-labelled.");
