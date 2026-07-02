// Highlight model for the Legal Assistant source panel.
// Pure, framework-agnostic. Two tiers, both computed client-side with zero LLM cost:
//   - Tier 1 "salient":  deterministic legal tokens (amounts, %, dates, obligations, refs)
//   - Tier 2 "relevant": the sentence(s) most overlapping with the user's question
//
// Rendering combines the two: a salient token inside a relevant sentence carries both.

export interface Segment {
  text: string;
  salient: boolean; // Tier 1
}

export interface SentenceModel {
  segments: Segment[];
  relevant: boolean; // Tier 2
}

export type HighlightModel = SentenceModel[];

interface Range {
  start: number;
  end: number;
}

// ─── Tier 1: legal salience ───────────────────────────────────

const MONTHS =
  "gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre";

// Each pattern is global + unicode. Order is irrelevant — ranges are merged afterwards.
const SALIENT_PATTERNS: RegExp[] = [
  // Importi in euro: "€ 35.000.000", "35.000.000 EUR", "35 000 000 euro"
  /€\s?\d[\d.\s]*\d/gu,
  /\d[\d.\s]*\d\s?(?:EUR|euro)/giu,
  /\b\d+\s?milioni(?:\s+di\s+euro)?/giu,
  // Percentuali: "7%", "3 % del fatturato mondiale totale annuo"
  /\d+(?:[.,]\d+)?\s?%(?:\s+del\s+fatturato(?:\s+mondiale)?(?:\s+totale)?(?:\s+annuo)?)?/giu,
  // Date / scadenze: "2 dicembre 2026"
  new RegExp(`\\b\\d{1,2}°?\\s+(?:${MONTHS})\\s+\\d{4}`, "giu"),
  // Obblighi e divieti
  /(?<![\p{L}])(?:è\s+vietat\w+|sono\s+vietat\w+|vietat\w+|non\s+può|non\s+possono|deve|devono|è\s+tenut\w+|sono\s+tenut\w+|obblig\w+|divieto|prescriv\w+)(?![\p{L}])/giu,
  // Riferimenti normativi
  /\b(?:articol[oi]|art\.?)\s+\d+(?:\s*,?\s+paragrafo\s+\d+)?(?:\s*,?\s+lettera\s+[a-z]\))?/giu,
  /\bparagraf[oi]\s+\d+/giu,
  /\ballegato\s+[IVXLC]+/giu,
  /\bconsiderando\s+\d+/giu,
];

function collectSalient(text: string): Range[] {
  const ranges: Range[] = [];
  for (const pattern of SALIENT_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (m[0].length === 0) {
        pattern.lastIndex++; // guard against zero-width matches
        continue;
      }
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return ranges;
}

function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Range[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Exposed for tests: merged, sorted salient ranges over the whole text. */
export function findSalientRanges(text: string): Range[] {
  return mergeRanges(collectSalient(text));
}

// ─── Tier 2: question relevance ───────────────────────────────

// Grammatical filler + ultra-common corpus terms we never want to score on.
const STOPWORDS = new Set([
  "quali", "quale", "sono", "essere", "il", "lo", "la", "le", "gli", "un", "uno", "una",
  "di", "del", "dello", "della", "dei", "delle", "degli", "dal", "dalla", "dalle",
  "per", "con", "che", "come", "cosa", "ai", "sensi", "alla", "allo", "alle", "agli",
  "nel", "nello", "nella", "nelle", "negli", "sul", "sullo", "sulla", "sulle",
  "questo", "questa", "questi", "queste", "ogni", "tutti", "tutte", "tutto", "tutta",
  "secondo", "regolamento", "articolo", "art", "deve", "devono", "previsto", "previste",
  "quando", "dove", "perché", "perche", "quanto", "tale", "tali",
]);

const SPLIT_WORDS = /[^\p{L}\p{N}]+/u;

function stem(word: string): string {
  return word.slice(0, Math.min(word.length, 6));
}

/** Exposed for tests: significant stems extracted from the user's question. */
export function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(SPLIT_WORDS)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
        .map(stem)
        .filter((s) => s.length >= 4)
    )
  );
}

function splitSentences(text: string): Range[] {
  const ranges: Range[] = [];
  // Break after .;: followed by whitespace + an uppercase/quote start.
  // Avoids splitting inside "35.000.000" and "Art. 5".
  const re = /[.;:]\s+(?=[A-ZÀ-Ý«"“])/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    ranges.push({ start: last, end });
    last = end;
  }
  if (last < text.length) ranges.push({ start: last, end: text.length });
  if (ranges.length === 0) ranges.push({ start: 0, end: text.length });
  return ranges;
}

function pickRelevant(sentences: Range[], text: string, query: string): Set<number> {
  const stems = tokenizeQuery(query);
  if (stems.length === 0) return new Set();

  const scores = sentences.map(({ start, end }) => {
    const words = text.slice(start, end).toLowerCase().split(SPLIT_WORDS);
    let s = 0;
    for (const st of stems) {
      if (words.some((w) => w.startsWith(st))) s++;
    }
    return s;
  });

  const max = Math.max(...scores);
  const threshold = Math.min(2, stems.length);
  if (max === 0 || max < threshold) return new Set();

  const result = new Set<number>();
  let count = 0;
  for (let i = 0; i < scores.length && count < 2; i++) {
    if (scores[i] === max) {
      result.add(i);
      count++;
    }
  }
  return result;
}

// ─── Assembly ─────────────────────────────────────────────────

function sliceSegments(text: string, start: number, end: number, salient: Range[]): Segment[] {
  const segs: Segment[] = [];
  let pos = start;
  for (const r of salient) {
    if (r.end <= start || r.start >= end) continue; // outside this sentence window
    const s = Math.max(r.start, start);
    const e = Math.min(r.end, end);
    if (s > pos) segs.push({ text: text.slice(pos, s), salient: false });
    segs.push({ text: text.slice(s, e), salient: true });
    pos = e;
  }
  if (pos < end) segs.push({ text: text.slice(pos, end), salient: false });
  return segs.filter((seg) => seg.text.length > 0);
}

export function buildHighlightModel(text: string, query = ""): HighlightModel {
  if (!text) return [];
  const salient = findSalientRanges(text);
  const sentences = splitSentences(text);
  const relevant = pickRelevant(sentences, text, query);
  return sentences.map((sen, i) => ({
    relevant: relevant.has(i),
    segments: sliceSegments(text, sen.start, sen.end, salient),
  }));
}
