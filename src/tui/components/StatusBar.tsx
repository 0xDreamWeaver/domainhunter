import React from 'react';
import { Box, Text } from 'ink';
import type { CheckResult } from '../../types.js';

interface StatusBarProps {
  results: CheckResult[];
  checkingCount: number;
  mode: string;
}

export default function StatusBar({ results, checkingCount, mode }: StatusBarProps) {
  const available = results.filter(r => r.status === 'available').length;
  const taken = results.filter(r => r.status === 'taken').length;
  const total = results.length;

  return (
    <Box justifyContent="space-between">
      <Box>
        <Text color="gray">
          {total} domain{total !== 1 ? 's' : ''}
        </Text>
        {available > 0 && (
          <Text color="green"> · {available} available</Text>
        )}
        {taken > 0 && (
          <Text color="red"> · {taken} taken</Text>
        )}
        {checkingCount > 0 && (
          <Text color="yellow"> · {checkingCount} checking…</Text>
        )}
      </Box>

      {mode === 'results' && (
        <Text color="gray">
          [↑↓] navigate  [f] filter  [s] sort  [x] export  [Enter] detail  [i] add  [q] quit
        </Text>
      )}
    </Box>
  );
}
