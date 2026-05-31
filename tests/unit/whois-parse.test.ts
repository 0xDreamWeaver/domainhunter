import { describe, expect, test } from 'bun:test';
import { parseWhois } from '../../src/checkers/whois.js';
import {
  WHOIS_TAKEN_VERISIGN,
  WHOIS_TAKEN_DENIC,
  WHOIS_TAKEN_MINIMAL,
  WHOIS_TAKEN_GDPR_REDACTED,
  WHOIS_EMPTY,
} from '../fixtures/whois-responses.js';

describe('parseWhois – Verisign format', () => {
  const info = parseWhois(WHOIS_TAKEN_VERISIGN);

  test('extracts registrar', () => {
    expect(info.registrar).toBe('RESERVED-Internet Assigned Numbers Authority');
  });

  test('extracts creation date', () => {
    expect(info.created).toBe('1992-01-01T05:00:00Z');
  });

  test('extracts expiry date', () => {
    expect(info.expires).toBe('2024-01-01T05:00:00Z');
  });

  test('extracts updated date', () => {
    expect(info.updated).toBe('2023-08-14T07:01:31Z');
  });

  test('extracts multiple nameservers', () => {
    expect(info.nameservers).toContain('A.IANA-SERVERS.NET');
    expect(info.nameservers).toContain('B.IANA-SERVERS.NET');
    expect(info.nameservers).toHaveLength(2);
  });

  test('extracts domain status', () => {
    expect(info.status).toContain('clientDeleteProhibited');
  });

  test('extracts registrant email', () => {
    expect(info.email).toBe('domainabuse@iana.org');
  });

  test('extracts registrant organization', () => {
    expect(info.registrant).toBe('Internet Assigned Numbers Authority');
  });

  test('raw is preserved', () => {
    expect(info.raw).toBe(WHOIS_TAKEN_VERISIGN);
  });
});

describe('parseWhois – DENIC format', () => {
  const info = parseWhois(WHOIS_TAKEN_DENIC);

  test('extracts changed date', () => {
    expect(info.updated).toBeDefined();
  });

  test('extracts nameservers', () => {
    expect(info.nameservers).toContain('ns1.example.de');
    expect(info.nameservers).toContain('ns2.example.de');
  });
});

describe('parseWhois – minimal response', () => {
  const info = parseWhois(WHOIS_TAKEN_MINIMAL);

  test('extracts registrar', () => {
    expect(info.registrar).toBe('Test Registrar Inc.');
  });

  test('extracts multiple nameservers', () => {
    expect(info.nameservers).toHaveLength(2);
  });

  test('missing fields are undefined', () => {
    expect(info.registrant).toBeUndefined();
    expect(info.email).toBeUndefined();
  });
});

describe('parseWhois – GDPR redacted', () => {
  const info = parseWhois(WHOIS_TAKEN_GDPR_REDACTED);

  test('registrant field contains REDACTED text', () => {
    expect(info.registrant).toContain('REDACTED');
  });

  test('nameservers still extracted', () => {
    expect(info.nameservers).toContain('ns1.example.com');
  });
});

describe('parseWhois – empty string', () => {
  const info = parseWhois(WHOIS_EMPTY);

  test('all fields undefined for empty input', () => {
    expect(info.registrar).toBeUndefined();
    expect(info.registrant).toBeUndefined();
    expect(info.email).toBeUndefined();
    expect(info.created).toBeUndefined();
    expect(info.nameservers).toHaveLength(0);
    expect(info.status).toHaveLength(0);
  });
});
