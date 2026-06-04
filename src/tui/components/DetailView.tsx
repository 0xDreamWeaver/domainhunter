import React, { useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Key } from 'ink';
import type { CheckResult } from '../../types.js';
import { getBestPrice } from '../../pipeline/index.js';

function seoBar(score: number, max: number, width = 14): string {
  const filled = max > 0 ? Math.round((score / max) * width) : 0;
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function seoColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return 'green';
  if (pct >= 0.5) return 'yellow';
  return 'red';
}

interface DetailViewProps {
  result: CheckResult;
  onBack: () => void;
}

export default function DetailView({ result, onBack }: DetailViewProps) {
  const mountedAtRef = useRef(Date.now());

  const handleInput = useCallback((_input: string, key: Key) => {
    if (key.escape) { onBack(); return; }
    // Debounce Enter: ignore keypresses within 200ms of mount so the Enter
    // that opened the view doesn't immediately close it (terminal auto-repeat).
    if (key.return && Date.now() - mountedAtRef.current > 200) { onBack(); return; }
  }, [onBack]);

  useInput(handleInput);

  const { domain, status, prices, whois, seoScore } = result;
  const bd = seoScore.breakdown;
  const max = seoScore.maxBreakdown;

  const statusColor = status === 'available' ? 'green' : status === 'taken' ? 'red' : 'yellow';
  const statusIcon = status === 'available' ? '✓' : status === 'taken' ? '✗' : '?';

  return (
    // Outer box provides only the border — padding is on the inner box.
    // Combining borderStyle + paddingX on the same Box causes Ink to drop
    // the first character of any colored Text inside the content area.
    <Box flexDirection="column" borderStyle="round" width={60}>
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box>
          <Text bold color="cyan">{domain.name}</Text>
          <Box flexGrow={1} />
          <Text color="gray">[Esc] back</Text>
        </Box>
        <Text> </Text>

        <Box marginBottom={1}>
          <Text>Status: </Text>
          <Text color={statusColor} bold>{statusIcon} {status.toUpperCase()}</Text>
        </Box>

        {prices.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Pricing</Text>
            {prices.map(p => (
              <Box key={p.registrar} marginLeft={2}>
                <Text color="gray">{p.registrar.padEnd(12)}</Text>
                <Text color="green">
                  {p.price != null ? `$${p.price.toFixed(2)}` : 'N/A'}
                </Text>
                <Text color="gray"> · </Text>
                <Text color="blue">{p.purchaseUrl}</Text>
              </Box>
            ))}
            <Box marginLeft={2}>
              <Text color="gray">{'Best price'.padEnd(12)}</Text>
              <Text color="green" bold>{getBestPrice(result)}</Text>
            </Box>
          </Box>
        )}

        <Box flexDirection="column" marginBottom={1}>
          <Text bold>SEO Score: <Text color={seoColor(seoScore.total, 100)}>{seoScore.total}/100</Text></Text>
          {(
            [
              ['Length', bd.length, max.length],
              ['TLD', bd.tld, max.tld],
              ['No hyphens/numbers', bd.hyphenNumbers, max.hyphenNumbers],
              ['Pronounceability', bd.pronounceability, max.pronounceability],
              ['Brandability', bd.brandability, max.brandability],
              ['Keywords', bd.keywords, max.keywords],
            ] as [string, number, number][]
          ).map(([label, score, maxScore]) => (
            <Box key={label} marginLeft={2}>
              <Text color="gray">{label.padEnd(22)}</Text>
              <Text color={seoColor(score, maxScore)}>{seoBar(score, maxScore, 10)} </Text>
              <Text color="gray">{score}/{maxScore}</Text>
            </Box>
          ))}
        </Box>

        {status === 'available' ? (
          <Box>
            <Text color="green">Domain is available for registration.</Text>
          </Box>
        ) : whois ? (
          <Box flexDirection="column">
            <Text bold>WHOIS Info</Text>
            {whois.registrar && <Box marginLeft={2}><Text color="gray">{'Registrar'.padEnd(14)}</Text><Text>{whois.registrar}</Text></Box>}
            {whois.registrant && <Box marginLeft={2}><Text color="gray">{'Registrant'.padEnd(14)}</Text><Text>{whois.registrant}</Text></Box>}
            {whois.email && <Box marginLeft={2}><Text color="gray">{'Email'.padEnd(14)}</Text><Text>{whois.email}</Text></Box>}
            {whois.created && <Box marginLeft={2}><Text color="gray">{'Created'.padEnd(14)}</Text><Text>{whois.created}</Text></Box>}
            {whois.expires && <Box marginLeft={2}><Text color="gray">{'Expires'.padEnd(14)}</Text><Text color="yellow">{whois.expires}</Text></Box>}
            {whois.updated && <Box marginLeft={2}><Text color="gray">{'Updated'.padEnd(14)}</Text><Text>{whois.updated}</Text></Box>}
            {whois.nameservers && whois.nameservers.length > 0 && (
              <Box marginLeft={2} flexDirection="column">
                <Text color="gray">Nameservers</Text>
                {whois.nameservers.slice(0, 4).map(ns => (
                  <Box key={ns} marginLeft={2}><Text dimColor>{ns}</Text></Box>
                ))}
              </Box>
            )}
            {whois.status && whois.status.length > 0 && (
              <Box marginLeft={2}>
                <Text color="gray">{'Status'.padEnd(14)}</Text>
                <Text dimColor>{whois.status.slice(0, 2).join(', ')}</Text>
              </Box>
            )}
          </Box>
        ) : (
          <Text color="gray">No WHOIS data available.</Text>
        )}

        <Text> </Text>
        <Text color="gray">[Esc] or [Enter] to go back</Text>
      </Box>
    </Box>
  );
}
