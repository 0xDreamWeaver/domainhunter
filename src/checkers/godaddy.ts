import type { RegistrarPrice } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'godaddy';

export function isConfigured(): boolean {
  return !!(process.env['GODADDY_API_KEY'] && process.env['GODADDY_API_SECRET']);
}

export async function checkGodaddy(domain: string): Promise<{
  available: boolean;
  price: RegistrarPrice | null;
  error?: string;
}> {
  const API_KEY = process.env['GODADDY_API_KEY'];
  const API_SECRET = process.env['GODADDY_API_SECRET'];
  if (!API_KEY || !API_SECRET) {
    logger.debug({ checker: CHECKER, domain, msg: 'Not configured — GODADDY_API_KEY or GODADDY_API_SECRET missing' });
    return { available: false, price: null, error: 'Not configured' };
  }

  try {
    const res = await fetch(`https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}`, {
      headers: {
        Authorization: `sso-key ${API_KEY}:${API_SECRET}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const logFn = res.status >= 500 ? logger.error : logger.warn;
      logFn({ checker: CHECKER, domain, msg: `HTTP ${res.status}`, statusCode: res.status });
      return { available: false, price: null, error: `GoDaddy API ${res.status}` };
    }

    const data = await res.json() as {
      available: boolean;
      currency?: string;
      period?: number;
      price?: number;
      definitive?: boolean;
    };

    if (!data.available) {
      return { available: false, price: null };
    }

    const priceUsd = data.price != null ? data.price / 1_000_000 : null;

    return {
      available: true,
      price: {
        registrar: 'godaddy',
        price: priceUsd,
        currency: data.currency ?? 'USD',
        purchaseUrl: `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain, msg: 'Network error', error: msg });
    return { available: false, price: null, error: msg };
  }
}
