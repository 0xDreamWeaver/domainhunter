import { describe, expect, test, spyOn, beforeEach, afterEach } from 'bun:test';

function mockFetch(response: unknown, status = 200) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(response), { status })
  );
}

function mockFetchError(err: Error) {
  return spyOn(globalThis, 'fetch').mockRejectedValueOnce(err);
}

describe('checkGodaddy', () => {
  let originalKey: string | undefined;
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalKey = process.env['GODADDY_API_KEY'];
    originalSecret = process.env['GODADDY_API_SECRET'];
  });

  afterEach(() => {
    if (originalKey !== undefined) process.env['GODADDY_API_KEY'] = originalKey;
    else delete process.env['GODADDY_API_KEY'];
    if (originalSecret !== undefined) process.env['GODADDY_API_SECRET'] = originalSecret;
    else delete process.env['GODADDY_API_SECRET'];
  });

  test('returns not-configured when env vars missing', async () => {
    delete process.env['GODADDY_API_KEY'];
    delete process.env['GODADDY_API_SECRET'];
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    expect(result.error).toBeDefined();
  });

  test('available domain returns correct price', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = mockFetch({ available: true, price: 12_990_000, currency: 'USD' });
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBeCloseTo(12.99);
    expect(result.price?.registrar).toBe('godaddy');
    expect(result.price?.currency).toBe('USD');
    fetchSpy.mockRestore();
  });

  test('unavailable domain returns available=false, price=null', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = mockFetch({ available: false });
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('taken.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    fetchSpy.mockRestore();
  });

  test('API 4xx returns error', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('401');
    fetchSpy.mockRestore();
  });

  test('API 5xx returns error', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Server Error', { status: 500 })
    );
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('500');
    fetchSpy.mockRestore();
  });

  test('network error returns error string', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = mockFetchError(new Error('Network failure'));
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('Network failure');
    fetchSpy.mockRestore();
  });

  test('price conversion: GoDaddy microcents / 1_000_000', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = mockFetch({ available: true, price: 9_990_000, currency: 'USD' });
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('example.com');
    expect(result.price?.price).toBeCloseTo(9.99);
    fetchSpy.mockRestore();
  });

  test('purchaseUrl contains domain', async () => {
    process.env['GODADDY_API_KEY'] = 'test-key';
    process.env['GODADDY_API_SECRET'] = 'test-secret';
    const fetchSpy = mockFetch({ available: true, price: 10_000_000, currency: 'USD' });
    const { checkGodaddy } = await import('../../src/checkers/godaddy.js');
    const result = await checkGodaddy('mysite.com');
    expect(result.price?.purchaseUrl).toContain('mysite.com');
    fetchSpy.mockRestore();
  });
});
