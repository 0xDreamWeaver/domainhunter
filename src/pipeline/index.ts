import type { CheckResult, FilterConfig, SortConfig, PipelineOptions, PipelineEventHandler } from '../types.js';
import { checkDomain, parseDomain } from '../checkers/index.js';

class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

export async function processDomains(
  inputs: string[],
  options: PipelineOptions = {},
  onEvent: PipelineEventHandler = () => {}
): Promise<CheckResult[]> {
  const concurrency = options.concurrency ?? 5;
  const sem = new Semaphore(concurrency);

  const domains = inputs
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseDomain);

  onEvent({ type: 'start', total: domains.length });

  let done = 0;
  const results: CheckResult[] = [];

  await Promise.all(
    domains.map(async domain => {
      await sem.acquire();
      try {
        onEvent({ type: 'progress', domain: domain.name, done, total: domains.length });

        const result = await checkDomain(domain, {
          keywords: options.keywords,
          skipWhois: options.skipWhois,
          skipPricing: options.skipPricing,
        });

        results.push(result);
        done++;
        onEvent({ type: 'result', result });
        onEvent({ type: 'progress', domain: domain.name, done, total: domains.length });
      } catch (err) {
        done++;
        onEvent({
          type: 'error',
          domain: domain.name,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        sem.release();
      }
    })
  );

  onEvent({ type: 'complete', results });
  return results;
}

export function applyFilter(results: CheckResult[], config: FilterConfig): CheckResult[] {
  return results.filter(r => {
    if (config.status === 'available' && r.status !== 'available') return false;
    if (config.status === 'taken' && r.status !== 'taken') return false;

    if (config.maxPrice != null) {
      const prices = r.prices.filter(p => p.price != null);
      if (prices.length > 0) {
        const min = Math.min(...prices.map(p => p.price!));
        if (min > config.maxPrice) return false;
      }
    }

    if (config.minSeo != null && r.seoScore.total < config.minSeo) return false;

    return true;
  });
}

export function applySort(results: CheckResult[], config: SortConfig): CheckResult[] {
  const compare = (a: CheckResult, b: CheckResult, field: string, dir: string): number => {
    let diff = 0;
    switch (field) {
      case 'name':
        diff = a.domain.name.localeCompare(b.domain.name);
        break;
      case 'status':
        diff = a.status.localeCompare(b.status);
        break;
      case 'price': {
        const aMin = bestPriceValue(a);
        const bMin = bestPriceValue(b);
        if (aMin == null && bMin == null) return 0;
        if (aMin == null) return 1;  // no price always sorts last
        if (bMin == null) return -1;
        diff = aMin - bMin;
        break;
      }
      case 'seo':
        diff = b.seoScore.total - a.seoScore.total;
        break;
    }
    return dir === 'asc' ? diff : -diff;
  };

  return [...results].sort((a, b) => {
    const primary = compare(a, b, config.primary.field, config.primary.direction);
    if (primary !== 0 || !config.secondary) return primary;
    return compare(a, b, config.secondary.field, config.secondary.direction);
  });
}

function bestPriceValue(r: CheckResult): number | null {
  const prices = r.prices.filter(p => p.price != null);
  if (!prices.length) return null;
  return Math.min(...prices.map(p => p.price!));
}

export function getBestPrice(r: CheckResult): string {
  const val = bestPriceValue(r);
  return val != null ? `$${val.toFixed(2)}` : '—';
}
