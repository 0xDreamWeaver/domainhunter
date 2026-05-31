import { describe, expect, test, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import type { MockedFunction } from 'bun:test';
import { makeDomain } from '../fixtures/domains.js';
import {
  WHOIS_AVAILABLE_VERISIGN,
  WHOIS_AVAILABLE_NOT_FOUND,
  WHOIS_TAKEN_VERISIGN,
  WHOIS_EMPTY,
} from '../fixtures/whois-responses.js';

// Helper to build a fake Bun socket that delivers data then closes
function makeSocketMock(response: string) {
  return {
    write: mock(() => {}),
    terminate: mock(() => {}),
  };
}

// Helper: intercept Bun.connect to simulate WHOIS server responses
function mockBunConnect(responseOrError: string | Error) {
  return spyOn(Bun, 'connect').mockImplementation(async (opts: any) => {
    const { socket } = opts;
    const fakeSocket = makeSocketMock('');
    // Fire open → data → close in next microtask
    queueMicrotask(() => {
      socket.open(fakeSocket);
      if (responseOrError instanceof Error) {
        socket.error(fakeSocket, responseOrError);
      } else {
        socket.data(fakeSocket, Buffer.from(responseOrError));
        socket.end(fakeSocket);
      }
    });
    return fakeSocket as any;
  });
}

describe('checkWhois – availability detection', () => {
  let connectSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    connectSpy?.mockRestore();
  });

  test('returns available=true for NOT FOUND pattern', async () => {
    connectSpy = mockBunConnect(WHOIS_AVAILABLE_VERISIGN);
    const { checkWhois } = await import('../../src/checkers/whois.js');
    const result = await checkWhois(makeDomain('notregistered.com', 'notregistered', 'com'));
    expect(result.available).toBe(true);
  });

  test('returns available=false for taken domain', async () => {
    connectSpy = mockBunConnect(WHOIS_TAKEN_VERISIGN);
    const { checkWhois } = await import('../../src/checkers/whois.js');
    const result = await checkWhois(makeDomain('example.com', 'example', 'com'));
    expect(result.available).toBe(false);
    expect(result.info).toBeDefined();
  });

  test('returns error for empty WHOIS response', async () => {
    connectSpy = mockBunConnect(WHOIS_EMPTY);
    const { checkWhois } = await import('../../src/checkers/whois.js');
    const result = await checkWhois(makeDomain('example.com', 'example', 'com'));
    expect(result.available).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('returns error on socket error', async () => {
    connectSpy = mockBunConnect(new Error('Connection refused'));
    const { checkWhois } = await import('../../src/checkers/whois.js');
    const result = await checkWhois(makeDomain('example.com', 'example', 'com'));
    expect(result.available).toBe(false);
    expect(result.error).toContain('Connection refused');
  });
});

describe('checkWhois – "not found" pattern variants', () => {
  afterEach(() => {
    mock.restore();
  });

  const patterns = [
    ['NO MATCH pattern', WHOIS_AVAILABLE_VERISIGN],
    ['NOT FOUND pattern', WHOIS_AVAILABLE_NOT_FOUND],
  ] as const;

  for (const [label, response] of patterns) {
    test(`detects available: ${label}`, async () => {
      const connectSpy = mockBunConnect(response);
      const { checkWhois } = await import('../../src/checkers/whois.js');
      const result = await checkWhois(makeDomain('notregistered.com', 'notregistered', 'com'));
      expect(result.available).toBe(true);
      connectSpy.mockRestore();
    });
  }
});

describe('getWhoisServer', () => {
  test('returns known server for .com', async () => {
    const { getWhoisServer } = await import('../../src/checkers/whois.js');
    const server = await getWhoisServer('com');
    expect(server).toBe('whois.verisign-grs.com');
  });

  test('returns known server for .io', async () => {
    const { getWhoisServer } = await import('../../src/checkers/whois.js');
    const server = await getWhoisServer('io');
    expect(server).toBe('whois.nic.io');
  });

  test('returns known server for .dev (Google)', async () => {
    const { getWhoisServer } = await import('../../src/checkers/whois.js');
    const server = await getWhoisServer('dev');
    expect(server).toBe('whois.nic.google');
  });
});
