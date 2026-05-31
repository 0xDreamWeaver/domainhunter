import type { RegistrarPrice } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'porkbun';

const PORKBUN_PRICING_URL = 'https://porkbun.com/api/json/v3/pricing/get';

let porkbunPriceCache: Record<string, { registration: string }> | null = null;

async function loadPrices(): Promise<Record<string, { registration: string }>> {
  if (porkbunPriceCache) return porkbunPriceCache;

  try {
    const res = await fetch(PORKBUN_PRICING_URL, { method: 'POST', body: '{}' });
    if (!res.ok) {
      logger.warn({ checker: CHECKER, msg: `Pricing fetch failed — HTTP ${res.status}`, statusCode: res.status });
      return {};
    }
    const data = (await res.json()) as { pricing?: Record<string, { registration: string }> };
    porkbunPriceCache = data.pricing ?? {};
  } catch (err) {
    logger.warn({ checker: CHECKER, msg: 'Pricing fetch failed — network error', error: err instanceof Error ? err.message : String(err) });
    porkbunPriceCache = {};
  }

  return porkbunPriceCache;
}

export function resetPorkbunCache(): void {
  porkbunPriceCache = null;
}

export async function getPorkbunPrice(domain: string): Promise<RegistrarPrice | null> {
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  const tld = parts.slice(1).join('.');

  const prices = await loadPrices();
  const entry = prices[tld];
  if (!entry) return null;

  const price = parseFloat(entry.registration);
  if (isNaN(price)) return null;

  return {
    registrar: 'porkbun',
    price,
    currency: 'USD',
    purchaseUrl: `https://porkbun.com/checkout/registerDomain?q=${domain}`,
  };
}
