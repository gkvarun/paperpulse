#!/usr/bin/env node
/**
 * Export question-paper PDF URLs using the exact subject/year/session/paper
 * combinations exposed by Paper Finder. Imports the live selector definitions
 * so its URL catalogue stays aligned with the UI.
 *
 * Usage:
 *   npm run export:paper-urls -- --out ./papacambridge-pdf-urls.txt
 *   npm run export:paper-urls -- --from 2012 --to 2026 --subject physics --check
 *
 * --check makes concurrent HEAD requests and writes only URLs confirmed as
 * existing PDFs. Some hosts do not support HEAD; without --check all generated
 * selector URLs are exported and the importer skips unavailable links.
 */
import fs from "node:fs/promises";
import { SUBJECTS, QUALIFICATIONS, YEARS, SERIES, subjectCode, subjectPapers, variantsFor } from "../src/data/subjects.ts";
import { paperUrl, type PaperRef } from "../src/lib/papacambridge.ts";

const argv = process.argv.slice(2);
function option(name: string, fallback?: string) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
}
const out = option("--out", "./papacambridge-pdf-urls.txt");
const from = Number(option("--from", "2012"));
const to = Number(option("--to", "2026"));
const selectedSubject = option("--subject");
const check = argv.includes("--check");
const concurrency = Math.max(1, Math.min(20, Number(option("--concurrency", "8")) || 8));
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) throw new Error("Use valid --from and --to years.");

const urls = new Set<string>();
const refs = new Map<string, { subject: string; qualification: string; year: number; series: string; paper: string }>();
for (const subject of SUBJECTS) {
  if (selectedSubject && subject.id !== selectedSubject && subject.name.toLowerCase() !== selectedSubject.toLowerCase()) continue;
  for (const qualification of QUALIFICATIONS) {
    const code = subjectCode(subject, qualification);
    if (!code) continue;
    const papers = subjectPapers(subject, qualification);
    for (const year of YEARS.filter(y => y >= from && y <= to)) {
      for (const session of SERIES) {
        for (const component of papers) {
          for (const variant of variantsFor(session.code)) {
            const ref: PaperRef = { code, series: session.code, year, paper: String(component.number) + String(variant) };
            const url = paperUrl(ref, "qp");
            urls.add(url);
            refs.set(url, { subject: subject.name, qualification, year, series: session.code, paper: ref.paper });
          }
        }
      }
    }
  }
}

let candidates = [...urls];
console.log("Generated", candidates.length, "unique question-paper URLs from the Paper Finder selector definitions.");
if (check) {
  let cursor = 0, checked = 0;
  const found = [];
  async function worker() {
    while (cursor < candidates.length) {
      const url = candidates[cursor++];
      try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (response.ok && (response.headers.get("content-type") || "").toLowerCase().includes("pdf")) found.push(url);
        else if (response.ok && !response.headers.get("content-type")) found.push(url);
      } catch (error) {
        console.warn("Could not check", url, error.message);
      }
      checked++;
      if (checked % 100 === 0 || checked === candidates.length) console.log("Checked", checked, "of", candidates.length, "· PDFs confirmed:", found.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  candidates = found.sort();
  console.log("Confirmed", candidates.length, "candidate PDFs. Note: host HEAD support/content-type varies; review before importing.");
}
await fs.writeFile(out, candidates.join("\n") + (candidates.length ? "\n" : ""), "utf8");
const manifest = out.replace(/\.txt$/i, ".json");
await fs.writeFile(manifest, JSON.stringify(candidates.map(url => ({ url, ...refs.get(url) })), null, 2), "utf8");
console.log("Wrote URL list:", out);
console.log("Wrote metadata manifest:", manifest);
