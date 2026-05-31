import { describe, expect, test, spyOn, beforeEach, afterEach } from 'bun:test';

const AVAILABLE_RESPONSE = {
  reply: {
    available: {
      domain: { domain: 'example.com', price: 8.99 },
    },
  },
};

const UNAVAILABLE_RESPONSE = {
  reply: {},
};

function mockFetch(body: unknown, status = 200) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status })
  );
}

describe('checkNamesilo', () => {
  beforeEach(() => {
    process.env['NAMESILO_API_KEY'] = 'test-key';
  });

  afterEach(() => {
    delete process.env['NAMESILO_API_KEY'];
  });

  test('not configured when env var missing', async () => {
    delete process.env['NAMESILO_API_KEY'];
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('example.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    expect(result.error).toBeDefined();
  });

  test('available domain returns correct price', async () => {
    const spy = mockFetch(AVAILABLE_RESPONSE);
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('example.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBeCloseTo(8.99);
    expect(result.price?.registrar).toBe('namesilo');
    expect(result.price?.currency).toBe('USD');
    expect(result.price?.purchaseUrl).toContain('example.com');
    spy.mockRestore();
  });

  test('unavailable domain returns available=false, price=null', async () => {
    const spy = mockFetch(UNAVAILABLE_RESPONSE);
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('taken.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    spy.mockRestore();
  });

  test('HTTP error returns error string', async () => {
    const spy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Bad Gateway', { status: 502 })
    );
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('502');
    spy.mockRestore();
  });

  test('network error returns error string', async () => {
    const spy = spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('Timeout');
    spy.mockRestore();
  });

  test('multi-domain response finds correct domain', async () => {
    const spy = mockFetch({
      reply: {
        available: {
          domain: [
            { domain: 'other.com', price: 7.99 },
            { domain: 'example.com', price: 8.99 },
          ],
        },
      },
    });
    const { checkNamesilo } = await import('../../src/checkers/namesilo.js');
    const result = await checkNamesilo('example.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBeCloseTo(8.99);
    spy.mockRestore();
  });
});
