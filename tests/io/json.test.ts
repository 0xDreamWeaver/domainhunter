import { describe, expect, test, afterEach } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync } from 'node:fs';
import { exportJson } from '../../src/io/json.js';
import { makeAvailable, makeTaken, makeResult, makePrice } from '../fixtures/check-results.js';

const created: string[] = [];
function tempFile() {
  const p = join(tmpdir(), `dh-json-test-${Date.now()}.json`);
  created.push(p);
  return p;
}

afterEach(() => {
  for (const f of created.splice(0)) {
    try { unlinkSync(f); } catch {}
  }
});

describe('exportJson', () => {
  test('produces valid JSON', async () => {
    const path = tempFile();
    await exportJson([makeAvailable('example.com')], path);
    const content = await Bun.file(path).text();
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('output is an array', async () => {
    const path = tempFile();
    await exportJson([makeAvailable('a.com'), makeAvailable('b.com')], path);
    const data = JSON.parse(await Bun.file(path).text());
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  test('each entry has expected top-level fields', async () => {
    const path = tempFile();
    await exportJson([makeAvailable('example.com', 9.99)], path);
    const [entry] = JSON.parse(await Bun.file(path).text());
    expect(entry).toHaveProperty('domain');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('seoScore');
    expect(entry).toHaveProperty('checkedAt');
    expect(entry).toHaveProperty('prices');
  });

  test('Date serialized as ISO string', async () => {
    const path = tempFile();
    const r = makeResult('example.com', { checkedAt: new Date('2024-06-01T12:00:00Z') });
    await exportJson([r], path);
    const [entry] = JSON.parse(await Bun.file(path).text());
    expect(typeof entry.checkedAt).toBe('string');
    expect(entry.checkedAt).toContain('2024-06-01');
  });

  test('prices array contains registrar info', async () => {
    const path = tempFile();
    const r = makeResult('example.com', {
      prices: [makePrice('godaddy', 12.99), makePrice('namecheap', 9.99)],
    });
    await exportJson([r], path);
    const [entry] = JSON.parse(await Bun.file(path).text());
    const registrars = entry.prices.map((p: any) => p.registrar);
    expect(registrars).toContain('godaddy');
    expect(registrars).toContain('namecheap');
  });

  test('whois field present for taken domains', async () => {
    const path = tempFile();
    await exportJson([makeTaken('owned.com')], path);
    const [entry] = JSON.parse(await Bun.file(path).text());
    expect(entry.whois).toBeDefined();
    expect(entry.whois.registrar).toBe('Example Registrar, LLC');
  });

  test('exports empty array without error', async () => {
    const path = tempFile();
    await exportJson([], path);
    const data = JSON.parse(await Bun.file(path).text());
    expect(data).toHaveLength(0);
  });
});
