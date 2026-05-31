import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { makeAvailable, makeTaken, makeResult, makePrice } from '../fixtures/check-results.js';

// We mock the googleapis module before importing sheets
const mockValuesGet = mock(async () => ({ data: { values: [] } }));
const mockValuesUpdate = mock(async () => ({}));
const mockValuesAppend = mock(async () => ({}));

const mockSheets = {
  spreadsheets: {
    values: {
      get: mockValuesGet,
      update: mockValuesUpdate,
      append: mockValuesAppend,
    },
  },
};

mock.module('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: class {
        constructor() {}
      },
    },
    sheets: () => mockSheets,
  },
}));

// Now import sheets (will use the mocked googleapis)
const { importSheets, exportSheets } = await import('../../src/io/sheets.js');

describe('importSheets – ID extraction', () => {
  beforeEach(() => {
    process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'] = '/fake/key.json';
    mockValuesGet.mockReset();
  });

  afterEach(() => {
    delete process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  });

  test('accepts bare spreadsheet ID', async () => {
    mockValuesGet.mockResolvedValueOnce({ data: { values: [['example.com'], ['test.io']] } });
    const domains = await importSheets('abc123def456');
    expect(domains).toContain('example.com');
    expect(domains).toContain('test.io');
  });

  test('extracts ID from full Google Sheets URL', async () => {
    mockValuesGet.mockResolvedValueOnce({ data: { values: [['example.com']] } });
    await importSheets('https://docs.google.com/spreadsheets/d/abc123/edit#gid=0');
    const callArgs = mockValuesGet.mock.calls[0]?.[0] as any;
    expect(callArgs?.spreadsheetId).toBe('abc123');
  });

  test('skips header row when first row has no TLD', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          ['domain', 'notes'],
          ['example.com', 'great'],
          ['test.io', 'ok'],
        ],
      },
    });
    const domains = await importSheets('sheetid');
    expect(domains).not.toContain('domain');
    expect(domains).toContain('example.com');
    expect(domains).toContain('test.io');
  });

  test('does not skip first row when it looks like a domain', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: { values: [['example.com'], ['test.io']] },
    });
    const domains = await importSheets('sheetid');
    expect(domains).toHaveLength(2);
    expect(domains).toContain('example.com');
  });

  test('finds domain column by "name" header', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          ['id', 'name', 'score'],
          ['1', 'example.com', '90'],
          ['2', 'test.io', '80'],
        ],
      },
    });
    const domains = await importSheets('sheetid');
    expect(domains).toContain('example.com');
    expect(domains).toContain('test.io');
    expect(domains).not.toContain('id');
  });

  test('returns empty array when sheet has no data', async () => {
    mockValuesGet.mockResolvedValueOnce({ data: { values: [] } });
    const domains = await importSheets('sheetid');
    expect(domains).toHaveLength(0);
  });

  test('throws when GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set', async () => {
    delete process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
    await expect(importSheets('sheetid')).rejects.toThrow('GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
  });
});

describe('exportSheets', () => {
  beforeEach(() => {
    process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'] = '/fake/key.json';
    mockValuesUpdate.mockReset();
    mockValuesUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  });

  const results = [
    makeAvailable('example.com', 12.99),
    makeTaken('owned.net'),
    makeResult('multi.io', {
      status: 'available',
      prices: [makePrice('godaddy', 25), makePrice('namecheap', 18.50)],
    }),
  ];

  test('calls spreadsheets.values.update', async () => {
    await exportSheets(results, 'sheetid');
    expect(mockValuesUpdate.mock.calls).toHaveLength(1);
  });

  test('passes correct spreadsheetId', async () => {
    await exportSheets(results, 'mysheetid123');
    const args = mockValuesUpdate.mock.calls[0]?.[0] as any;
    expect(args.spreadsheetId).toBe('mysheetid123');
  });

  test('first row is headers', async () => {
    await exportSheets(results, 'sheetid');
    const args = mockValuesUpdate.mock.calls[0]?.[0] as any;
    const firstRow = args.requestBody.values[0];
    expect(firstRow).toContain('Domain');
    expect(firstRow).toContain('Status');
    expect(firstRow).toContain('SEO Score');
  });

  test('domain names appear in data rows', async () => {
    await exportSheets(results, 'sheetid');
    const args = mockValuesUpdate.mock.calls[0]?.[0] as any;
    const domainNames = args.requestBody.values.slice(1).map((r: any[]) => r[0]);
    expect(domainNames).toContain('example.com');
    expect(domainNames).toContain('owned.net');
    expect(domainNames).toContain('multi.io');
  });

  test('best price formatted with $ prefix', async () => {
    await exportSheets([makeAvailable('example.com', 9.99)], 'sheetid');
    const args = mockValuesUpdate.mock.calls[0]?.[0] as any;
    const dataRow = args.requestBody.values[1];
    expect(dataRow[2]).toBe('$9.99');
  });

  test('extracts ID from URL for export', async () => {
    await exportSheets(results, 'https://docs.google.com/spreadsheets/d/xyzsheet/edit');
    const args = mockValuesUpdate.mock.calls[0]?.[0] as any;
    expect(args.spreadsheetId).toBe('xyzsheet');
  });
});
