import React from 'react';
import { Box, Text } from 'ink';
import type { CheckResult } from '../../types.js';
import { getBestPrice } from '../../pipeline/index.js';
import Spinner from './Spinner.js';

const COL_DOMAIN = 28;
const COL_STATUS = 12;
const COL_PRICE = 10;
const COL_SEO = 10;

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

interface RowProps {
  result: CheckResult;
  isSelected: boolean;
  isChecking: boolean;
}

function DomainRow({ result, isSelected, isChecking }: RowProps) {
  const { text: statusText, color: statusColor } = statusDisplay(result);
  const price = getBestPrice(result);
  const score = result.seoScore.total;

  return (
    <Box>
      <Text
        color={isSelected ? 'black' : undefined}
        backgroundColor={isSelected ? 'cyan' : undefined}
      >
        {isSelected ? '▶ ' : '  '}
        {pad(result.domain.name, COL_DOMAIN)}
        {'│ '}
      </Text>
      {isChecking ? (
        <Spinner label={pad('Checking', COL_STATUS - 1)} color="yellow" />
      ) : (
        <Text
          color={isSelected ? 'black' : statusColor}
          backgroundColor={isSelected ? 'cyan' : undefined}
        >
          {pad(statusText, COL_STATUS)}
        </Text>
      )}
      <Text
        color={isSelected ? 'black' : undefined}
        backgroundColor={isSelected ? 'cyan' : undefined}
      >
        {'│ '}
        {pad(price, COL_PRICE)}
        {'│ '}
      </Text>
      <Text
        color={isSelected ? 'black' : seoColor(score)}
        backgroundColor={isSelected ? 'cyan' : undefined}
      >
        {seoBar(score)} {String(score).padStart(3)}
      </Text>
    </Box>
  );
}

interface DomainTableProps {
  results: CheckResult[];
  checkingDomains: Set<string>;
  selectedIndex: number;
  visibleCount?: number;
}

export default function DomainTable({ results, checkingDomains, selectedIndex, visibleCount = 20 }: DomainTableProps) {
  const borderColor = 'gray';
  const headerLine = '─'.repeat(COL_DOMAIN + 2) + '┼' + '─'.repeat(COL_STATUS + 2) + '┼' + '─'.repeat(COL_PRICE + 2) + '┼' + '─'.repeat(COL_SEO + 5);
  const topLine = '─'.repeat(COL_DOMAIN + 2) + '┬' + '─'.repeat(COL_STATUS + 2) + '┬' + '─'.repeat(COL_PRICE + 2) + '┬' + '─'.repeat(COL_SEO + 5);
  const botLine = '─'.repeat(COL_DOMAIN + 2) + '┴' + '─'.repeat(COL_STATUS + 2) + '┴' + '─'.repeat(COL_PRICE + 2) + '┴' + '─'.repeat(COL_SEO + 5);

  // Scroll window
  const half = Math.floor(visibleCount / 2);
  const startIdx = Math.max(0, Math.min(selectedIndex - half, results.length - visibleCount));
  const visible = results.slice(startIdx, startIdx + visibleCount);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Text color={borderColor}>┌{topLine}┐</Text>
      <Box>
        <Text color={borderColor}>│ </Text>
        <Text bold>{pad('Domain', COL_DOMAIN)}</Text>
        <Text color={borderColor}>│ </Text>
        <Text bold>{pad('Status', COL_STATUS)}</Text>
        <Text color={borderColor}>│ </Text>
        <Text bold>{pad('Best Price', COL_PRICE)}</Text>
        <Text color={borderColor}>│ </Text>
        <Text bold>{'SEO Score     '}</Text>
        <Text color={borderColor}>│</Text>
      </Box>
      <Text color={borderColor}>├{headerLine}┤</Text>

      {/* Rows */}
      {visible.length === 0 ? (
        <Box>
          <Text color={borderColor}>│</Text>
          <Text color="gray">{' No domains to display'.padEnd(COL_DOMAIN + COL_STATUS + COL_PRICE + COL_SEO + 14)}</Text>
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
