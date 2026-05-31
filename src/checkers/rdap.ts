import type { Domain, WhoisInfo } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'rdap';

const IANA_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

let bootstrapCache: Map<string, string> | null = null;

// Per-hostname rate limiter: chains each request so only one fires per hostname per second.
const rateLimiters = new Map<string, Promise<void>>();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rateLimit(hostname: string): Promise<void> {
  const prev = rateLimiters.get(hostname) ?? Promise.resolve();
  const next = prev.then(() => delay(1000));
  rateLimiters.set(hostname, next);
  return prev;
}

export async function loadBootstrap(): Promise<Map<string, string>> {
  if (bootstrapCache) return bootstrapCache;

  const res = await fetch(IANA_BOOTSTRAP_URL);
  if (!res.ok) {
    const msg = `IANA bootstrap fetch failed: ${res.status}`;
    logger.error({ checker: CHECKER, msg, statusCode: res.status });
    throw new Error(msg);
  }

  const data = (await res.json()) as {
    services: [string[], string[]][];
  };

  const map = new Map<string, string>();
  for (const [tlds, urls] of data.services) {
    const baseUrl = urls[0];
    if (!baseUrl) continue;
    for (const tld of tlds) {
      map.set(tld.toLowerCase(), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    }
  }

  bootstrapCache = map;
  return map;
}

export function resetBootstrapCache(): void {
  bootstrapCache = null;
  rateLimiters.clear();
}

interface RdapJson {
  ldhName?: string;
  status?: string[];
  events?: { eventAction: string; eventDate: string }[];
  nameservers?: { ldhName: string }[];
  entities?: {
    roles: string[];
    vcardArray?: [string, [string, Record<string, string>, string, string][]]
  }[];
}

function extractVcardFn(entity: RdapJson['entities'] extends (infer T)[] ? T : never): string | undefined {
  if (!entity || !('vcardArray' in entity) || !entity.vcardArray) return undefined;
  const props = entity.vcardArray[1];
  if (!Array.isArray(props)) return undefined;
  const fn = props.find(p => p[0] === 'fn');
  return fn?.[3] || undefined;
}

export function parseRdap(json: RdapJson): WhoisInfo {
  const event = (action: string) =>
    json.events?.find(e => e.eventAction === action)?.eventDate;

  const registrarEntity = json.entities?.find(e => e.roles?.includes('registrar'));
  const registrantEntity = json.entities?.find(e => e.roles?.includes('registrant'));

  return {
    registrar: registrarEntity ? extractVcardFn(registrarEntity) : undefined,
    registrant: registrantEntity ? extractVcardFn(registrantEntity) : undefined,
    created: event('registration'),
    expires: event('expiration'),
    updated: event('last changed'),
    nameservers: json.nameservers?.map(ns => ns.ldhName).filter(Boolean) ?? [],
    status: json.status ?? [],
  };
}

export async function checkRdap(domain: Domain): Promise<{
  available: boolean;
  info?: WhoisInfo;
  error?: string;
} | null> {
  let bootstrap: Map<string, string>;
  try {
    bootstrap = await loadBootstrap();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain: domain.name, msg: 'Bootstrap unavailable', error: msg });
    return { available: false, error: msg };
  }

  const tld = domain.tld.toLowerCase();
  const baseUrl = bootstrap.get(tld);
  if (!baseUrl) return null; // TLD not in RDAP bootstrap — caller falls back to WHOIS

  const url = `${baseUrl}domain/${domain.name}`;
  const hostname = new URL(baseUrl).hostname;

  const doRequest = async (): Promise<Response> => {
    await rateLimit(hostname);
    return fetch(url, { headers: { Accept: 'application/rdap+json' } });
  };

  try {
    let res = await doRequest();

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
      logger.warn({ checker: CHECKER, domain: domain.name, msg: `Rate limited by ${hostname}, retrying after ${waitMs}ms`, attempt: 1 });
      await delay(waitMs);
      res = await doRequest();
    }

    if (res.status === 404) {
      return { available: true };
    }

    if (res.status === 200) {
      const json = (await res.json()) as RdapJson;
      return { available: false, info: parseRdap(json) };
    }

    const logFn = res.status >= 500 ? logger.error : logger.warn;
    logFn({ checker: CHECKER, domain: domain.name, msg: `HTTP ${res.status}`, statusCode: res.status });
    return { available: false, error: `RDAP ${res.status} for ${domain.name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ checker: CHECKER, domain: domain.name, msg: 'Network error', error: msg });
    return { available: false, error: msg };
  }
}
