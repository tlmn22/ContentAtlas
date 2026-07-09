/**
 * Extracts movie search candidates from a recap video title.
 *
 * Typical inputs:
 *   «Аав» кино тайлбар | The Father (2020)
 *   Titanic (1997) - Кино тайлбар
 *   Гэр бүлээ аврахын төлөө | John Wick 4 тайлбар
 *   АЙМШГИЙН КИНО: The Conjuring 2
 */

export interface ParsedTitle {
  /** Ordered TMDB search candidates, best first */
  queries: string[];
  year: number | null;
  /** Cyrillic quoted title, kept as the Mongolian movie title */
  titleMn: string | null;
}

/** Phrases that carry no movie-title information */
const NOISE_PATTERNS: RegExp[] = [
  /кино(ны)?\s+тайлбар(лав|лалт)?/gi,
  /киноны?\s+үйл\s+явдал/gi,
  /кино\s+ярина/gi,
  /монгол\s+хэлээр/gi,
  /монгол\s+хадмал/gi,
  /шинэ\s+кино/gi,
  /бүрэн\s+тайлбар/gi,
  /\bтайлбар\b/gi,
  /\bмуск\b/gi,
  /movie\s+recap(ped)?/gi,
  /film\s+recap/gi,
  /ending\s+explained/gi,
  /\brecap\b/gi,
  /\bexplained\b/gi,
  /full\s+movie/gi,
  /\bhd\b/gi,
  /\b4k\b/gi,
  /\bофициал\b/gi,
];

const CURRENT_YEAR = new Date().getFullYear();

function stripEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, " ");
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Lowercase, strip punctuation - used for comparing against TMDB titles */
export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYear(title: string): number | null {
  // Prefer a parenthesized year - almost always the release year
  const paren = title.match(/\((19[2-9]\d|20\d{2})\)/);
  const candidate = paren?.[1] ?? title.match(/\b(19[2-9]\d|20\d{2})\b/)?.[1];
  if (!candidate) return null;
  const year = Number(candidate);
  return year >= 1920 && year <= CURRENT_YEAR + 1 ? year : null;
}

function removeNoise(s: string): string {
  let out = s;
  for (const p of NOISE_PATTERNS) out = out.replace(p, " ");
  return collapse(
    out
      .replace(/#[\p{L}\p{N}_]+/gu, " ") // hashtags
      .replace(/\[(.*?)\]|【(.*?)】/g, " ") // bracketed tags
      .replace(/\((19|20)\d{2}\)/g, " ") // years
      .replace(/\b(19[2-9]\d|20\d{2})\b/g, " ")
  );
}

function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

function isMostlyLatin(s: string): boolean {
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  const cyr = (s.match(/[Ѐ-ӿ]/g) ?? []).length;
  return latin >= 2 && latin > cyr;
}

/** Contiguous Latin-script phrases, e.g. "John Wick 4" out of a mixed title */
function extractLatinPhrases(title: string): string[] {
  const matches = title.match(/[A-Za-z][A-Za-z0-9'&:.,!?’\- ]*[A-Za-z0-9]/g) ?? [];
  return matches
    .map((m) => removeNoise(m))
    .filter((m) => /[A-Za-z]{2}/.test(m) && m.length >= 3)
    .sort((a, b) => b.length - a.length);
}

/** Text inside «», “”, "" or '' quotes */
function extractQuoted(title: string): string[] {
  const out: string[] = [];
  for (const re of [/«([^»]+)»/g, /“([^”]+)”/g, /"([^"]+)"/g, /'([^']{3,})'/g]) {
    for (const m of title.matchAll(re)) out.push(collapse(m[1]));
  }
  return out.filter((q) => q.length >= 2);
}

export function parseVideoTitle(rawTitle: string): ParsedTitle {
  const title = collapse(stripEmoji(rawTitle));
  const year = extractYear(title);

  const quoted = extractQuoted(title);
  const quotedLatin = quoted.filter(isMostlyLatin).map(removeNoise);
  const quotedCyrillic = quoted.filter((q) => hasCyrillic(q) && !isMostlyLatin(q));

  const latinPhrases = extractLatinPhrases(title);
  const cleanedFull = removeNoise(title.replace(/[«»“”"|]/g, " "));

  const queries: string[] = [];
  const push = (q: string) => {
    const c = collapse(q);
    if (c.length >= 2 && !queries.some((x) => normalizeForCompare(x) === normalizeForCompare(c))) {
      queries.push(c);
    }
  };

  for (const q of quotedLatin) push(q);
  for (const q of latinPhrases) push(q);
  if (isMostlyLatin(cleanedFull)) push(cleanedFull);
  // Cyrillic titles rarely match TMDB, but keep as a last resort
  for (const q of quotedCyrillic) push(removeNoise(q));

  return {
    queries: queries.slice(0, 4),
    year,
    titleMn: quotedCyrillic[0] ? removeNoise(quotedCyrillic[0]) || null : null,
  };
}
