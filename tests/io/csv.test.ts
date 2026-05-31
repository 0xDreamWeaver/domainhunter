import { describe, expect, test, afterEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync } from 'node:fs';
import { importCsv, exportCsv } from '../../src/io/csv.js';
import { makeAvailable, makeTaken, makeResult, makePrice } from '../fixtures/check-results.js';

const tmp = (name: string) => join(tmpdir(), `dh-test-${name}-${Date.now()}.csv`);
const created: string[] = [];
function tempFile(name: string) {
  const p = tmp(name);
  created.push(p);
  return p;
}

afterEach(() => {
  for (const f of created.splice(0)) {
    try { unlinkSync(f); } catch {}
  }
});

async function writeCsv(path: string, content: string) {
  await Bun.write(path, content);
}

describe('importCsv', () => {
  test('reads domains from header-less single-column file', async () => {
    const path = tempFile('no-header');
    await writeCsv(path, 'example.com\nmyapp.io\ntest.net\n');
    const domains = await importCsv(path);
    expect(domains).toEqual(['example.com', 'myapp.io', 'test.net']);
  });

  test('detects header row and skips it', async () => {
    const path = tempFile('with-header');
    await writeCsv(path, 'domain,notes\nexample.com,test\nmyapp.io,prod\n');
    const domains = await importCsv(path);
    expect(domains).toContain('example.com');
    expect(domains).toContain('myapp.io');
    expect(domains).not.toContain('domain');
  });

  test('finds domain column named "name"', async () => {
    const path = tempFile('name-col');
    await writeCsv(path, 'id,name,type\n1,example.com,brand\n2,test.io,tech\n');
    const domains = await importCsv(path);
    expect(domains).toContain('example.com');
    expect(domains).toContain('test.io');
  });

  test('finds domain column named "url"', async () => {
    const path = tempFile('url-col');
    await writeCsv(path, 'url,value\nexample.com,100\n');
    const domains = await importCsv(path);
    expect(domains).toContain('example.com');
  });

  test('returns empty array for empty file', async () => {
    const path = tempFile('empty');
    await writeCsv(path, '');
    const domains = await importCsv(path);
    expect(domains).toHaveLength(0);
  });

  test('falls back to first column when no recognized header', async () => {
    const path = tempFile('unknown-col');
    await writeCsv(path, 'target\nexample.com\n');
    const domains = await importCsv(path);
    // "target" doesn't match domain/name/url/hostname but is also not a domain, so treated as header
    // either way, example.com should be present
    expect(domains).toContain('example.com');
  });

  test('filters out blank rows', async () => {
    const path = tempFile('blanks');
    await writeCsv(path, 'example.com\n\n\nmyapp.io\n');
    const domains = await importCsv(path);
    expect(domains).toHaveLength(2);
  });
});

describe('exportCsv', () => {
  const results = [
    makeAvailable('example.com', 12.99),
    makeTaken('owned.net'),
    makeResult('multi.io', {
      status: 'available',
      prices: [makePrice('godaddy', 25), makePrice('namecheap', 18.50)],
      whois: { registrar: 'Test Reg', email: 'admin@test.com', created: '2020-01-01' },
    }),
  ];

  test('creates a valid CSV file', async () => {
    const path = tempFile('export');
    await exportCsv(results, path);
    const content = await Bun.file(path).text();
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('domain');
    expect(content).toContain('status');
  });

  test('all domains appear in output', async () => {
    const path = tempFile('domains-present');
    await exportCsv(results, path);
    const content = await Bun.file(path).text();
    expect(content).toContain('example.com');
    expect(content).toContain('owned.net');
    expect(content).toContain('multi.io');
  });

  test('best_price column uses minimum price', async () => {
    const path = tempFile('best-price');
    await exportCsv(results, path);
    const content = await Bun.file(path).text();
    // multi.io has min price $18.50
    expect(content).toContain('18.50');
  });

  test('seo_score column is present', async () => {
    const path = tempFile('seo');
    await exportCsv(results, path);
    const content = await Bun.file(path).text();
    expect(content).toContain('seo_score');
  });

  test('whois fields empty string when undefined', async () => {
    const path = tempFile('whois-empty');
    await exportCsv([makeAvailable('example.com')], path);
    const content = await Bun.file(path).text();
    // Row should have empty registrar/registrant/email
    const lines = content.split('\n');
    const dataLine = lines.find(l => l.includes('example.com')) ?? '';
    // The registrar column should be empty (not undefined/null text)
    expect(dataLine).not.toContain('undefined');
    expect(dataLine).not.toContain('null');
  });

  test('whois data serialized when present', async () => {
    const path = tempFile('whois-data');
    const r = makeResult('owned.net', {
      status: 'taken',
      whois: { registrar: 'IANA', email: 'test@iana.org', created: '2000-01-01' },
    });
    await exportCsv([r], path);
    const content = await Bun.file(path).text();
    expect(content).toContain('IANA');
    expect(content).toContain('test@iana.org');
  });
});
