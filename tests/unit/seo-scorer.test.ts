import { describe, expect, test } from 'bun:test';
import { scoreDomain } from '../../src/seo/scorer.js';
import { makeDomain } from '../fixtures/domains.js';

describe('scoreDomain – length', () => {
  test('≤5 chars scores 20', () => {
    const r = scoreDomain(makeDomain('go.com', 'go', 'com'));
    expect(r.breakdown.length).toBe(20);
  });

  test('≤7 chars scores 17', () => {
    const r = scoreDomain(makeDomain('mysite.com', 'mysite', 'com'));
    expect(r.breakdown.length).toBe(17);
  });

  test('≤9 chars scores 14', () => {
    const r = scoreDomain(makeDomain('coolsite.com', 'coolsite', 'com'));
    expect(r.breakdown.length).toBe(14);
  });

  test('≤12 chars scores 10', () => {
    const r = scoreDomain(makeDomain('mygreatsite.com', 'mygreatsite', 'com'));
    expect(r.breakdown.length).toBe(10);
  });

  test('≤15 chars scores 5', () => {
    const r = scoreDomain(makeDomain('averylongname.com', 'averylongname', 'com'));
    expect(r.breakdown.length).toBe(5);
  });

  test('>15 chars scores 0', () => {
    const r = scoreDomain(makeDomain('averylongdomainname.com', 'averylongdomainname', 'com'));
    expect(r.breakdown.length).toBe(0);
  });
});

describe('scoreDomain – TLD', () => {
  test('.com scores 25', () => {
    expect(scoreDomain(makeDomain('test.com', 'test', 'com')).breakdown.tld).toBe(25);
  });

  test('.io scores 22', () => {
    expect(scoreDomain(makeDomain('test.io', 'test', 'io')).breakdown.tld).toBe(22);
  });

  test('.ai scores 22', () => {
    expect(scoreDomain(makeDomain('test.ai', 'test', 'ai')).breakdown.tld).toBe(22);
  });

  test('.net scores 18', () => {
    expect(scoreDomain(makeDomain('test.net', 'test', 'net')).breakdown.tld).toBe(18);
  });

  test('unknown TLD scores 3', () => {
    expect(scoreDomain(makeDomain('test.xyz', 'test', 'xyz')).breakdown.tld).toBe(3);
  });

  test('compound TLD uses last part', () => {
    // co.uk → uk → 12
    expect(scoreDomain(makeDomain('shop.co.uk', 'shop', 'co.uk')).breakdown.tld).toBe(12);
  });
});

describe('scoreDomain – hyphens and numbers', () => {
  test('clean name scores 15', () => {
    expect(scoreDomain(makeDomain('clean.com', 'clean', 'com')).breakdown.hyphenNumbers).toBe(15);
  });

  test('hyphenated name scores 5', () => {
    expect(scoreDomain(makeDomain('my-site.com', 'my-site', 'com')).breakdown.hyphenNumbers).toBe(5);
  });

  test('number in name scores 8', () => {
    expect(scoreDomain(makeDomain('shop123.com', 'shop123', 'com')).breakdown.hyphenNumbers).toBe(8);
  });

  test('hyphen AND number scores 0', () => {
    expect(scoreDomain(makeDomain('my-shop2.com', 'my-shop2', 'com')).breakdown.hyphenNumbers).toBe(0);
  });
});

describe('scoreDomain – pronounceability', () => {
  test('good vowel ratio scores high', () => {
    // "google" - good mix of vowels
    const r = scoreDomain(makeDomain('google.com', 'google', 'com'));
    expect(r.breakdown.pronounceability).toBeGreaterThanOrEqual(12);
  });

  test('all consonants scores low', () => {
    // "strngths" - no vowels
    const r = scoreDomain(makeDomain('strngths.com', 'strngths', 'com'));
    expect(r.breakdown.pronounceability).toBeLessThan(12);
  });

  test('consonant clusters penalize', () => {
    // "brstphln" - multiple consonant clusters
    const r = scoreDomain(makeDomain('brstphln.com', 'brstphln', 'com'));
    expect(r.breakdown.pronounceability).toBeLessThanOrEqual(8);
  });
});

describe('scoreDomain – brandability', () => {
  test('single word without hyphen gets base bonus', () => {
    const r = scoreDomain(makeDomain('brand.com', 'brand', 'com'));
    expect(r.breakdown.brandability).toBeGreaterThan(0);
  });

  test('brand suffix adds points', () => {
    const withSuffix = scoreDomain(makeDomain('codeify.com', 'codeify', 'com'));
    const without = scoreDomain(makeDomain('codeabc.com', 'codeabc', 'com'));
    expect(withSuffix.breakdown.brandability).toBeGreaterThan(without.breakdown.brandability);
  });

  test('hyphenated name loses single-word bonus', () => {
    const hyphen = scoreDomain(makeDomain('my-brand.com', 'my-brand', 'com'));
    const clean = scoreDomain(makeDomain('mybrand.com', 'mybrand', 'com'));
    expect(hyphen.breakdown.brandability).toBeLessThan(clean.breakdown.brandability);
  });
});

describe('scoreDomain – keywords', () => {
  test('no keywords returns 0', () => {
    const r = scoreDomain(makeDomain('shop.com', 'shop', 'com'), []);
    expect(r.breakdown.keywords).toBe(0);
  });

  test('full keyword match returns 20', () => {
    const r = scoreDomain(makeDomain('shop.com', 'shop', 'com'), ['shop']);
    expect(r.breakdown.keywords).toBe(20);
  });

  test('partial keyword match is proportional', () => {
    const r = scoreDomain(makeDomain('shop.com', 'shop', 'com'), ['shop', 'buy']);
    expect(r.breakdown.keywords).toBe(10);
  });

  test('keyword matching is case-insensitive', () => {
    const r = scoreDomain(makeDomain('SHOP.com', 'SHOP', 'com'), ['shop']);
    expect(r.breakdown.keywords).toBe(20);
  });
});

describe('scoreDomain – total', () => {
  test('total is capped at 100', () => {
    // Perfect domain: short, .com, clean, pronounceable, branded, keyword match
    const r = scoreDomain(makeDomain('hub.com', 'hub', 'com'), ['hub']);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  test('total is non-negative', () => {
    const r = scoreDomain(makeDomain('brstphln-2.xyz', 'brstphln-2', 'xyz'));
    expect(r.total).toBeGreaterThanOrEqual(0);
  });

  test('maxBreakdown reflects correct maximums', () => {
    const r = scoreDomain(makeDomain('test.com', 'test', 'com'));
    expect(r.maxBreakdown.length).toBe(20);
    expect(r.maxBreakdown.tld).toBe(25);
    expect(r.maxBreakdown.hyphenNumbers).toBe(15);
    expect(r.maxBreakdown.pronounceability).toBe(20);
    expect(r.maxBreakdown.brandability).toBe(20);
    expect(r.maxBreakdown.keywords).toBe(20);
  });
});
