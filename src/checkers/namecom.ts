import type { RegistrarPrice } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'namecom';

export function isConfigured(): boolean {
  return !!(process.env['NAMECOM_USERNAME'] && process.env['NAMECOM_TOKEN']);
}

interface NamecomResult {
  domainName: string;
  purchasable: boolean;
  purchasePrice?: number;
  purchaseType?: string;
}

interface NamecomResponse {
  results?: NamecomResult[];
}

export async function checkNamecom(domain: string): Promise<{
  available: boolean;
  price: RegistrarPrice | null;
  error?: string;
}> {
  const USERNAME = process.env['NAMECOM_USERNAME'];
  const TOKEN = process.env['NAMECOM_TOKEN'];

  if (!USERNAME || !TOKEN) {
    logger.debug({ checker: CHECKER, domain, msg: 'Not configured — NAMECOM_USERNAME or NAMECOM_TOKEN missing' });
    return { available: false, price: null, error: 'Not configured: NAMECOM_USERNAME or NAMECOM_TOKEN not set' };
  }

  // Standard base64 — do NOT URL-encode the colon
  const credentials = btoa(`${USERNAME}:${TOKEN}`);

  try {
    const res = await fetch('https://api.name.com/v4/domains:checkAvailability', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domainNames: [domain] }),
    });

    if (!res.ok) {
      const logFn = res.status >= 500 ? logger.error : logger.warn;
      logFn({ checker: CHECKER, domain, msg: `HTTP ${res.status}`, statusCode: res.status });
      return { available: false, price: null, error: `Name.com API error: ${res.status}` };
    }

    const data = (await res.json()) as NamecomResponse;
    const match = data.results?.find(
      r => r.domainName.toLowerCase() === domain.toLowerCase()
    );

    if (!match) {
      return { available: false, price: null, error: 'Domain not in response' };
    }

    if (!match.purchasable) {
      return { available: false, price: null };
    }

    return {
      available: true,
      price: match.purchasePrice != null
        ? {
            registrar: 'namecom',
            price: match.purchasePrice,
            currency: 'USD',
            purchaseUrl: `https://www.name.com/domain/search/${domain}`,
          }
        : null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain, msg: 'Network error', error: msg });
    return { available: false, price: null, error: msg };
  }
}
