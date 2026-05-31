import os from 'node:os';
import path from 'node:path';
import { appendFile, mkdir } from 'node:fs/promises';

export interface LogEntry {
  ts: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  checker?: string;
  domain?: string;
  msg: string;
  statusCode?: number;
  attempt?: number;
  error?: string;
}

export interface LoggerConfig {
  debug: boolean;
  logFile: string | false;
}

function defaultLogFile(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(os.homedir(), '.domainhunter', 'logs', `${date}.log`);
}

const state: LoggerConfig = {
  debug: false,
  logFile: defaultLogFile(),
};

export function configure(config: Partial<LoggerConfig>): void {
  if (config.debug !== undefined) state.debug = config.debug;
  if (config.logFile !== undefined) state.logFile = config.logFile;
}

export function resetLogger(): void {
  state.debug = false;
  state.logFile = defaultLogFile();
}

async function writeEntry(level: LogEntry['level'], ctx: Omit<LogEntry, 'ts' | 'level'>): Promise<void> {
  const entry: LogEntry = { ts: new Date().toISOString(), level, ...ctx };

  if (state.logFile !== false) {
    try {
      await mkdir(path.dirname(state.logFile), { recursive: true });
      await appendFile(state.logFile, JSON.stringify(entry) + '\n');
    } catch {
      // Never crash the application over a logging failure
    }
  }

  if (state.debug && (level === 'WARN' || level === 'ERROR')) {
    const domain = ctx.domain ? ` ${ctx.domain}` : '';
    const checker = ctx.checker ? `${ctx.checker}` : 'dh';
    const extra = ctx.statusCode ? ` (HTTP ${ctx.statusCode})` : ctx.error ? ` (${ctx.error})` : '';
    process.stderr.write(`[${level}] ${checker}${domain} — ${ctx.msg}${extra}\n`);
  }
}

export function debug(ctx: Omit<LogEntry, 'ts' | 'level'>): void {
  void writeEntry('DEBUG', ctx);
}

export function info(ctx: Omit<LogEntry, 'ts' | 'level'>): void {
  void writeEntry('INFO', ctx);
}

export function warn(ctx: Omit<LogEntry, 'ts' | 'level'>): void {
  void writeEntry('WARN', ctx);
}

export function error(ctx: Omit<LogEntry, 'ts' | 'level'>): void {
  void writeEntry('ERROR', ctx);
}
