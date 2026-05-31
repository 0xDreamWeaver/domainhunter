import { describe, expect, test, beforeEach, spyOn } from 'bun:test';
import os from 'node:os';
import path from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';

function tmpLog(): string {
  return path.join(os.tmpdir(), `dh-logger-test-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
}

function readLines(file: string): Record<string, unknown>[] {
  return readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

async function flushLogs(): Promise<void> {
  // Logger writes are fire-and-forget; give them a tick to complete
  await new Promise(resolve => setTimeout(resolve, 20));
}

describe('logger', () => {
  beforeEach(async () => {
    const { resetLogger } = await import('../../src/utils/logger.js');
    resetLogger();
  });

  test('warn() writes a JSON line with level WARN', async () => {
    const file = tmpLog();
    const { configure, warn } = await import('../../src/utils/logger.js');
    configure({ logFile: file });
    warn({ checker: 'godaddy', domain: 'example.com', msg: 'HTTP 401', statusCode: 401 });
    await flushLogs();

    const lines = readLines(file);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.level).toBe('WARN');
    expect(lines[0]!.checker).toBe('godaddy');
    expect(lines[0]!.domain).toBe('example.com');
    expect(lines[0]!.msg).toBe('HTTP 401');
    expect(lines[0]!.statusCode).toBe(401);
    expect(typeof lines[0]!.ts).toBe('string');

    rmSync(file);
  });

  test('error() writes level ERROR', async () => {
    const file = tmpLog();
    const { configure, error } = await import('../../src/utils/logger.js');
    configure({ logFile: file });
    error({ checker: 'rdap', msg: 'Bootstrap fetch failed', error: 'Connection refused' });
    await flushLogs();

    const lines = readLines(file);
    expect(lines[0]!.level).toBe('ERROR');
    expect(lines[0]!.error).toBe('Connection refused');

    rmSync(file);
  });

  test('debug() writes to file but does not write to stderr', async () => {
    const file = tmpLog();
    const stderrSpy = spyOn(process.stderr, 'write');
    const { configure, debug } = await import('../../src/utils/logger.js');
    configure({ logFile: file, debug: true }); // even with debug=true, DEBUG level stays file-only
    debug({ checker: 'godaddy', msg: 'Not configured' });
    await flushLogs();

    const lines = readLines(file);
    expect(lines[0]!.level).toBe('DEBUG');
    expect(stderrSpy).not.toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));

    stderrSpy.mockRestore();
    rmSync(file);
  });

  test('configure({ logFile: false }) disables file output', async () => {
    const file = tmpLog();
    const { configure, warn } = await import('../../src/utils/logger.js');
    configure({ logFile: false });
    warn({ msg: 'should not be written' });
    await flushLogs();

    expect(existsSync(file)).toBe(false);
  });

  test('two calls append two lines to the same file', async () => {
    const file = tmpLog();
    const { configure, warn, error } = await import('../../src/utils/logger.js');
    configure({ logFile: file });
    warn({ checker: 'namecheap', msg: 'HTTP 403', statusCode: 403 });
    error({ checker: 'rdap', msg: 'Bootstrap failed' });
    await flushLogs();

    const lines = readLines(file);
    expect(lines).toHaveLength(2);
    const levels = lines.map(l => l.level);
    expect(levels).toContain('WARN');
    expect(levels).toContain('ERROR');

    rmSync(file);
  });

  test('log file is created lazily — does not exist before first write', async () => {
    const file = tmpLog();
    const { configure } = await import('../../src/utils/logger.js');
    configure({ logFile: file });
    // Don't call any log functions
    expect(existsSync(file)).toBe(false);
  });

  test('debug mode writes WARN to stderr in human-readable format', async () => {
    const file = tmpLog();
    const stderrLines: string[] = [];
    const spy = spyOn(process.stderr, 'write').mockImplementation((s: unknown) => {
      stderrLines.push(String(s));
      return true;
    });

    const { configure, warn } = await import('../../src/utils/logger.js');
    configure({ logFile: file, debug: true });
    warn({ checker: 'godaddy', domain: 'example.com', msg: 'HTTP 401', statusCode: 401 });
    await flushLogs();

    expect(stderrLines.some(l => l.includes('[WARN]'))).toBe(true);
    expect(stderrLines.some(l => l.includes('godaddy'))).toBe(true);
    expect(stderrLines.some(l => l.includes('example.com'))).toBe(true);

    spy.mockRestore();
    rmSync(file);
  });

  test('log entry ts field is a valid ISO 8601 string', async () => {
    const file = tmpLog();
    const { configure, info } = await import('../../src/utils/logger.js');
    configure({ logFile: file });
    info({ msg: 'test entry' });
    await flushLogs();

    const lines = readLines(file);
    const ts = lines[0]!.ts as string;
    expect(new Date(ts).toISOString()).toBe(ts);

    rmSync(file);
  });
});
