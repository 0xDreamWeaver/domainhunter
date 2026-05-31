import { Command } from 'commander';
import chalk from 'chalk';
import type { FilterConfig, SortConfig, SortField, SortDirection } from '../types.js';
import { processDomains, applyFilter, applySort, getBestPrice } from '../pipeline/index.js';
import { importCsv, exportCsv } from '../io/csv.js';
import { importExcel, exportExcel } from '../io/excel.js';
import { importSheets, exportSheets } from '../io/sheets.js';
import { exportJson } from '../io/json.js';
import * as logger from '../utils/logger.js';

const VERSION = '0.1.0';

async function importDomains(input: string): Promise<string[]> {
  const lower = input.toLowerCase();
  if (lower.endsWith('.csv')) return importCsv(input);
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return importExcel(input);
  if (input.includes('spreadsheets') || input.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    return importSheets(input);
  }
  throw new Error(`Unknown input format: ${input}`);
}

async function exportResults(
  results: Parameters<typeof applyFilter>[0],
  output: string,
  format?: string
): Promise<void> {
  const ext = format ?? output.split('.').pop()?.toLowerCase();

  if (ext === 'csv') await exportCsv(results, output);
  else if (ext === 'xlsx' || ext === 'excel') await exportExcel(results, output);
  else if (ext === 'json') await exportJson(results, output);
  else if (ext === 'sheets') await exportSheets(results, output);
  else throw new Error(`Unknown output format: ${ext}`);
}

function printTable(results: Parameters<typeof applyFilter>[0]): void {
  const COL1 = 30, COL2 = 12, COL3 = 10, COL4 = 8;
  const hr = '─'.repeat(COL1 + COL2 + COL3 + COL4 + 9);
  const pad = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);

  console.log(hr);
  console.log(
    pad('Domain', COL1) + ' │ ' +
    pad('Status', COL2) + ' │ ' +
    pad('Price', COL3) + ' │ ' +
    'SEO'
  );
  console.log(hr);

  for (const r of results) {
    const statusStr =
      r.status === 'available' ? chalk.green('✓ Available') :
      r.status === 'taken' ? chalk.red('✗ Taken') :
      chalk.gray('? Unknown');

    const priceStr = getBestPrice(r);
    const score = r.seoScore.total;
    const scoreStr = score >= 80
      ? chalk.green(`${score}/100`)
      : score >= 60
        ? chalk.yellow(`${score}/100`)
        : chalk.red(`${score}/100`);

    console.log(
      pad(r.domain.name, COL1) + ' │ ' +
      pad(r.status === 'available' ? '✓ Available' : r.status === 'taken' ? '✗ Taken' : '? Unknown', COL2) + ' │ ' +
      pad(priceStr, COL3) + ' │ ' +
      scoreStr
    );

    // Override domain column with plain text, status with color
    process.stdout.write('\x1B[1A'); // Move up one line
    process.stdout.write(
      chalk.white(pad(r.domain.name, COL1)) + ' │ ' +
      (r.status === 'available' ? chalk.green(pad('✓ Available', COL2)) :
       r.status === 'taken' ? chalk.red(pad('✗ Taken', COL2)) :
       chalk.gray(pad('? Unknown', COL2))) +
      ' │ ' + chalk.cyan(pad(priceStr, COL3)) + ' │ ' + scoreStr + '\n'
    );
  }

  console.log(hr);
  const avail = results.filter(r => r.status === 'available').length;
  const taken = results.filter(r => r.status === 'taken').length;
  console.log(chalk.gray(`${results.length} domains · ${avail} available · ${taken} taken`));
}

export function buildCli(): Command {
  const program = new Command();

  program
    .name('dh')
    .description('DomainHunter — domain availability checker with SEO scoring')
    .version(VERSION);

  program
    .argument('[domains...]', 'Domain names to check')
    .option('-i, --input <file>', 'Input file (CSV, Excel, Google Sheets URL/ID)')
    .option('-o, --output <file>', 'Output file (CSV, Excel, JSON) or Sheets ID')
    .option('-f, --format <format>', 'Output format: csv, excel, json, sheets')
    .option('--filter-status <status>', 'Filter: all, available, taken', 'all')
    .option('--max-price <price>', 'Filter: max price in USD', parseFloat)
    .option('--min-seo <score>', 'Filter: minimum SEO score', parseInt)
    .option('--sort <field>', 'Sort field: name, status, price, seo', 'seo')
    .option('--sort-dir <dir>', 'Sort direction: asc, desc', 'asc')
    .option('--sort2 <field>', 'Secondary sort field')
    .option('--sort2-dir <dir>', 'Secondary sort direction', 'asc')
    .option('--keywords <words>', 'Comma-separated keywords for SEO scoring')
    .option('--concurrency <n>', 'Concurrent domain checks', parseInt, 5)
    .option('--skip-whois', 'Skip WHOIS lookup (faster, less accurate)')
    .option('--skip-pricing', 'Skip pricing lookup')
    .option('--tui', 'Force TUI mode')
    .option('--debug', 'Print WARN/ERROR log entries to stderr in real time')
    .option('--log-file <path>', 'Override log file path (default: ~/.domainhunter/logs/YYYY-MM-DD.log)')
    .option('--no-log', 'Disable log file writing for this run')
    .action(async (domains: string[], opts) => {
      logger.configure({
        debug: !!opts.debug,
        logFile: opts.log === false ? false : (opts.logFile as string | undefined),
      });
      // Collect domains from args + input file
      let inputDomains: string[] = [...domains];

      if (opts.input) {
        try {
          const imported = await importDomains(opts.input);
          inputDomains = [...inputDomains, ...imported];
        } catch (err) {
          console.error(chalk.red(`Import error: ${err instanceof Error ? err.message : err}`));
          process.exit(1);
        }
      }

      if (!inputDomains.length) {
        program.help();
        return;
      }

      const keywords = opts.keywords
        ? (opts.keywords as string).split(',').map((k: string) => k.trim())
        : [];

      const filter: FilterConfig = {
        status: opts.filterStatus as FilterConfig['status'],
        maxPrice: opts.maxPrice ?? null,
        minSeo: opts.minSeo ?? null,
      };

      const sort: SortConfig = {
        primary: { field: opts.sort as SortField, direction: opts.sortDir as SortDirection },
        secondary: opts.sort2
          ? { field: opts.sort2 as SortField, direction: opts.sort2Dir as SortDirection }
          : undefined,
      };

      process.stderr.write(chalk.cyan(`Checking ${inputDomains.length} domain${inputDomains.length !== 1 ? 's' : ''}...\n`));

      const results = await processDomains(
        inputDomains,
        {
          keywords,
          concurrency: opts.concurrency,
          skipWhois: opts.skipWhois,
          skipPricing: opts.skipPricing,
        },
        event => {
          if (event.type === 'progress') {
            process.stderr.write(
              `\r${chalk.cyan('⠋')} ${event.done}/${event.total} checked`
            );
          }
        }
      );

      process.stderr.write('\n');

      const filtered = applyFilter(results, filter);
      const sorted = applySort(filtered, sort);

      if (opts.output) {
        try {
          await exportResults(sorted, opts.output, opts.format);
          console.log(chalk.green(`✓ Results saved to ${opts.output}`));
        } catch (err) {
          console.error(chalk.red(`Export error: ${err instanceof Error ? err.message : err}`));
          process.exit(1);
        }
      } else {
        printTable(sorted);
      }
    });

  return program;
}
