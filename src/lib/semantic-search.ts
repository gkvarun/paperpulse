/**
 * Lightweight client-side keyword search for indexed past-paper questions.
 * No embedding model, model download, vector database, or external API is required.
 */
export type IndexedQuestion = {
  id: string; subjectId: string; topic: string; year: number; series: string;
  paper: string; questionNumber: number; marks: number; prompt: string;
  markScheme: string[]; embedding?: number[];
  sourceUrl?: string; pageStart?: number; pageEnd?: number;
  recordType?: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD")
  .replace(/[\\u0300-\\u036f]/g, "")
  .replace(/[^\\p{L}\\p{N}]+/gu, " ")
  .trim();
const tokens = (s: string) => [...new Set(norm(s).split(/\\s+/).filter(t => t.length > 1))];

/** Ranks exact phrases, all-term matches, and partial term matches without model inference. */
export function keywordScore(query: string, item: IndexedQuestion): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const topic = norm(item.topic || "");
  const prompt = norm(item.prompt || "");
  const markScheme = norm((item.markScheme || []).join(" "));
  const text = `${topic} ${prompt} ${markScheme}`;
  const matched = q.filter(t => text.includes(t)).length;
  if (!matched) return 0;
  const coverage = matched / q.length;
  const phrase = norm(query);
  const phraseBonus = phrase.length > 2 && text.includes(phrase) ? 1.5 : 0;
  const topicBonus = q.filter(t => topic.includes(t)).length / q.length;
  const promptBonus = q.filter(t => prompt.includes(t)).length / q.length;
  return coverage * 3 + phraseBonus + topicBonus * 0.5 + promptBonus * 0.25;
}

export async function semanticSearch<T extends IndexedQuestion>(query: string, items: T[], limit = 100): Promise<T[]> {
  if (!query.trim()) return items.slice(0, limit);
  return items
    .map((item, index) => ({ item, index, score: keywordScore(query, item) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || b.item.year - a.item.year || a.index - b.index)
    .slice(0, limit)
    .map(row => row.item);
}
