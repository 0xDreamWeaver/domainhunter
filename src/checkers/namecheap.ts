import type { RegistrarPrice } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'namecheap';

export function isConfigured(): boolean {
  return !!(
    process.env['NAMECHEAP_API_KEY'] &&
    process.env['NAMECHEAP_USERNAME'] &&
    process.env['NAMECHEAP_CLIENT_IP']
  );
}

function extractXmlAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  return xml.match(re)?.[1] ?? null;
}

export async function checkNamecheap(domain: string): Promise<{
  available: boolean;
  price: RegistrarPrice | null;
  error?: string;
}> {
  const API_KEY = process.env['NAMECHEAP_API_KEY'];
  const USERNAME = process.env['NAMECHEAP_USERNAME'];
  const CLIENT_IP = process.env['NAMECHEAP_CLIENT_IP'];
  if (!API_KEY || !USERNAME || !CLIENT_IP) {
    logger.debug({ checker: CHECKER, domain, msg: 'Not configured — NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, or NAMECHEAP_CLIENT_IP missing' });
    return { available: false, price: null, error: 'Not configured' };
  }

  try {
    const params = new URLSearchParams({
      ApiUser: USERNAME,
      ApiKey: API_KEY,
      UserName: USERNAME,
      ClientIp: CLIENT_IP,
      Command: 'namecheap.domains.check',
      DomainList: domain,
    });

    const res = await fetch(`https://api.namecheap.com/xml.response?${params}`, {
      headers: { Accept: 'text/xml' },
    });

    if (!res.ok) {
      const logFn = res.status >= 500 ? logger.error : logger.warn;
      logFn({ checker: CHECKER, domain, msg: `HTTP ${res.status}`, statusCode: res.status });
      return { available: false, price: null, error: `Namecheap API ${res.status}` };
    }

    const xml = await res.text();

    if (xml.includes('Status="ERROR"') || xml.includes('ErrCount>0')) {
      const errMatch = xml.match(/<Error Number="\d+">([^<]+)<\/Error>/);
      const errMsg = errMatch?.[1] ?? 'Namecheap API error';
      logger.warn({ checker: CHECKER, domain, msg: errMsg });
      return { available: false, price: null, error: errMsg };
    }

    const available = extractXmlAttr(xml, 'DomainCheckResult', 'Available');
    if (available?.toLowerCase() !== 'true') {
      return { available: false, price: null };
    }

    const isPremium = extractXmlAttr(xml, 'DomainCheckResult', 'IsPremiumName') === 'true';
    const premiumPrice = extractXmlAttr(xml, 'DomainCheckResult', 'PremiumRegistrationPrice');

    // Regular pricing requires a separate API call; for now return null for regular domains
    const price = isPremium && premiumPrice ? parseFloat(premiumPrice) : null;

    return {
      available: true,
      price: {
        registrar: 'namecheap',
        price,
        currency: 'USD',
        purchaseUrl: `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain, msg: 'Network error', error: msg });
    return { available: false, price: null, error: msg };
  }
}
