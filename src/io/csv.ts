import Papa from 'papaparse';
import type { CheckResult } from '../types.js';
import { parseDomain } from '../checkers/index.js';

function findDomainColumn(headers: string[]): number {
  const candidates = ['domain', 'name', 'url', 'hostname'];
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase() === candidate);
    if (idx !== -1) return idx;
  }
  return 0;
}

export async function importCsv(filePath: string): Promise<string[]> {
  const content = await Bun.file(filePath).text();
  const result = Papa.parse<string[]>(content, { skipEmptyLines: true });

  if (!result.data.length) return [];

  const first = result.data[0];
  if (!first) return [];

  // Detect header row
  const colIdx = findDomainColumn(first);
  const hasHeader = first[colIdx] != null && !/\.\w{2,}$/.test(first[colIdx] ?? '');
  const rows = hasHeader ? result.data.slice(1) : result.data;

  return rows
    .map(row => (row[colIdx] ?? '').trim())
    .filter(Boolean);
}

export async function exportCsv(results: CheckResult[], filePath: string): Promise<void> {
  const rows = results.map(r => ({
    domain: r.domain.name,
    status: r.status,
    best_price: bestPrice(r),
    seo_score: r.seoScore.total,
    godaddy_price: priceFor(r, 'godaddy'),
    namecheap_price: priceFor(r, 'namecheap'),
    domainr_price: priceFor(r, 'domainr'),
    registrar: r.whois?.registrar ?? '',
    registrant: r.whois?.registrant ?? '',
    email: r.whois?.email ?? '',
    created: r.whois?.created ?? '',
    expires: r.whois?.expires ?? '',
    seo_length: r.seoScore.breakdown.length,
    seo_tld: r.seoScore.breakdown.tld,
    seo_hyphens: r.seoScore.breakdown.hyphenNumbers,
    seo_pronounce: r.seoScore.breakdown.pronounceability,
    seo_brand: r.seoScore.breakdown.brandability,
    seo_keywords: r.seoScore.breakdown.keywords,
  }));

  const csv = Papa.unparse(rows);
  await Bun.write(filePath, csv);
}

function bestPrice(r: CheckResult): string {
  const prices = r.prices.filter(p => p.price != null);
  if (!prices.length) return '';
  const min = Math.min(...prices.map(p => p.price!));
  return `$${min.toFixed(2)}`;
}

function priceFor(r: CheckResult, registrar: string): string {
  const p = r.prices.find(p => p.registrar === registrar);
  return p?.price != null ? `$${p.price.toFixed(2)}` : '';
}
