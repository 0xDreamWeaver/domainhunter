import { describe, expect, test, afterEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { importExcel, exportExcel } from '../../src/io/excel.js';
import { makeAvailable, makeTaken, makeResult, makePrice } from '../fixtures/check-results.js';

const created: string[] = [];
function tempFile() {
  const p = join(tmpdir(), `dh-excel-test-${Date.now()}.xlsx`);
  created.push(p);
  return p;
}

afterEach(() => {
  for (const f of created.splice(0)) {
    try { unlinkSync(f); } catch {}
  }
});

async function createTestXlsx(path: string, rows: string[][], headers?: string[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  if (headers) ws.addRow(headers);
  for (const row of rows) ws.addRow(row);
  await wb.xlsx.writeFile(path);
}

describe('importExcel', () => {
  test('reads domains from single-column file without header', async () => {
    const path = tempFile();
    await createTestXlsx(path, [['example.com'], ['myapp.io'], ['test.net']]);
    const domains = await importExcel(path);
    expect(domains).toContain('example.com');
    expect(domains).toContain('myapp.io');
    expect(domains).toContain('test.net');
  });

  test('detects and skips header row', async () => {
    const path = tempFile();
    await createTestXlsx(path, [['example.com'], ['myapp.io']], ['domain']);
    const domains = await importExcel(path);
    expect(domains).not.toContain('domain');
    expect(domains).toContain('example.com');
  });

  test('returns empty array for empty workbook', async () => {
    const path = tempFile();
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Empty');
    await wb.xlsx.writeFile(path);
    const domains = await importExcel(path);
    expect(domains).toHaveLength(0);
  });

  test('finds domain column by name "url"', async () => {
    const path = tempFile();
    await createTestXlsx(path, [['example.com', '100'], ['test.io', '200']], ['url', 'value']);
    const domains = await importExcel(path);
    expect(domains).toContain('example.com');
    expect(domains).toContain('test.io');
  });
});

describe('exportExcel', () => {
  const results = [
    makeAvailable('example.com', 12.99),
    makeTaken('owned.net'),
    makeResult('multi.io', {
      status: 'available',
      prices: [makePrice('godaddy', 25), makePrice('namecheap', 18.50)],
    }),
  ];

  test('creates a valid xlsx file', async () => {
    const path = tempFile();
    await exportExcel(results, path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    expect(wb.worksheets).toHaveLength(1);
  });

  test('header row contains expected columns', async () => {
    const path = tempFile();
    await exportExcel(results, path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0]!;
    const headers = (ws.getRow(1).values as string[]).slice(1);
    expect(headers).toContain('Domain');
    expect(headers).toContain('Status');
    expect(headers).toContain('SEO Score');
  });

  test('domain names appear in data rows', async () => {
    const path = tempFile();
    await exportExcel(results, path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0]!;
    const domains: string[] = [];
    ws.eachRow((row, n) => {
      if (n > 1) domains.push(row.getCell(1).value as string);
    });
    expect(domains).toContain('example.com');
    expect(domains).toContain('owned.net');
    expect(domains).toContain('multi.io');
  });

  test('status values written correctly', async () => {
    const path = tempFile();
    await exportExcel(results, path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0]!;
    const statuses: string[] = [];
    ws.eachRow((row, n) => {
      if (n > 1) statuses.push(row.getCell(2).value as string);
    });
    expect(statuses).toContain('available');
    expect(statuses).toContain('taken');
  });

  test('SEO scores are numeric', async () => {
    const path = tempFile();
    await exportExcel([makeAvailable('example.com')], path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.worksheets[0]!;
    const seoCell = ws.getRow(2).getCell(4).value;
    expect(typeof seoCell).toBe('number');
  });

  test('exports empty results without error', async () => {
    const path = tempFile();
    await exportExcel([], path);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    expect(wb.worksheets[0]!.rowCount).toBe(1); // header only
  });
});
