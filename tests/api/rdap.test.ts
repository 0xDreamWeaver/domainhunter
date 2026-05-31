import { describe, expect, test, spyOn, beforeEach } from 'bun:test';
import type { Domain } from '../../src/types.js';

const BOOTSTRAP_JSON = {
  services: [
    [['com', 'net'], ['https://rdap.verisign.com/com/v1/']],
    [['org'], ['https://rdap.publicinterestregistry.org/rdap/']],
    [['io'], ['https://rdap.nic.io/']],
  ],
};

const REGISTERED_RDAP = {
  ldhName: 'EXAMPLE.COM',
  status: ['client delete prohibited', 'client transfer prohibited'],
  events: [
    { eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' },
    { eventAction: 'expiration', eventDate: '2026-08-13T04:00:00Z' },
    { eventAction: 'last changed', eventDate: '2024-08-14T07:01:34Z' },
  ],
  nameservers: [{ ldhName: 'A.IANA-SERVERS.NET' }, { ldhName: 'B.IANA-SERVERS.NET' }],
  entities: [
    {
      roles: ['registrar'],
      vcardArray: ['vcard', [['fn', {}, 'text', 'ICANN Test Registrar']]],
    },
    {
      roles: ['registrant'],
      vcardArray: ['vcard', [['fn', {}, 'text', 'Internet Assigned Numbers Authority']]],
    },
  ],
};

function mockFetch(...responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  return spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const r = responses[i++] ?? responses[responses.length - 1]!;
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
}

function makeDomain(name: string): Domain {
  const parts = name.split('.');
  return { name, sld: parts[0] ?? '', tld: parts.slice(1).join('.') };
}

describe('loadBootstrap', () => {
  beforeEach(async () => {
    const { resetBootstrapCache } = await import('../../src/checkers/rdap.js');
    resetBootstrapCache();
  });

  test('parses IANA JSON into tld→baseUrl map', async () => {
    const spy = mockFetch({ status: 200, body: BOOTSTRAP_JSON });
    const { loadBootstrap } = await import('../../src/checkers/rdap.js');
    const map = await loadBootstrap();
    expect(map.get('com')).toBe('https://rdap.verisign.com/com/v1/');
    expect(map.get('net')).toBe('https://rdap.verisign.com/com/v1/');
    expect(map.get('org')).toBe('https://rdap.publicinterestregistry.org/rdap/');
    spy.mockRestore();
  });

  test('returns same cached map on second call', async () => {
    const spy = mockFetch({ status: 200, body: BOOTSTRAP_JSON });
    const { loadBootstrap } = await import('../../src/checkers/rdap.js');
    const a = await loadBootstrap();
    const b = await loadBootstrap();
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('throws on non-200 bootstrap response', async () => {
    const spy = mockFetch({ status: 503, body: {} });
    const { loadBootstrap } = await import('../../src/checkers/rdap.js');
    await expect(loadBootstrap()).rejects.toThrow('503');
    spy.mockRestore();
  });
});

describe('parseRdap', () => {
  test('extracts all fields from RFC 9083 response', async () => {
    const { parseRdap } = await import('../../src/checkers/rdap.js');
    const info = parseRdap(REGISTERED_RDAP);
    expect(info.created).toBe('1995-08-14T04:00:00Z');
    expect(info.expires).toBe('2026-08-13T04:00:00Z');
    expect(info.updated).toBe('2024-08-14T07:01:34Z');
    expect(info.registrar).toBe('ICANN Test Registrar');
    expect(info.registrant).toBe('Internet Assigned Numbers Authority');
    expect(info.nameservers).toEqual(['A.IANA-SERVERS.NET', 'B.IANA-SERVERS.NET']);
    expect(info.status).toContain('client delete prohibited');
  });

  test('handles missing optional fields gracefully', async () => {
    const { parseRdap } = await import('../../src/checkers/rdap.js');
    const info = parseRdap({});
    expect(info.registrar).toBeUndefined();
    expect(info.created).toBeUndefined();
    expect(info.nameservers).toEqual([]);
    expect(info.status).toEqual([]);
  });
});

describe('checkRdap', () => {
  beforeEach(async () => {
    const { resetBootstrapCache } = await import('../../src/checkers/rdap.js');
    resetBootstrapCache();
  });

  test('returns null for TLD not in bootstrap', async () => {
    const spy = mockFetch({ status: 200, body: BOOTSTRAP_JSON });
    const { checkRdap } = await import('../../src/checkers/rdap.js');
    const result = await checkRdap(makeDomain('example.xyz'));
    expect(result).toBeNull();
    spy.mockRestore();
  });

  test('404 → available: true', async () => {
    const spy = mockFetch(
      { status: 200, body: BOOTSTRAP_JSON },
      { status: 404, body: { errorCode: 404, title: 'Not Found' } }
    );
    const { checkRdap } = await import('../../src/checkers/rdap.js');
    const result = await checkRdap(makeDomain('available-domain-xyz123.com'));
    expect(result?.available).toBe(true);
    spy.mockRestore();
  });

  test('200 → available: false with parsed WhoisInfo', async () => {
    const spy = mockFetch(
      { status: 200, body: BOOTSTRAP_JSON },
      { status: 200, body: REGISTERED_RDAP }
    );
    const { checkRdap } = await import('../../src/checkers/rdap.js');
    const result = await checkRdap(makeDomain('example.com'));
    expect(result?.available).toBe(false);
    expect(result?.info?.registrar).toBe('ICANN Test Registrar');
    expect(result?.info?.created).toBe('1995-08-14T04:00:00Z');
    spy.mockRestore();
  });

  test('non-200/404 status → error string with status code', async () => {
    const spy = mockFetch(
      { status: 200, body: BOOTSTRAP_JSON },
      { status: 500, body: {} }
    );
    const { checkRdap } = await import('../../src/checkers/rdap.js');
    const result = await checkRdap(makeDomain('example.com'));
    expect(result?.available).toBe(false);
    expect(result?.error).toContain('500');
    spy.mockRestore();
  });

  test('network error → error string', async () => {
    const spy = spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(BOOTSTRAP_JSON), { status: 200 }))
      .mockRejectedValueOnce(new Error('Connection refused'));
    const { checkRdap } = await import('../../src/checkers/rdap.js');
    const result = await checkRdap(makeDomain('example.com'));
    expect(result?.available).toBe(false);
    expect(result?.error).toContain('Connection refused');
    spy.mockRestore();
  });
});
