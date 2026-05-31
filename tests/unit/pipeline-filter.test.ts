import { describe, expect, test } from 'bun:test';
import { applyFilter } from '../../src/pipeline/index.js';
import { makeAvailable, makeTaken, makeResult, makePrice } from '../fixtures/check-results.js';
import type { FilterConfig } from '../../src/types.js';

const ALL: FilterConfig = { status: 'all', maxPrice: null, minSeo: null };

describe('applyFilter – status', () => {
  const results = [
    makeAvailable('a.com'),
    makeTaken('b.com'),
    makeResult('c.com', { status: 'unknown' }),
    makeResult('d.com', { status: 'error' }),
  ];

  test('status=all passes everything', () => {
    expect(applyFilter(results, ALL)).toHaveLength(4);
  });

  test('status=available keeps only available', () => {
    const filtered = applyFilter(results, { ...ALL, status: 'available' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.domain.name).toBe('a.com');
  });

  test('status=taken keeps only taken', () => {
    const filtered = applyFilter(results, { ...ALL, status: 'taken' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.domain.name).toBe('b.com');
  });
});

describe('applyFilter – maxPrice', () => {
  const cheap = makeResult('cheap.com', { status: 'available', prices: [makePrice('godaddy', 9.99)] });
  const pricey = makeResult('pricey.com', { status: 'available', prices: [makePrice('godaddy', 99.99)] });
  const noPrice = makeAvailable('noprice.com'); // no prices array

  test('maxPrice excludes results where all prices exceed threshold', () => {
    const filtered = applyFilter([cheap, pricey], { ...ALL, maxPrice: 20 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.domain.name).toBe('cheap.com');
  });

  test('maxPrice passes results with no prices', () => {
    const filtered = applyFilter([noPrice], { ...ALL, maxPrice: 10 });
    expect(filtered).toHaveLength(1);
  });

  test('maxPrice null passes all regardless of price', () => {
    expect(applyFilter([cheap, pricey], ALL)).toHaveLength(2);
  });

  test('maxPrice uses minimum price across registrars', () => {
    const multi = makeResult('multi.com', {
      status: 'available',
      prices: [makePrice('godaddy', 50), makePrice('namecheap', 12)],
    });
    const filtered = applyFilter([multi], { ...ALL, maxPrice: 20 });
    expect(filtered).toHaveLength(1);
  });
});

describe('applyFilter – minSeo', () => {
  const highSeo = makeResult('high.com', { seoScore: { total: 85, breakdown: {} as any, maxBreakdown: {} as any } });
  const lowSeo = makeResult('low.com', { seoScore: { total: 40, breakdown: {} as any, maxBreakdown: {} as any } });

  test('minSeo excludes results below threshold', () => {
    const filtered = applyFilter([highSeo, lowSeo], { ...ALL, minSeo: 60 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.domain.name).toBe('high.com');
  });

  test('minSeo=null passes all', () => {
    expect(applyFilter([highSeo, lowSeo], ALL)).toHaveLength(2);
  });

  test('minSeo exact boundary passes', () => {
    const filtered = applyFilter([highSeo, lowSeo], { ...ALL, minSeo: 85 });
    expect(filtered).toHaveLength(1);
  });
});

describe('applyFilter – combined', () => {
  test('status + maxPrice + minSeo all applied together', () => {
    const results = [
      makeResult('a.com', { status: 'available', prices: [makePrice('g', 10)], seoScore: { total: 75, breakdown: {} as any, maxBreakdown: {} as any } }),
      makeResult('b.com', { status: 'available', prices: [makePrice('g', 60)], seoScore: { total: 75, breakdown: {} as any, maxBreakdown: {} as any } }), // too expensive
      makeResult('c.com', { status: 'taken',     prices: [makePrice('g', 10)], seoScore: { total: 75, breakdown: {} as any, maxBreakdown: {} as any } }), // taken
      makeResult('d.com', { status: 'available', prices: [makePrice('g', 10)], seoScore: { total: 30, breakdown: {} as any, maxBreakdown: {} as any } }), // low seo
    ];
    const filtered = applyFilter(results, { status: 'available', maxPrice: 50, minSeo: 60 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.domain.name).toBe('a.com');
  });
});
