import { google } from 'googleapis';
import type { CheckResult } from '../types.js';

function getAuth() {
  const KEY_PATH = process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  if (!KEY_PATH) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set');
  return new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

function extractSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? urlOrId;
}

function findDomainColumnIndex(headers: string[]): number {
  const candidates = ['domain', 'name', 'url', 'hostname'];
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase() === candidate);
    if (idx !== -1) return idx;
  }
  return 0;
}

export async function importSheets(urlOrId: string, range = 'A:Z'): Promise<string[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(urlOrId);

  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = (response.data.values ?? []) as string[][];

  if (!rows.length) return [];

  const first = rows[0] ?? [];
  const colIdx = findDomainColumnIndex(first.map(c => c?.toString() ?? ''));
  const hasHeader = !/\.\w{2,}$/.test(first[colIdx] ?? '');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map(row => (row[colIdx] ?? '').trim())
    .filter(Boolean);
}

export async function exportSheets(results: CheckResult[], urlOrId: string): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = extractSheetId(urlOrId);

  const headers = [
    'Domain', 'Status', 'Best Price', 'SEO Score',
    'GoDaddy Price', 'Namecheap Price', 'Domainr Price',
    'Registrar', 'Registrant', 'Email', 'Created', 'Expires',
  ];

  const rows: (string | number)[][] = results.map(r => {
    const prices = r.prices.filter(p => p.price != null);
    const minPrice = prices.length ? `$${Math.min(...prices.map(p => p.price!)).toFixed(2)}` : '';

    return [
      r.domain.name,
      r.status,
      minPrice,
      r.seoScore.total,
      priceFor(r, 'godaddy'),
      priceFor(r, 'namecheap'),
      priceFor(r, 'domainr'),
      r.whois?.registrar ?? '',
      r.whois?.registrant ?? '',
      r.whois?.email ?? '',
      r.whois?.created ?? '',
      r.whois?.expires ?? '',
    ];
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...rows] },
  });
}

function priceFor(r: CheckResult, registrar: string): string {
  const p = r.prices.find(p => p.registrar === registrar);
  return p?.price != null ? `$${p.price.toFixed(2)}` : '';
}
