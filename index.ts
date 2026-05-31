#!/usr/bin/env bun
import { render } from 'ink';
import React from 'react';
import App from './src/tui/App.js';
import { buildCli } from './src/cli/index.js';

const args = process.argv.slice(2);

// Flags that force TUI mode
const forceTui = args.includes('--tui') || args.length === 0;

// Flags that force CLI mode (has non-domain flags or explicit output/input)
const hasCliFlags = args.some(a => a.startsWith('-') && a !== '--tui');

if (forceTui && !hasCliFlags) {
  // Strip --tui flag, remaining positional args are initial domains
  const domainArgs = args.filter(a => a !== '--tui');

  const { waitUntilExit } = render(
    React.createElement(App, {
      initialDomains: domainArgs,
      pipelineOptions: {},
    })
  );

  await waitUntilExit();
} else {
  const program = buildCli();
  await program.parseAsync(process.argv);
}
