import { describe, expect, test } from 'bun:test';
import { parseDomain } from '../../src/checkers/index.js';

describe('parseDomain', () => {
  test('plain domain.com', () => {
    const d = parseDomain('example.com');
    expect(d.name).toBe('example.com');
    expect(d.sld).toBe('example');
    expect(d.tld).toBe('com');
  });

  test('strips https://', () => {
    const d = parseDomain('https://example.com');
    expect(d.name).toBe('example.com');
  });

  test('strips http://', () => {
    const d = parseDomain('http://example.com');
    expect(d.name).toBe('example.com');
  });

  test('strips www.', () => {
    const d = parseDomain('www.example.com');
    expect(d.name).toBe('example.com');
    expect(d.sld).toBe('example');
  });

  test('strips https://www.', () => {
    const d = parseDomain('https://www.example.com');
    expect(d.name).toBe('example.com');
  });

  test('strips path', () => {
    const d = parseDomain('example.com/some/path');
    expect(d.name).toBe('example.com');
  });

  test('strips query string', () => {
    const d = parseDomain('example.com?foo=bar');
    expect(d.name).toBe('example.com');
  });

  test('strips fragment', () => {
    const d = parseDomain('example.com#section');
    expect(d.name).toBe('example.com');
  });

  test('handles multi-part TLD (co.uk)', () => {
    const d = parseDomain('shop.co.uk');
    expect(d.name).toBe('shop.co.uk');
    expect(d.sld).toBe('shop');
    expect(d.tld).toBe('co.uk');
  });

  test('handles single-label (no dot)', () => {
    const d = parseDomain('localhost');
    expect(d.name).toBe('localhost');
    expect(d.sld).toBe('localhost');
    expect(d.tld).toBe('');
  });

  test('lowercases everything', () => {
    const d = parseDomain('EXAMPLE.COM');
    expect(d.name).toBe('example.com');
    expect(d.sld).toBe('example');
    expect(d.tld).toBe('com');
  });

  test('trims surrounding whitespace', () => {
    const d = parseDomain('  example.com  ');
    expect(d.name).toBe('example.com');
  });
});
