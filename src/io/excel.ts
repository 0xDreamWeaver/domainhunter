import ExcelJS from 'exceljs';
import type { CheckResult } from '../types.js';

function findDomainColumn(headers: (string | null | undefined)[]): number {
  const candidates = ['domain', 'name', 'url', 'hostname'];
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h?.toLowerCase() === candidate);
    if (idx !== -1) return idx;
  }
  return 0;
}

export async function importExcel(filePath: string): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const domains: string[] = [];
  let colIdx = 0;
  let headerChecked = false;

  sheet.eachRow((row, rowNum) => {
    const cells = row.values as (string | null | undefined)[];
    // ExcelJS row.values is 1-indexed (index 0 is undefined)
    const values = cells.slice(1);

    if (!headerChecked) {
      headerChecked = true;
      colIdx = findDomainColumn(values.map(v => v?.toString()));
      // If first row looks like a header (no TLD pattern), skip it
      const firstCell = values[colIdx]?.toString() ?? '';
      if (!/\.\w{2,}$/.test(firstCell)) return;
    }

    const value = values[colIdx]?.toString().trim();
    if (value) domains.push(value);
  });

  return domains;
}

export async function exportExcel(results: CheckResult[], filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('DomainHunter Results');

  sheet.columns = [
    { header: 'Domain', key: 'domain', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Best Price', key: 'bestPrice', width: 12 },
    { header: 'SEO Score', key: 'seoScore', width: 12 },
    { header: 'GoDaddy Price', key: 'godaddy', width: 14 },
    { header: 'Namecheap Price', key: 'namecheap', width: 16 },
    { header: 'Domainr Price', key: 'domainr', width: 14 },
    { header: 'Registrar', key: 'registrar', width: 25 },
    { header: 'Registrant', key: 'registrant', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Created', key: 'created', width: 15 },
    { header: 'Expires', key: 'expires', width: 15 },
    { header: 'SEO Length', key: 'seoLength', width: 12 },
    { header: 'SEO TLD', key: 'seoTld', width: 10 },
    { header: 'SEO Hyphens', key: 'seoHyphens', width: 12 },
    { header: 'SEO Pronounce', key: 'seoPronounce', width: 14 },
    { header: 'SEO Brand', key: 'seoBrand', width: 12 },
    { header: 'SEO Keywords', key: 'seoKeywords', width: 14 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const r of results) {
    const prices = r.prices.filter(p => p.price != null);
    const minPrice = prices.length ? Math.min(...prices.map(p => p.price!)) : null;

    const row = sheet.addRow({
      domain: r.domain.name,
      status: r.status,
      bestPrice: minPrice != null ? minPrice : '',
      seoScore: r.seoScore.total,
      godaddy: priceFor(r, 'godaddy'),
      namecheap: priceFor(r, 'namecheap'),
      domainr: priceFor(r, 'domainr'),
      registrar: r.whois?.registrar ?? '',
      registrant: r.whois?.registrant ?? '',
      email: r.whois?.email ?? '',
      created: r.whois?.created ?? '',
      expires: r.whois?.expires ?? '',
      seoLength: r.seoScore.breakdown.length,
      seoTld: r.seoScore.breakdown.tld,
      seoHyphens: r.seoScore.breakdown.hyphenNumbers,
      seoPronounce: r.seoScore.breakdown.pronounceability,
      seoBrand: r.seoScore.breakdown.brandability,
      seoKeywords: r.seoScore.breakdown.keywords,
    });

    // Color-code status
    const statusCell = row.getCell('status');
    if (r.status === 'available') {
      statusCell.font = { color: { argb: 'FF22C55E' } };
    } else if (r.status === 'taken') {
      statusCell.font = { color: { argb: 'FFEF4444' } };
    }

    // Color-code SEO score
    const seoCell = row.getCell('seoScore');
    const score = r.seoScore.total;
    if (score >= 80) seoCell.font = { color: { argb: 'FF22C55E' } };
    else if (score >= 60) seoCell.font = { color: { argb: 'FFEAB308' } };
    else seoCell.font = { color: { argb: 'FFEF4444' } };
  }

  await workbook.xlsx.writeFile(filePath);
}

function priceFor(r: CheckResult, registrar: string): number | string {
  const p = r.prices.find(p => p.registrar === registrar);
  return p?.price != null ? p.price : '';
}
