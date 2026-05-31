import { describe, expect, test } from 'bun:test';
import { applySort, getBestPrice } from '../../src/pipeline/index.js';
import { makeAvailable, makeResult, makePrice, makeSeoScore } from '../fixtures/check-results.js';
import type { SortConfig } from '../../src/types.js';

function sort(results: ReturnType<typeof makeResult>[], config: SortConfig) {
  return applySort(results, config);
}

describe('applySort – by name', () => {
  const results = [makeResult('zebra.com'), makeResult('alpha.com'), makeResult('mango.com')];

  test('asc', () => {
    const sorted = sort(results, { primary: { field: 'name', direction: 'asc' } });
    expect(sorted.map(r => r.domain.name)).toEqual(['alpha.com', 'mango.com', 'zebra.com']);
  });

  test('desc', () => {
    const sorted = sort(results, { primary: { field: 'name', direction: 'desc' } });
    expect(sorted.map(r => r.domain.name)).toEqual(['zebra.com', 'mango.com', 'alpha.com']);
  });
});

describe('applySort – by status', () => {
  const results = [
    makeResult('a.com', { status: 'taken' }),
    makeResult('b.com', { status: 'available' }),
    makeResult('c.com', { status: 'unknown' }),
  ];

  test('asc alphabetizes status strings', () => {
    const sorted = sort(results, { primary: { field: 'status', direction: 'asc' } });
    const statuses = sorted.map(r => r.status);
    expect(statuses).toEqual([...statuses].sort());
  });

  test('desc reverses status order', () => {
    const asc = sort(results, { primary: { field: 'status', direction: 'asc' } });
    const desc = sort(results, { primary: { field: 'status', direction: 'desc' } });
    expect(desc.map(r => r.status)).toEqual(asc.map(r => r.status).reverse());
  });
});

describe('applySort – by price', () => {
  const cheap = makeResult('cheap.com', { prices: [makePrice('g', 5)] });
  const mid = makeResult('mid.com', { prices: [makePrice('g', 20)] });
  const noprice = makeResult('noprice.com', { prices: [] });

  test('asc: cheapest first, no-price last', () => {
    const sorted = sort([mid, noprice, cheap], { primary: { field: 'price', direction: 'asc' } });
    expect(sorted.map(r => r.domain.name)).toEqual(['cheap.com', 'mid.com', 'noprice.com']);
  });

  test('desc: most expensive first, no-price still last', () => {
    const sorted = sort([cheap, noprice, mid], { primary: { field: 'price', direction: 'desc' } });
    expect(sorted[0]!.domain.name).toBe('mid.com');   // 20 > 5
    expect(sorted[1]!.domain.name).toBe('cheap.com'); // 5
    expect(sorted[2]!.domain.name).toBe('noprice.com'); // always last
  });

  test('uses minimum price when multiple registrars', () => {
    const multi = makeResult('multi.com', { prices: [makePrice('g', 50), makePrice('n', 8)] });
    const sorted = sort([mid, multi], { primary: { field: 'price', direction: 'asc' } });
    expect(sorted[0]!.domain.name).toBe('multi.com'); // min 8 < 20
  });
});

// SEO sort is intentionally inverted: 'asc' = highest-SEO first (best domains first),
// 'desc' = lowest-SEO first. This matches the app default (seo asc = show best domains).
describe('applySort – by seo', () => {
  const high = makeResult('high.com', { seoScore: makeSeoScore(90) });
  const low = makeResult('low.com', { seoScore: makeSeoScore(30) });
  const mid = makeResult('mid.com', { seoScore: makeSeoScore(60) });

  test('asc: highest SEO first (best-first default)', () => {
    const sorted = sort([low, high, mid], { primary: { field: 'seo', direction: 'asc' } });
    expect(sorted.map(r => r.domain.name)).toEqual(['high.com', 'mid.com', 'low.com']);
  });

  test('desc: lowest SEO first', () => {
    const sorted = sort([high, low, mid], { primary: { field: 'seo', direction: 'desc' } });
    expect(sorted[0]!.domain.name).toBe('low.com');
  });
});

describe('applySort – primary + secondary', () => {
  test('secondary sort breaks ties in primary', () => {
    const a = makeResult('alpha.com', { status: 'available', seoScore: makeSeoScore(80) });
    const b = makeResult('beta.com', { status: 'available', seoScore: makeSeoScore(50) });
    const c = makeResult('gamma.com', { status: 'taken', seoScore: makeSeoScore(90) });

    const sorted = sort([c, b, a], {
      primary: { field: 'status', direction: 'asc' },
      secondary: { field: 'seo', direction: 'asc' },
    });

    // 'available' < 'taken' → a and b first, c last
    expect(sorted[2]!.domain.name).toBe('gamma.com');
    // Among available: seo asc = highest-first → alpha(80) before beta(50)
    expect(sorted[0]!.domain.name).toBe('alpha.com');
    expect(sorted[1]!.domain.name).toBe('beta.com');
  });
});

describe('applySort – does not mutate original', () => {
  test('returns a new array', () => {
    const results = [makeResult('b.com'), makeResult('a.com')];
    const sorted = applySort(results, { primary: { field: 'name', direction: 'asc' } });
    expect(sorted).not.toBe(results);
    expect(results[0]!.domain.name).toBe('b.com'); // original unchanged
  });
});

describe('getBestPrice', () => {
  test('no prices returns em-dash', () => {
    expect(getBestPrice(makeResult('x.com', { prices: [] }))).toBe('—');
  });

  test('single price formatted correctly', () => {
    expect(getBestPrice(makeResult('x.com', { prices: [makePrice('g', 12.5)] }))).toBe('$12.50');
  });

  test('multiple prices returns minimum', () => {
    const result = makeResult('x.com', {
      prices: [makePrice('g', 19.99), makePrice('n', 8.88), makePrice('d', 14)],
    });
    expect(getBestPrice(result)).toBe('$8.88');
  });

  test('null price entries are ignored', () => {
    const result = makeResult('x.com', { prices: [makePrice('g', null)] });
    expect(getBestPrice(result)).toBe('—');
  });
});
