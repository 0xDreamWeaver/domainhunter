import type { Domain, SeoScore } from '../types.js';

const TLD_SCORES: Record<string, number> = {
  com: 25, io: 22, ai: 22, co: 20, app: 20,
  dev: 18, net: 18, org: 18, me: 15, us: 12,
  uk: 12, ca: 12, au: 12, de: 12, fr: 12,
  info: 6, biz: 6, online: 5, site: 5, store: 5,
};

const BRAND_SUFFIXES = [
  'ly', 'ify', 'io', 'hub', 'app', 'base', 'lab', 'labs',
  'hq', 'pal', 'kit', 'box', 'ai', 'co', 'spot', 'desk',
  'ware', 'stack', 'forge', 'craft', 'works', 'space',
];

const MAX_SCORES = {
  length: 20,
  tld: 25,
  hyphenNumbers: 15,
  pronounceability: 20,
  brandability: 20,
  keywords: 20,
};

function scoreLength(sld: string): number {
  const len = sld.length;
  if (len <= 5) return 20;
  if (len <= 7) return 17;
  if (len <= 9) return 14;
  if (len <= 12) return 10;
  if (len <= 15) return 5;
  return 0;
}

function scoreTld(tld: string): number {
  const base = tld.split('.').pop() ?? tld;
  return TLD_SCORES[base] ?? 3;
}

function scoreHyphenNumbers(sld: string): number {
  const hasHyphen = sld.includes('-');
  const hasNumber = /\d/.test(sld);
  if (!hasHyphen && !hasNumber) return 15;
  if (hasHyphen && hasNumber) return 0;
  return hasHyphen ? 5 : 8;
}

function scorePronounceability(sld: string): number {
  const clean = sld.replace(/[^a-z]/g, '');
  if (!clean.length) return 10;

  const vowels = (clean.match(/[aeiou]/g) ?? []).length;
  const ratio = vowels / clean.length;

  let score = 20;

  // Penalize poor vowel ratio
  if (ratio < 0.2 || ratio > 0.7) score -= 8;
  else if (ratio < 0.25 || ratio > 0.6) score -= 4;

  // Penalize consonant clusters of 3+
  const clusters = clean.match(/[^aeiou]{3,}/g) ?? [];
  score -= clusters.length * 4;

  return Math.max(0, Math.min(20, score));
}

function scoreBrandability(sld: string): number {
  let score = 0;

  // Single-word (no hyphens) bonus
  if (!sld.includes('-')) score += 8;

  // Ends with common brand suffix
  if (BRAND_SUFFIXES.some(s => sld.endsWith(s) && sld.length > s.length)) score += 7;

  // Good length for branding
  if (sld.length >= 4 && sld.length <= 10) score += 5;

  return Math.min(20, score);
}

function scoreKeywords(sld: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const lower = sld.toLowerCase();
  const matches = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
  return Math.min(20, Math.round((matches / keywords.length) * 20));
}

export function scoreDomain(domain: Domain, keywords: string[] = []): SeoScore {
  const sld = domain.sld.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const breakdown = {
    length: scoreLength(sld),
    tld: scoreTld(domain.tld),
    hyphenNumbers: scoreHyphenNumbers(sld),
    pronounceability: scorePronounceability(sld),
    brandability: scoreBrandability(sld),
    keywords: scoreKeywords(sld, keywords),
  };

  const baseMax = MAX_SCORES.length + MAX_SCORES.tld + MAX_SCORES.hyphenNumbers +
    MAX_SCORES.pronounceability + MAX_SCORES.brandability;
  const base = breakdown.length + breakdown.tld + breakdown.hyphenNumbers +
    breakdown.pronounceability + breakdown.brandability;

  // Keywords scale the remaining headroom
  const keywordBonus = breakdown.keywords;
  const total = Math.min(100, Math.round((base / baseMax) * 80) + Math.round(keywordBonus * 0.2 * 20 / MAX_SCORES.keywords));

  // Simpler: just sum and cap at 100
  const rawTotal = Math.min(100, breakdown.length + breakdown.tld + breakdown.hyphenNumbers +
    breakdown.pronounceability + breakdown.brandability + Math.round(breakdown.keywords * 0.2));

  return {
    total: rawTotal,
    breakdown,
    maxBreakdown: MAX_SCORES,
  };
}
