import type { RegistrarPrice } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'namesilo';

export function isConfigured(): boolean {
  return !!process.env['NAMESILO_API_KEY'];
}

interface NamesiloAvailableDomain {
  domain: string;
  price: number;
}

interface NamesiloResponse {
  reply?: {
    available?: {
      domain?: NamesiloAvailableDomain | NamesiloAvailableDomain[];
    };
  };
}

export async function checkNamesilo(domain: string): Promise<{
  available: boolean;
  price: RegistrarPrice | null;
  error?: string;
}> {
  const API_KEY = process.env['NAMESILO_API_KEY'];
  if (!API_KEY) {
    logger.debug({ checker: CHECKER, domain, msg: 'Not configured — NAMESILO_API_KEY missing' });
    return { available: false, price: null, error: 'Not configured: NAMESILO_API_KEY not set' };
  }

  const url = `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=json&key=${API_KEY}&domains=${domain}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const logFn = res.status >= 500 ? logger.error : logger.warn;
      logFn({ checker: CHECKER, domain, msg: `HTTP ${res.status}`, statusCode: res.status });
      return { available: false, price: null, error: `Namesilo API error: ${res.status}` };
    }

    const data = (await res.json()) as NamesiloResponse;
    const available = data.reply?.available;

    if (!available || !available.domain) {
      return { available: false, price: null };
    }

    // API returns a single object when one domain, array for multiple
    const domains = Array.isArray(available.domain)
      ? available.domain
      : [available.domain];

    const match = domains.find(d => d.domain.toLowerCase() === domain.toLowerCase());
    if (!match) {
      return { available: false, price: null };
    }

    return {
      available: true,
      price: {
        registrar: 'namesilo',
        price: match.price,
        currency: 'USD',
        purchaseUrl: `https://www.namesilo.com/domain/search-domains?query=${domain}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain, msg: 'Network error', error: msg });
    return { available: false, price: null, error: msg };
  }
}
