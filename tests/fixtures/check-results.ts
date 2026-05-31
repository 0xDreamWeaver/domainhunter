import type { CheckResult, Domain, RegistrarPrice, SeoScore } from '../../src/types.js';
import { makeDomain } from './domains.js';

export function makeSeoScore(total = 70): SeoScore {
  return {
    total,
    breakdown: {
      length: 17,
      tld: 25,
      hyphenNumbers: 15,
      pronounceability: 16,
      brandability: 13,
      keywords: 0,
    },
    maxBreakdown: {
      length: 20,
      tld: 25,
      hyphenNumbers: 15,
      pronounceability: 20,
      brandability: 20,
      keywords: 20,
    },
  };
}

export function makePrice(registrar: string, price: number | null): RegistrarPrice {
  return {
    registrar,
    price,
    currency: 'USD',
    purchaseUrl: `https://${registrar}.com/domain`,
  };
}

export function makeResult(
  name: string,
  overrides: Partial<CheckResult> = {}
): CheckResult {
  const domain = makeDomain(name);
  return {
    domain,
    status: 'available',
    prices: [],
    seoScore: makeSeoScore(),
    checkedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeAvailable(name: string, price?: number): CheckResult {
  return makeResult(name, {
    status: 'available',
    prices: price != null ? [makePrice('godaddy', price)] : [],
  });
}

export function makeTaken(name: string): CheckResult {
  return makeResult(name, {
    status: 'taken',
    prices: [],
    whois: {
      registrar: 'Example Registrar, LLC',
      registrant: 'Acme Corp',
      email: 'admin@example.com',
      created: '2010-01-01T00:00:00Z',
      expires: '2025-01-01T00:00:00Z',
    },
  });
}
