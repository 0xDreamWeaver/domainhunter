import React from 'react';
import { Box, Text } from 'ink';
import type { CheckResult, ColumnConfig } from '../../types.js';
import { getBestPrice } from '../../pipeline/index.js';
import Spinner from './Spinner.js';

const COL_DOMAIN = 28;
const COL_STATUS = 12;
const COL_PRICE = 11;
const COL_SEO = 10;
const COL_REGISTERED = 12;
// SEO column renders: seoBar(8) + ' ' + score padded(3) + ' ' = 13 visible chars
const SEO_DISPLAY = 13;

function pad(str: string, len: number): string {
  if (str.length > len) return str.slice(0, len - 1) + '…';
  return str.padEnd(len);
}

function seoBar(score: number): string {
  const filled = Math.round((score / 100) * 8);
  return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

function seoColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

function statusDisplay(r: CheckResult): { text: string; color: string } {
  switch (r.status) {
    case 'available': return { text: '✓ Available', color: 'green' };
    case 'taken': return { text: '✗ Taken', color: 'red' };
    case 'checking': return { text: '⠋ Checking', color: 'yellow' };
    case 'error': return { text: '! Error', color: 'red' };
    default: return { text: '? Unknown', color: 'gray' };
  }
}

function buildSep(joinChar: string, cols: ColumnConfig): string {
  const parts: string[] = [
    '─'.repeat(COL_DOMAIN + 2),       // selector(2) + domain(28)
    '─'.repeat(COL_STATUS + 1),        // space(1) + status(12)
  ];
  if (cols.price) parts.push('─'.repeat(COL_PRICE + 1));       // space(1) + price(11)
  if (cols.seo) parts.push('─'.repeat(SEO_DISPLAY + 1));        // space(1) + seo(12)
  if (cols.registered) parts.push('─'.repeat(COL_REGISTERED + 1)); // space(1) + date(12)
  return parts.join(joinChar);
}

function innerWidth(cols: ColumnConfig): number {
  let w = 2 + COL_DOMAIN + 1 + COL_STATUS; // selector + domain + sep-space + status
  if (cols.price) w += 1 + COL_PRICE;
  if (cols.seo) w += 1 + SEO_DISPLAY;
  if (cols.registered) w += 1 + COL_REGISTERED;
  return w;
}

interface RowProps {
  result: CheckResult;
  isSelected: boolean;
  isChecking: boolean;
  columns: ColumnConfig;
}

function DomainRow({ result, isSelected, isChecking, columns }: RowProps) {
  const { text: statusText, color: statusColor } = statusDisplay(result);
  const price = getBestPrice(result);
  const score = result.seoScore.total;
  const registeredStr = result.whois?.created?.slice(0, 10) ?? '—';

  const bg = isSelected ? 'cyan' : undefined;
  const fg = isSelected ? 'black' : undefined;
  const divider = <Text color={isSelected ? 'black' : 'gray'} backgroundColor={bg}>{'│ '}</Text>;

  return (
    <Box>
      <Text color={fg} backgroundColor={bg}>
        {isSelected ? '> ' : '  '}
        {pad(result.domain.name, COL_DOMAIN)}
      </Text>
      {divider}
      {isChecking ? (
        <Spinner label={pad('Checking', COL_STATUS - 1)} color="yellow" />
      ) : (
        <Text color={isSelected ? 'black' : statusColor} backgroundColor={bg}>
          {pad(statusText, COL_STATUS)}
        </Text>
      )}
      {columns.price && (
        <>
          {divider}
          <Text color={fg} backgroundColor={bg}>{pad(price, COL_PRICE)}</Text>
        </>
      )}
      {columns.seo && (
        <>
          {divider}
          <Text color={isSelected ? 'black' : seoColor(score)} backgroundColor={bg}>
            {seoBar(score)} {String(score).padStart(3)}{' '}
          </Text>
        </>
      )}
      {columns.registered && (
        <>
          {divider}
          <Text color={fg} backgroundColor={bg}>{pad(registeredStr, COL_REGISTERED)}</Text>
        </>
      )}
    </Box>
  );
}

const DEFAULT_COLUMNS: ColumnConfig = { price: true, seo: true, registered: false };

interface DomainTableProps {
  results: CheckResult[];
  checkingDomains: Set<string>;
  selectedIndex: number;
  visibleCount?: number;
  columns?: ColumnConfig;
}

export default function DomainTable({
  results,
  checkingDomains,
  selectedIndex,
  visibleCount = 20,
  columns = DEFAULT_COLUMNS,
}: DomainTableProps) {
  const borderColor = 'gray';
  const topLine    = buildSep('┬', columns);
  const headerLine = buildSep('┼', columns);
  const botLine    = buildSep('┴', columns);

  // Scroll window
  const half = Math.floor(visibleCount / 2);
  const startIdx = Math.max(0, Math.min(selectedIndex - half, results.length - visibleCount));
  const visible = results.slice(startIdx, startIdx + visibleCount);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Text color={borderColor}>┌{topLine}┐</Text>
      <Box>
        <Text color={borderColor}>│</Text>
        <Text bold>{'  '}{pad('Domain', COL_DOMAIN)}</Text>
        <Text color={borderColor}>{'│ '}</Text>
        <Text bold>{pad('Status', COL_STATUS)}</Text>
        {columns.price && (
          <>
            <Text color={borderColor}>{'│ '}</Text>
            <Text bold>{pad('Best Price', COL_PRICE)}</Text>
          </>
        )}
        {columns.seo && (
          <>
            <Text color={borderColor}>{'│ '}</Text>
            <Text bold>{pad('SEO Score', SEO_DISPLAY)}</Text>
          </>
        )}
        {columns.registered && (
          <>
            <Text color={borderColor}>{'│ '}</Text>
            <Text bold>{pad('Registered', COL_REGISTERED)}</Text>
          </>
        )}
        <Text color={borderColor}>│</Text>
      </Box>
      <Text color={borderColor}>├{headerLine}┤</Text>

      {/* Rows */}
      {visible.length === 0 ? (
        <Box>
          <Text color={borderColor}>│</Text>
          <Text color="gray">{' No domains to display'.padEnd(innerWidth(columns))}</Text>
          <Text color={borderColor}>│</Text>
        </Box>
      ) : (
        visible.map((result, i) => {
          const absIdx = startIdx + i;
          return (
            <Box key={result.domain.name}>
              <Text color={borderColor}>│</Text>
              <DomainRow
                result={result}
                isSelected={absIdx === selectedIndex}
                isChecking={checkingDomains.has(result.domain.name)}
                columns={columns}
              />
              <Text color={borderColor}>│</Text>
            </Box>
          );
        })
      )}

      <Text color={borderColor}>└{botLine}┘</Text>

      {/* Scroll hint */}
      {results.length > visibleCount && (
        <Text color="gray" dimColor>
          {' '}Showing {startIdx + 1}–{Math.min(startIdx + visibleCount, results.length)} of {results.length}
        </Text>
      )}
    </Box>
  );
}
