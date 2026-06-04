#!/usr/bin/env bun
import { render } from 'ink';
import React from 'react';
import App from './src/tui/App.js';
import { buildCli } from './src/cli/index.js';

const args = process.argv.slice(2);

const forceTui = args.includes('--tui') || args.length === 0;
const hasCliFlags = args.some(a => a.startsWith('-') && a !== '--tui');

if (forceTui && !hasCliFlags) {
  const domainArgs = args.filter(a => a !== '--tui');

  // Enter the alternate screen buffer: clean canvas, no terminal history affected.
  // Clear screen and home cursor so Ink starts from (0,0).
  process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H');

  let exited = false;
  const restoreTerminal = () => {
    if (exited) return;
    exited = true;
    process.stdout.write('\x1b[?1049l');
  };

  // Restore on abnormal exit (the normal path is after waitUntilExit below).
  process.on('SIGINT', () => { restoreTerminal(); process.exit(0); });
  process.on('SIGTERM', () => { restoreTerminal(); process.exit(0); });
  process.on('exit', restoreTerminal);

  const { waitUntilExit } = render(
    React.createElement(App, {
      initialDomains: domainArgs,
      pipelineOptions: {},
    }),
    { exitOnCtrlC: true }
  );

  await waitUntilExit();
  restoreTerminal();
} else {
  const program = buildCli();
  await program.parseAsync(process.argv);
}
