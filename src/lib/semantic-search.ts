/**
 * PaperPulse semantic retrieval.
 *
 * Uses @xenova/transformers in the browser when an embedding index is present.
 * Index records are produced by scripts/build-question-index.mjs from PDFs the
 * operator is authorized to process. Keyword matching remains a graceful fallback.
 */
export type IndexedQuestion = {
  id: string; subjectId: string; topic: string; year: number; series: string;
  paper: string; questionNumber: number; marks: number; prompt: string;
  markScheme: string[]; embedding?: number[];
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").filter(Boolean);
export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot=0, aa=0, bb=0;
  for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; aa+=a[i]*a[i]; bb+=b[i]*b[i]; }
  return aa && bb ? dot/(Math.sqrt(aa)*Math.sqrt(bb)) : 0;
}
export function keywordScore(query: string, item: IndexedQuestion) {
  const q=tokens(query); if(!q.length) return 0;
  const text=norm([item.topic,item.prompt].join(" "));
  const matched=q.filter(t=>text.includes(t)).length;
  return matched/q.length + (norm(item.topic).includes(norm(query)) ? 1 : 0);
}
export async function embedText(text: string): Promise<number[] | null> {
  try {
    const { pipeline } = await import("@xenova/transformers");
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (error) {
    console.warn("Semantic model unavailable; using keyword retrieval.", error);
    return null;
  }
}
export async function semanticSearch<T extends IndexedQuestion>(query: string, items: T[], limit = 100) {
  if (!query.trim()) return items.slice(0, limit);
  const qv = await embedText(query);
  const ranked = items.map(item => {
    const semantic = qv && item.embedding ? cosineSimilarity(qv, item.embedding) : 0;
    const lexical = keywordScore(query, item);
    return { item, score: qv && item.embedding ? semantic * 0.8 + Math.min(lexical, 2) * 0.1 : lexical };
  }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score);
  return ranked.slice(0,limit).map(x=>x.item);
}
