import { describe, expect, test, mock } from 'bun:test';
import type { CheckResult, PipelineEvent } from '../../src/types.js';
import { makeAvailable, makeTaken, makeResult } from '../fixtures/check-results.js';

// Mock the checkers module so the pipeline doesn't hit real APIs
mock.module('../../src/checkers/index.js', () => {
  return {
    parseDomain: (input: string) => {
      const parts = input.trim().toLowerCase().split('.');
      return { name: input.trim().toLowerCase(), sld: parts[0] ?? '', tld: parts.slice(1).join('.') };
    },
    checkDomain: async (domain: { name: string }) => {
      if (domain.name.includes('taken')) return makeTaken(domain.name);
      if (domain.name.includes('error')) throw new Error(`Mock error for ${domain.name}`);
      return makeAvailable(domain.name, 9.99);
    },
  };
});

// Import pipeline after mocking its dependency
const { processDomains } = await import('../../src/pipeline/index.js');

describe('processDomains – basic', () => {
  test('returns results for all domains', async () => {
    const results = await processDomains(['alpha.com', 'beta.io', 'gamma.net']);
    expect(results).toHaveLength(3);
    const names = results.map(r => r.domain.name);
    expect(names).toContain('alpha.com');
    expect(names).toContain('beta.io');
    expect(names).toContain('gamma.net');
  });

  test('available domains marked available', async () => {
    const results = await processDomains(['fresh.com', 'brand.io']);
    for (const r of results) {
      expect(r.status).toBe('available');
    }
  });

  test('domains with "taken" in name are marked taken', async () => {
    const results = await processDomains(['taken.com']);
    expect(results[0]!.status).toBe('taken');
  });

  test('mix of available and taken', async () => {
    const results = await processDomains(['good.com', 'taken.net', 'new.io']);
    const statuses = results.map(r => r.status);
    expect(statuses).toContain('available');
    expect(statuses).toContain('taken');
  });

  test('empty input returns empty array', async () => {
    const results = await processDomains([]);
    expect(results).toHaveLength(0);
  });
});

describe('processDomains – error handling', () => {
  test('error in one domain does not abort others', async () => {
    const results = await processDomains(['good.com', 'error.com', 'fine.io']);
    // The non-erroring domains still complete
    const names = results.map(r => r.domain.name);
    expect(names).toContain('good.com');
    expect(names).toContain('fine.io');
  });

  test('filters out blank/whitespace-only entries', async () => {
    const results = await processDomains(['good.com', '  ', '', 'fine.io']);
    expect(results).toHaveLength(2);
  });
});

describe('processDomains – event stream', () => {
  test('emits start event with correct total', async () => {
    const events: PipelineEvent[] = [];
    await processDomains(['a.com', 'b.io', 'c.net'], {}, e => events.push(e));
    const start = events.find(e => e.type === 'start');
    expect(start).toBeDefined();
    expect((start as any).total).toBe(3);
  });

  test('emits complete event last', async () => {
    const events: PipelineEvent[] = [];
    await processDomains(['a.com', 'b.io'], {}, e => events.push(e));
    const last = events[events.length - 1];
    expect(last?.type).toBe('complete');
  });

  test('complete event results array matches return value', async () => {
    const events: PipelineEvent[] = [];
    const returned = await processDomains(['a.com', 'b.io'], {}, e => events.push(e));
    const complete = events.find(e => e.type === 'complete') as Extract<PipelineEvent, { type: 'complete' }>;
    expect(complete).toBeDefined();
    expect(complete.results).toHaveLength(returned.length);
  });

  test('emits result event for each completed domain', async () => {
    const events: PipelineEvent[] = [];
    await processDomains(['a.com', 'b.io', 'c.net'], {}, e => events.push(e));
    const resultEvents = events.filter(e => e.type === 'result');
    expect(resultEvents).toHaveLength(3);
  });

  test('emits progress events', async () => {
    const events: PipelineEvent[] = [];
    await processDomains(['a.com', 'b.io'], {}, e => events.push(e));
    const progressEvents = events.filter(e => e.type === 'progress');
    expect(progressEvents.length).toBeGreaterThan(0);
  });
});

describe('processDomains – concurrency', () => {
  test('respects concurrency=1 (sequential)', async () => {
    const order: string[] = [];
    const domains = ['first.com', 'second.io', 'third.net'];

    // Track which domains were processed
    await processDomains(domains, { concurrency: 1 }, event => {
      if (event.type === 'result') order.push(event.result.domain.name);
    });

    expect(order).toHaveLength(3);
  });

  test('processes all domains with concurrency=2', async () => {
    const domains = Array.from({ length: 6 }, (_, i) => `domain${i}.com`);
    const results = await processDomains(domains, { concurrency: 2 });
    expect(results).toHaveLength(6);
  });
});
