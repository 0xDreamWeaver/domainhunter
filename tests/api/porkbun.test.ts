import { describe, expect, test, spyOn, beforeEach } from 'bun:test';

const PRICING_RESPONSE = {
  status: 'SUCCESS',
  pricing: {
    com: { registration: '9.73', renewal: '11.98', transfer: '9.73' },
    io: { registration: '44.98', renewal: '44.98', transfer: '44.98' },
    ai: { registration: '89.98', renewal: '89.98', transfer: '89.98' },
  },
};

function mockFetch(body: unknown, status = 200) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status })
  );
}

describe('getPorkbunPrice', () => {
  beforeEach(async () => {
    const { resetPorkbunCache } = await import('../../src/checkers/porkbun.js');
    resetPorkbunCache();
  });

  test('returns RegistrarPrice for known TLD', async () => {
    const spy = mockFetch(PRICING_RESPONSE);
    const { getPorkbunPrice } = await import('../../src/checkers/porkbun.js');
    const result = await getPorkbunPrice('example.com');
    expect(result).not.toBeNull();
    expect(result?.registrar).toBe('porkbun');
    expect(result?.price).toBeCloseTo(9.73);
    expect(result?.currency).toBe('USD');
    expect(result?.purchaseUrl).toContain('example.com');
    spy.mockRestore();
  });

  test('returns null for TLD not in pricing table', async () => {
    const spy = mockFetch(PRICING_RESPONSE);
    const { getPorkbunPrice } = await import('../../src/checkers/porkbun.js');
    const result = await getPorkbunPrice('example.xyz');
    expect(result).toBeNull();
    spy.mockRestore();
  });

  test('returns null on fetch error (pricing is best-effort)', async () => {
    const spy = spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network down'));
    const { getPorkbunPrice } = await import('../../src/checkers/porkbun.js');
    const result = await getPorkbunPrice('example.com');
    expect(result).toBeNull();
    spy.mockRestore();
  });

  test('returns null on non-200 response', async () => {
    const spy = mockFetch({}, 503);
    const { getPorkbunPrice } = await import('../../src/checkers/porkbun.js');
    const result = await getPorkbunPrice('example.com');
    expect(result).toBeNull();
    spy.mockRestore();
  });

  test('second call uses cache — fetch called only once', async () => {
    const spy = mockFetch(PRICING_RESPONSE);
    const { getPorkbunPrice } = await import('../../src/checkers/porkbun.js');
    await getPorkbunPrice('example.com');
    await getPorkbunPrice('example.io');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
