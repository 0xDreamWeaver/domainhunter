import type { Domain, CheckResult, RegistrarPrice, AvailabilityStatus } from '../types.js';
import { checkRdap } from './rdap.js';
import { checkWhois } from './whois.js';
import { checkGodaddy } from './godaddy.js';
import { checkNamecheap } from './namecheap.js';
import { checkNamesilo } from './namesilo.js';
import { checkNamecom } from './namecom.js';
import { getPorkbunPrice } from './porkbun.js';
import { scoreDomain } from '../seo/scorer.js';

export interface CheckOptions {
  keywords?: string[];
  skipWhois?: boolean;
  skipPricing?: boolean;
}

export async function checkDomain(domain: Domain, options: CheckOptions = {}): Promise<CheckResult> {
  const prices: RegistrarPrice[] = [];
  let status: AvailabilityStatus = 'unknown';
  let whoisInfo = undefined;
  let error: string | undefined;

  try {
    if (!options.skipWhois) {
      // RDAP is the primary availability check (ICANN mandate since Jan 2025).
      // Falls back to TCP WHOIS for ccTLDs not in the RDAP bootstrap registry.
      const rdapResult = await checkRdap(domain);

      if (rdapResult !== null) {
        if (rdapResult.error && !rdapResult.info) {
          status = 'unknown';
          error = rdapResult.error;
        } else if (rdapResult.available) {
          status = 'available';
        } else {
          status = 'taken';
          whoisInfo = rdapResult.info;
        }
      } else {
        // TLD not in RDAP bootstrap — try legacy TCP WHOIS (ccTLD fallback)
        const whoisResult = await checkWhois(domain);

        if (whoisResult.error && !whoisResult.info) {
          status = 'unknown';
          error = whoisResult.error;
        } else if (whoisResult.available) {
          status = 'available';
        } else {
          status = 'taken';
          whoisInfo = whoisResult.info;
        }
      }
    }

    if (!options.skipPricing && (status === 'available' || options.skipWhois)) {
      const [godaddy, namecheap, namesilo, namecom, porkbun] = await Promise.allSettled([
        checkGodaddy(domain.name),
        checkNamecheap(domain.name),
        checkNamesilo(domain.name),
        checkNamecom(domain.name),
        getPorkbunPrice(domain.name),
      ]);

      for (const result of [godaddy, namecheap, namesilo, namecom]) {
        if (result.status === 'fulfilled' && result.value.price) {
          prices.push(result.value.price);
          if (result.value.available) status = 'available';
        }
      }

      // Porkbun is pricing-only — doesn't affect availability status
      if (porkbun.status === 'fulfilled' && porkbun.value) {
        prices.push(porkbun.value);
      }

      if (options.skipWhois) {
        const anyAvailable = [godaddy, namecheap, namesilo, namecom].some(
          r => r.status === 'fulfilled' && r.value.available
        );
        if (anyAvailable) status = 'available';
        else if (status === 'unknown') status = 'taken';
      }
    }
  } catch (err) {
    status = 'error';
    error = err instanceof Error ? err.message : String(err);
  }

  return {
    domain,
    status,
    prices,
    whois: whoisInfo,
    seoScore: scoreDomain(domain, options.keywords),
    checkedAt: new Date(),
    error,
  };
}

export function parseDomain(input: string): Domain {
  let name = input.trim().toLowerCase();
  name = name.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
  name = name.replace(/[/?#].*$/, '');

  const parts = name.split('.');
  if (parts.length < 2) {
    return { name, sld: name, tld: '' };
  }

  const sld = parts[0] ?? '';
  const tld = parts.slice(1).join('.');
  return { name, sld, tld };
}
