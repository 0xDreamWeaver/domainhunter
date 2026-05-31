import { describe, expect, test, spyOn, beforeEach, afterEach } from 'bun:test';

const AVAILABLE_RESPONSE = {
  results: [
    { domainName: 'example.com', purchasable: true, purchasePrice: 12.99, purchaseType: 'registration' },
  ],
};

const UNAVAILABLE_RESPONSE = {
  results: [
    { domainName: 'taken.com', purchasable: false },
  ],
};

function mockFetch(body: unknown, status = 200) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status })
  );
}

describe('checkNamecom', () => {
  beforeEach(() => {
    process.env['NAMECOM_USERNAME'] = 'testuser';
    process.env['NAMECOM_TOKEN'] = 'test-token';
  });

  afterEach(() => {
    delete process.env['NAMECOM_USERNAME'];
    delete process.env['NAMECOM_TOKEN'];
  });

  test('not configured when env vars missing', async () => {
    delete process.env['NAMECOM_USERNAME'];
    delete process.env['NAMECOM_TOKEN'];
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    const result = await checkNamecom('example.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    expect(result.error).toBeDefined();
  });

  test('available domain returns correct RegistrarPrice', async () => {
    const spy = mockFetch(AVAILABLE_RESPONSE);
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    const result = await checkNamecom('example.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBeCloseTo(12.99);
    expect(result.price?.registrar).toBe('namecom');
    expect(result.price?.currency).toBe('USD');
    expect(result.price?.purchaseUrl).toContain('example.com');
    spy.mockRestore();
  });

  test('unavailable domain returns available=false, price=null', async () => {
    const spy = mockFetch(UNAVAILABLE_RESPONSE);
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    const result = await checkNamecom('taken.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    spy.mockRestore();
  });

  test('HTTP 401 returns error', async () => {
    const spy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    const result = await checkNamecom('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('401');
    spy.mockRestore();
  });

  test('network error returns error string', async () => {
    const spy = spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection reset'));
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    const result = await checkNamecom('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('Connection reset');
    spy.mockRestore();
  });

  test('sends Authorization header with Basic credentials', async () => {
    let capturedHeaders: Headers | undefined;
    const spy = spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify(AVAILABLE_RESPONSE), { status: 200 });
    });
    const { checkNamecom } = await import('../../src/checkers/namecom.js');
    await checkNamecom('example.com');
    expect(capturedHeaders?.get('Authorization')).toMatch(/^Basic /);
    spy.mockRestore();
  });
});
