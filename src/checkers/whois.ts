import type { Domain, WhoisInfo } from '../types.js';
import * as logger from '../utils/logger.js';

const CHECKER = 'whois';

const WHOIS_SERVERS: Record<string, string> = {
  ac: 'whois.nic.ac', ae: 'whois.aeda.net.ae', af: 'whois.nic.af',
  ag: 'whois.nic.ag', ai: 'whois.nic.ai', am: 'whois.amnic.net',
  app: 'whois.nic.google', ar: 'whois.nic.ar', at: 'whois.nic.at',
  au: 'whois.auda.org.au', be: 'whois.dns.be', biz: 'whois.biz',
  br: 'whois.registro.br', ca: 'whois.cira.ca', cc: 'ccwhois.verisign-grs.com',
  ch: 'whois.nic.ch', cl: 'whois.nic.cl', co: 'whois.nic.co',
  com: 'whois.verisign-grs.com', cz: 'whois.nic.cz', de: 'whois.denic.de',
  dev: 'whois.nic.google', dk: 'whois.dk-hostmaster.dk', ee: 'whois.tld.ee',
  es: 'whois.nic.es', eu: 'whois.eu', fi: 'whois.fi',
  fm: 'whois.nic.fm', fr: 'whois.afnic.fr', gg: 'whois.gg',
  gl: 'whois.nic.gl', hr: 'whois.dns.hr', hu: 'whois.nic.hu',
  id: 'whois.pandi.or.id', ie: 'whois.iedr.ie', im: 'whois.nic.im',
  in: 'whois.registry.in', info: 'whois.afilias.net', io: 'whois.nic.io',
  ir: 'whois.nic.ir', is: 'whois.isnic.is', it: 'whois.nic.it',
  je: 'whois.je', jp: 'whois.jprs.jp', kr: 'whois.kr',
  la: 'whois.nic.la', li: 'whois.nic.li', lt: 'whois.domreg.lt',
  lu: 'whois.dns.lu', lv: 'whois.nic.lv', ly: 'whois.nic.ly',
  me: 'whois.nic.me', mk: 'whois.marnet.mk', mn: 'whois.nic.mn',
  mobi: 'whois.dotmobiregistry.net', ms: 'whois.nic.ms', mu: 'whois.nic.mu',
  mx: 'whois.mx', my: 'whois.mynic.my', name: 'whois.nic.name',
  net: 'whois.verisign-grs.com', nl: 'whois.sidn.nl', no: 'whois.norid.no',
  nu: 'whois.iis.nu', nz: 'whois.srs.net.nz', org: 'whois.pir.org',
  ph: 'whois.dot.ph', pl: 'whois.dns.pl', pt: 'whois.dns.pt',
  ro: 'whois.rotld.ro', rs: 'whois.rnids.rs', ru: 'whois.tcinet.ru',
  se: 'whois.iis.se', sg: 'whois.sgnic.sg', sh: 'whois.nic.sh',
  si: 'whois.arnes.si', sk: 'whois.sk-nic.sk', su: 'whois.tcinet.ru',
  sx: 'whois.sx', tc: 'whois.nic.tc', tel: 'whois.nic.tel',
  th: 'whois.thnic.co.th', tj: 'whois.nic.tj', tm: 'whois.nic.tm',
  to: 'whois.tonic.to', travel: 'whois.nic.travel', tv: 'whois.nic.tv',
  tw: 'whois.twnic.net.tw', ua: 'whois.ua', uk: 'whois.nic.uk',
  us: 'whois.nic.us', vc: 'whois2.afilias-grs.net', ws: 'whois.website.ws',
  xxx: 'whois.nic.xxx', za: 'whois.registry.net.za',
};

const NOT_FOUND_PATTERNS = [
  /no match for/i,
  /not found/i,
  /no entries found/i,
  /domain not found/i,
  /no data found/i,
  /this query returned 0 objects/i,
  /object does not exist/i,
  /status:\s*free/i,
  /is available for purchase/i,
  /no whois server/i,
  /^no matching record/im,
  /^%% this tld has no whois/im,
];

export async function tcpWhoisQuery(domain: string, server: string, timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let timer: ReturnType<typeof setTimeout>;

    Bun.connect({
      hostname: server,
      port: 43,
      socket: {
        open(socket) {
          timer = setTimeout(() => {
            socket.terminate();
            const err = new Error(`WHOIS timeout for ${server}`);
            logger.warn({ checker: CHECKER, msg: err.message });
            reject(err);
          }, timeoutMs);
          socket.write(`${domain}\r\n`);
        },
        data(_socket, data) {
          chunks.push(Buffer.from(data));
        },
        close() {
          clearTimeout(timer);
          resolve(Buffer.concat(chunks).toString('utf-8'));
        },
        end() {
          clearTimeout(timer);
          resolve(Buffer.concat(chunks).toString('utf-8'));
        },
        error(_socket, err) {
          clearTimeout(timer);
          reject(err);
        },
      },
    }).catch(reject);
  });
}

export async function getWhoisServer(tld: string): Promise<string | null> {
  const known = WHOIS_SERVERS[tld.toLowerCase()];
  if (known) return known;

  // Fallback: ask IANA
  try {
    const raw = await tcpWhoisQuery(tld, 'whois.iana.org', 5000);
    const match = raw.match(/^whois:\s+(.+)$/im);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

export function parseWhois(raw: string): WhoisInfo {
  const get = (patterns: RegExp[]): string | undefined => {
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match?.[1]?.trim()) return match[1].trim();
    }
    return undefined;
  };

  const getAll = (pattern: RegExp): string[] => {
    const results: string[] = [];
    for (const match of raw.matchAll(pattern)) {
      if (match[1]?.trim()) results.push(match[1].trim());
    }
    return results;
  };

  return {
    registrar: get([
      /^registrar:\s+(.+)$/im,
      /^registrar name:\s+(.+)$/im,
      /^\[registrar\]\s+(.+)$/im,
    ]),
    registrant: get([
      /^registrant(?:\s+organization)?:\s+(.+)$/im,
      /^registrant name:\s+(.+)$/im,
      /^org:\s+(.+)$/im,
    ]),
    email: get([
      /^registrant email:\s+(.+)$/im,
      /^tech email:\s+(.+)$/im,
      /^e-mail:\s+(.+)$/im,
    ]),
    created: get([
      /^creation date:\s+(.+)$/im,
      /^created:\s+(.+)$/im,
      /^registered:\s+(.+)$/im,
    ]),
    expires: get([
      /^(?:registry )?expir(?:y|ation) date:\s+(.+)$/im,
      /^paid-till:\s+(.+)$/im,
      /^expires:\s+(.+)$/im,
    ]),
    updated: get([
      /^updated date:\s+(.+)$/im,
      /^last updated:\s+(.+)$/im,
      /^changed:\s+(.+)$/im,
    ]),
    nameservers: getAll(/^(?:name server|nserver):\s+(.+)$/gim),
    status: getAll(/^domain status:\s+(.+)$/gim),
    raw,
  };
}

export async function checkWhois(domain: Domain): Promise<{ available: boolean; info?: WhoisInfo; error?: string }> {
  const tld = domain.tld.split('.').pop() ?? domain.tld;
  const server = await getWhoisServer(tld);

  if (!server) {
    logger.debug({ checker: CHECKER, domain: domain.name, msg: `No WHOIS server for .${tld} — likely covered by RDAP` });
    return { available: false, error: `No WHOIS server for .${tld}` };
  }

  try {
    const raw = await tcpWhoisQuery(domain.name, server);

    if (!raw.trim()) {
      return { available: false, error: 'Empty WHOIS response' };
    }

    const isAvailable = NOT_FOUND_PATTERNS.some(p => p.test(raw));

    if (isAvailable) {
      return { available: true };
    }

    return { available: false, info: parseWhois(raw) };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : String(err) };
  }
}
