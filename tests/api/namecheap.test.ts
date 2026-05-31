import { describe, expect, test, spyOn, beforeEach, afterEach, mock } from 'bun:test';

const AVAILABLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.check">
    <DomainCheckResult Domain="available.com" Available="true" IsPremiumName="false" PremiumRegistrationPrice="" />
  </CommandResponse>
</ApiResponse>`;

const AVAILABLE_PREMIUM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.check">
    <DomainCheckResult Domain="premium.com" Available="true" IsPremiumName="true" PremiumRegistrationPrice="500.00" />
  </CommandResponse>
</ApiResponse>`;

const UNAVAILABLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse Status="OK">
  <CommandResponse Type="namecheap.domains.check">
    <DomainCheckResult Domain="taken.com" Available="false" IsPremiumName="false" />
  </CommandResponse>
</ApiResponse>`;

const ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse Status="ERROR">
  <Errors>
    <Error Number="1010101">Parameter ApiKey is missing</Error>
  </Errors>
</ApiResponse>`;

function mockFetchText(text: string, status = 200) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(text, { status })
  );
}

describe('checkNamecheap', () => {
  beforeEach(() => {
    process.env['NAMECHEAP_API_KEY'] = 'test-key';
    process.env['NAMECHEAP_USERNAME'] = 'testuser';
    process.env['NAMECHEAP_CLIENT_IP'] = '1.2.3.4';
  });

  afterEach(() => {
    delete process.env['NAMECHEAP_API_KEY'];
    delete process.env['NAMECHEAP_USERNAME'];
    delete process.env['NAMECHEAP_CLIENT_IP'];
    // fetchSpy is restored per-test via fetchSpy.mockRestore()
  });

  test('not configured when env vars missing', async () => {
    delete process.env['NAMECHEAP_API_KEY'];
    delete process.env['NAMECHEAP_USERNAME'];
    delete process.env['NAMECHEAP_CLIENT_IP'];
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('example.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    expect(result.error).toBeDefined();
  });

  test('available regular domain: price is null (known limitation)', async () => {
    const fetchSpy = mockFetchText(AVAILABLE_XML);
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('available.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBeNull();
    fetchSpy.mockRestore();
  });

  test('available premium domain: price is parsed', async () => {
    const fetchSpy = mockFetchText(AVAILABLE_PREMIUM_XML);
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('premium.com');
    expect(result.available).toBe(true);
    expect(result.price?.price).toBe(500);
    fetchSpy.mockRestore();
  });

  test('unavailable domain', async () => {
    const fetchSpy = mockFetchText(UNAVAILABLE_XML);
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('taken.com');
    expect(result.available).toBe(false);
    expect(result.price).toBeNull();
    fetchSpy.mockRestore();
  });

  test('XML error response returns error', async () => {
    const fetchSpy = mockFetchText(ERROR_XML);
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('Parameter ApiKey is missing');
    fetchSpy.mockRestore();
  });

  test('HTTP error returns error', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Bad Gateway', { status: 502 })
    );
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('502');
    fetchSpy.mockRestore();
  });

  test('network error returns error string', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('example.com');
    expect(result.available).toBe(false);
    expect(result.error).toContain('Timeout');
    fetchSpy.mockRestore();
  });

  test('purchaseUrl contains domain', async () => {
    const fetchSpy = mockFetchText(AVAILABLE_XML);
    const { checkNamecheap } = await import('../../src/checkers/namecheap.js');
    const result = await checkNamecheap('available.com');
    expect(result.price?.purchaseUrl).toContain('available.com');
    fetchSpy.mockRestore();
  });
});
