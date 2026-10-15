#!/usr/bin/env node
/**
 * Extract text from authorized Cambridge PDF URLs and segment it into question
 * and sub-question records. Heuristics are deliberately conservative and retain
 * source page ranges so records can be reviewed against the original PDF.
 *
 * Usage:
 *   node scripts/import-papacambridge-pdfs.mjs ./papacambridge-pdf-urls.txt ./public/question-index.json
 *   node scripts/import-papacambridge-pdfs.mjs ./papacambridge-pdf-urls.txt ./public/question-index.json --no-embeddings
 */
import fs from "node:fs/promises";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const args = process.argv.slice(2);
const urlList = args.find(x => !x.startsWith("--")) || "./papacambridge-pdf-urls.txt";
const outputFile = args.filter(x => !x.startsWith("--"))[1] || "./public/question-index.json";
const makeEmbeddings = !args.includes("--no-embeddings");
const urls = (await fs.readFile(urlList, "utf8")).split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith("#"));
if (!urls.length) {
  console.error("Add one direct PDF URL per line to", urlList);
  process.exit(1);
}

const subjectByCode = {
  "0625": "physics", "9702": "physics", "0620": "chemistry", "9701": "chemistry",
  "0580": "mathematics", "9709": "mathematics", "9231": "further-math", "0606": "further-math",
  "9626": "it", "9618": "computer-science", "0478": "computer-science", "0417": "it",
  "0610": "biology", "9700": "biology", "9708": "economics", "0455": "economics"
};

const normalize = value => value.replace(/\s+/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
const itemText = item => typeof item.str === "string" ? item.str : "";
function pageLines(items) {
  const rows = items.map(item => ({
    text: itemText(item), x: Number(item.transform?.[4] ?? 0),
    y: Number(item.transform?.[5] ?? 0), width: Number(item.width ?? 0)
  })).filter(x => x.text.trim());
  rows.sort((a, b) => Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x);
  const lines = [];
  for (const row of rows) {
    let line = lines.find(x => Math.abs(x.y - row.y) <= 2.5);
    if (!line) { line = { y: row.y, x: row.x, parts: [] }; lines.push(line); }
    line.parts.push(row);
    line.x = Math.min(line.x, row.x);
  }
  return lines.sort((a, b) => b.y - a.y).map(line => {
    line.parts.sort((a, b) => a.x - b.x);
    let text = "";
    let previous = null;
    for (const part of line.parts) {
      const gap = previous ? part.x - (previous.x + previous.width) : 0;
      if (text && gap > 2.5 && !/[-(/]$/.test(text) && !/^[,.;:!?)]/.test(part.text)) text += " ";
      text += part.text;
      previous = part;
    }
    return { text: normalize(text), x: line.x, y: line.y };
  }).filter(line => line.text);
}

// Cambridge question numbers are normally at the left margin. Ignore isolated
// page numbers, footer text and likely subparts when detecting a new main question.
function mainQuestionStart(line) {
  if (line.x > 95) return null;
  const m = line.text.match(/^\s*(\d{1,2})\s*[.)]?\s+(.+)$/);
  if (!m) return null;
  const n = Number(m[1]), rest = m[2].trim();
  if (n < 1 || n > 40 || rest.length < 12) return null;
  if (/^(?:page\s+)?\d{1,3}$/i.test(rest)) return null;
  if (/^(?:©|copyright|cambridge|turn over|blank page)/i.test(rest)) return null;
  return { number: n, rest };
}
function subpartStart(text) {
  const m = text.match(/^\s*(\([a-z]\)|\([ivx]{1,5}\)|[a-z][.)])\s+(.{2,})$/i);
  if (!m) return null;
  return { label: m[1].replace(/[.)]$/, "").toLowerCase(), rest: m[2].trim() };
}
function marksIn(text) {
  const matches = [...text.matchAll(/\[(\d{1,2})\]\s*$/g)];
  return matches.length ? Number(matches[matches.length - 1][1]) : 0;
}
function classifyTopic(text, subjectId) {
  const s = text.toLowerCase();
  const rules = {
    physics: [
      ["Kinematics", /velocity|acceleration|displacement|speed.time|projectile|motion/],
      ["Dynamics", /newton|resultant force|momentum|friction|impulse/],
      ["Forces & Moments", /moment of a force|torque|equilibrium|centre of mass/],
      ["Work, Energy & Power", /kinetic energy|gravitational potential|power|efficiency|work done/],
      ["Waves", /wavelength|frequency|diffraction|interference|stationary wave|polarisation/],
      ["Electricity", /current|potential difference|resistance|resistivity|capacitor|emf/],
      ["Fields", /gravitational field|electric field|magnetic field|flux density/],
      ["Quantum Physics", /photoelectric|photon|de broglie|work function|quantum/],
      ["Nuclear Physics", /radioactive|half.life|decay constant|nuclear fission|binding energy/]
    ],
    chemistry: [
      ["Atomic Structure", /proton|neutron|electron configuration|isotope|ionisation energy/],
      ["Chemical Bonding", /covalent|ionic bond|hydrogen bond|intermolecular|metallic bonding/],
      ["Energetics", /enthalpy|bond energy|calorimetry|exothermic|endothermic/],
      ["Equilibria", /equilibrium|le chatelier|equilibrium constant|k\s*c/],
      ["Reaction Kinetics", /rate of reaction|activation energy|catalyst|rate equation/],
      ["Organic Chemistry", /organic|nucleophilic|electrophilic|alkene|alkane|mechanism/],
      ["Electrochemistry", /electrode|electrolysis|oxidation|reduction|electrochemical/]
    ],
    mathematics: [
      ["Quadratics", /quadratic|discriminant|completing the square/], ["Functions", /function|inverse function|composite/],
      ["Differentiation", /differentiat|gradient|stationary point|dy\/dx/], ["Integration", /integrat|\bdx\b|area under/],
      ["Trigonometry", /sine rule|cosine rule|trigonometric|sin\s*\(|cos\s*\(/], ["Vectors", /vector|scalar product|position vector/],
      ["Probability", /probability|binomial|normal distribution|expected value/], ["Mechanics", /acceleration|momentum|force|projectile|friction/]
    ],
    biology: [
      ["Cell Structure", /cell membrane|organelle|mitochondri|ribosome|nucleus/], ["Biological Molecules", /protein|carbohydrate|lipid|amino acid/],
      ["Enzymes", /enzyme|active site|competitive inhibition/], ["Transport", /osmosis|diffusion|translocation|xylem|phloem/],
      ["Genetics", /allele|inheritance|genotype|phenotype|meiosis|dna/], ["Immunity", /antibody|antigen|phagocytosis|immune response/]
    ],
    "computer-science": [
      ["Data Representation", /binary|hexadecimal|two's complement|character set/], ["Logic Gates", /logic gate|truth table|boolean/],
      ["Algorithms", /algorithm|pseudocode|flowchart|search algorithm|sorting/], ["Databases", /database|sql|normalisation|primary key/],
      ["Networking", /network|tcp|ip address|packet|protocol/], ["Processor Fundamentals", /processor|register|fetch.execute|cpu/]
    ],
    it: [
      ["Data Processing", /data processing|validation|verification|information system/], ["Hardware & Software", /hardware|operating system|utility software/],
      ["Networks", /network|router|protocol|internet/], ["Spreadsheets", /spreadsheet|cell reference|formula|function/], ["Databases", /database|query|primary key|record/]
    ],
    economics: [
      ["Demand & Supply", /demand|supply|equilibrium price|market price/], ["Elasticity", /price elasticity|income elasticity|cross elasticity/],
      ["Market Failure", /externality|public good|merit good|market failure/], ["Macroeconomic Policy", /fiscal policy|monetary policy|unemployment|economic growth/],
      ["International Trade", /tariff|quota|exchange rate|balance of payments/], ["Inflation", /inflation|consumer price index|price level/]
    ]
  };
  for (const [topic, pattern] of rules[subjectId] || []) if (pattern.test(s)) return topic;
  return "Unclassified";
}
function segmentQuestions(lines, meta) {
  const main = [];
  let current = null;
  let lastNumber = 0;
  for (const line of lines) {
    const found = mainQuestionStart(line);
    if (found && (found.number > lastNumber && found.number <= 40)) {
      current = { number: found.number, lines: [found.rest], startPage: line.page, endPage: line.page };
      main.push(current);
      lastNumber = found.number;
    } else if (current) {
      current.lines.push(line.text);
      current.endPage = line.page;
    }
  }

  const records = [];
  for (const q of main) {
    const fullText = normalize(q.lines.join(" "));
    if (fullText.length < 20) continue;
    const parts = [];
    let part = null;
    const stem = [];
    for (const text of q.lines) {
      const found = subpartStart(text);
      if (found) {
        part = { label: found.label, lines: [found.rest] };
        parts.push(part);
      } else if (part) part.lines.push(text);
      else stem.push(text);
    }
    const stemText = normalize(stem.join(" "));
    const topic = classifyTopic(fullText, meta.subjectId);
    const addRecord = (suffix, label, prompt, startPage, endPage, parentQuestionNumber) => {
      const cleaned = normalize(prompt);
      if (cleaned.length < 12) return;
      const marks = marksIn(cleaned);
      records.push({
        id: meta.idPrefix + "-q" + q.number + suffix,
        subjectId: meta.subjectId, topic: classifyTopic(cleaned, meta.subjectId) === "Unclassified" ? topic : classifyTopic(cleaned, meta.subjectId),
        year: meta.year || 0, series: meta.series, paper: meta.paper,
        questionNumber: label, parentQuestionNumber, marks,
        prompt: cleaned.replace(/\s*\[\d{1,2}\]\s*$/, ""),
        markScheme: [], sourceUrl: meta.sourceUrl, sourceFile: meta.filename,
        sourcePage: startPage, sourcePageEnd: endPage, syllabusCode: meta.code || null,
        recordType: suffix ? "sub-question" : "question",
        reviewRequired: true, segmentationMethod: "pdf-text-layout-heuristic"
      });
    };
    // Emit sub-question records if clear parts exist; otherwise retain the full question.
    if (parts.length) {
      for (const p of parts) addRecord("-" + p.label, q.number + p.label, [stemText, p.lines.join(" ")].filter(Boolean).join(" "), q.startPage, q.endPage, q.number);
    } else {
      addRecord("", String(q.number), fullText, q.startPage, q.endPage, null);
    }
  }
  return records;
}

const records = [];
for (const sourceUrl of urls) {
  let url;
  try { url = new URL(sourceUrl); } catch { console.warn("Skipping invalid URL:", sourceUrl); continue; }
  if (!["https:", "http:"].includes(url.protocol)) { console.warn("Skipping non-web URL:", sourceUrl); continue; }
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "past-paper.pdf");
  if (!filename.toLowerCase().endsWith(".pdf")) { console.warn("Skipping URL that does not end in .pdf:", sourceUrl); continue; }
  let response;
  try { response = await fetch(sourceUrl, { headers: { "User-Agent": "PaperPulse-Authorized-PDF-Indexer/1.0" } }); }
  catch (error) { console.warn("Download failed:", sourceUrl, error.message); continue; }
  if (!response.ok) { console.warn("Download failed", response.status, sourceUrl); continue; }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("pdf") && !(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    console.warn("Response was not a PDF; skipped:", sourceUrl); continue;
  }
  const filenameBits = filename + " " + url.pathname;
  const name = filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const code = filenameBits.match(/(?:^|\D)(970[0-9]|96[0-9]{2}|92[0-9]{2}|06[0-9]{2}|05[0-9]{2}|04[0-9]{2})(?:\D|$)/)?.[1] || "";
  const subjectId = subjectByCode[code] || "other";
  const yearMatch = filenameBits.match(/(?:19|20)\d{2}|(?:^|[_-])(?:s|w|m)(\d{2})(?:[_-]|\b)/i);
  const year = yearMatch ? Number(yearMatch[0].match(/(?:19|20)\d{2}/)?.[0] || ((Number(yearMatch[1]) >= 50 ? "19" : "20") + yearMatch[1])) : null;
  const series = /(?:^|[_-])m\d{2}(?:[_-]|\b)|march/i.test(filename) ? "m" : /(?:^|[_-])w\d{2}(?:[_-]|\b)|winter|october/i.test(filename) ? "w" : /(?:^|[_-])s\d{2}(?:[_-]|\b)|summer|may|june/i.test(filename) ? "s" : "unknown";
  const paper = (filenameBits.match(/(?:qp|ms|paper)[_-]?(\d{1,2})/i)?.[1] || "0");
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const lines = [];
  let pagesWithText = 0;
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const pageTextLines = pageLines(content.items).map(line => ({ ...line, page: pageNo }));
    if (pageTextLines.some(line => line.text.length > 15)) pagesWithText++;
    lines.push(...pageTextLines);
  }
  const imported = segmentQuestions(lines, {
    idPrefix: name, subjectId, year, series, paper, sourceUrl, filename, code
  });
  if (!imported.length) {
    console.warn(filename + ": no likely question boundaries detected; not adding raw page passages. It may be scanned or use an unsupported layout.");
  }
  records.push(...imported);
  console.log(filename + ": " + imported.length + " question/sub-question records from " + doc.numPages + " pages (" + pagesWithText + " text pages)");
}

if (makeEmbeddings && records.length) {
  try {
    const { pipeline } = await import("@xenova/transformers");
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    for (let i = 0; i < records.length; i++) {
      const output = await extractor(records[i].topic + ". " + records[i].prompt, { pooling: "mean", normalize: true });
      records[i].embedding = Array.from(output.data);
      if ((i + 1) % 25 === 0 || i + 1 === records.length) console.log("Embedded", i + 1, "of", records.length);
    }
  } catch (error) {
    console.warn("Embedding model unavailable; records will use lexical fallback.", error.message);
  }
}
await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: records.length, records }, null, 2));
console.log("Wrote " + records.length + " segmented records to " + outputFile + ". Records retain source pages and are flagged for review; verify before treating them as complete.");
