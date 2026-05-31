import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { AvailabilityStatus } from '../../types.js';

interface ExistingDomain {
  name: string;
  status: AvailabilityStatus;
}

interface DomainInputProps {
  onSubmit: (domains: string[]) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  existingDomains?: ExistingDomain[];
}

const STATUS_ICON: Record<AvailabilityStatus, string> = {
  available: '✓',
  taken: '✗',
  checking: '…',
  unknown: '?',
  error: '!',
};
const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  available: 'green',
  taken: 'red',
  checking: 'yellow',
  unknown: 'gray',
  error: 'red',
};

const EXISTING_SHOW_MAX = 8;

export default function DomainInput({
  onSubmit,
  onCancel,
  showCancel = false,
  existingDomains = [],
}: DomainInputProps) {
  const [value, setValue] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const existingNames = new Set(existingDomains.map(d => d.name.toLowerCase()));

  useInput((_input, key) => {
    if (key.escape && onCancel) {
      onCancel();
      return;
    }
    if (key.ctrl && _input === 'd') {
      const all = [...lines, ...(value.trim() ? [value.trim()] : [])];
      if (all.length) onSubmit(all);
    }
  });

  const handleChange = (v: string) => {
    setValue(v);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();

    if (!trimmed) {
      if (lines.length) onSubmit(lines);
      return;
    }

    const parts = trimmed.split(/[\s,]+/).filter(Boolean);

    if (parts.length > 1) {
      // Multi-paste: skip duplicates, report them
      const dupes: string[] = [];
      const fresh: string[] = [];
      for (const p of parts) {
        const lower = p.toLowerCase();
        if (existingNames.has(lower) || lines.map(l => l.toLowerCase()).includes(lower)) {
          dupes.push(p);
        } else {
          fresh.push(p);
        }
      }
      if (fresh.length) setLines(l => [...l, ...fresh]);
      setErrorMsg(
        dupes.length
          ? `Skipped (already in list): ${dupes.join(', ')}`
          : null
      );
      setValue('');
      return;
    }

    // Single domain
    const lower = trimmed.toLowerCase();
    if (existingNames.has(lower)) {
      setErrorMsg(`${trimmed} is already in your list`);
      setValue('');
      return;
    }
    if (lines.map(l => l.toLowerCase()).includes(lower)) {
      setErrorMsg(`${trimmed} is already queued`);
      setValue('');
      return;
    }

    setErrorMsg(null);
    setLines(l => [...l, trimmed]);
    setValue('');
  };

  const shown = existingDomains.slice(0, EXISTING_SHOW_MAX);
  const overflow = existingDomains.length - EXISTING_SHOW_MAX;
  const isAddMode = existingDomains.length > 0;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">DomainHunter</Text>
      <Text> </Text>

      {isAddMode && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray">
            {existingDomains.length} domain{existingDomains.length !== 1 ? 's' : ''} already in your list:
          </Text>
          <Box flexDirection="column" marginLeft={2}>
            {shown.map(d => (
              <Box key={d.name}>
                <Text color={STATUS_COLOR[d.status]}>{STATUS_ICON[d.status]} </Text>
                <Text color="gray">{d.name}</Text>
              </Box>
            ))}
            {overflow > 0 && (
              <Text dimColor>  …and {overflow} more</Text>
            )}
          </Box>
        </Box>
      )}

      <Text>Enter {isAddMode ? 'additional ' : ''}domain names to check:</Text>
      <Text color="gray">One per line, or comma-separated. Empty line or Ctrl+D to start.</Text>
      <Text> </Text>

      {lines.map((line, i) => (
        <Box key={i} marginLeft={2}>
          <Text color="green">+ </Text>
          <Text>{line}</Text>
        </Box>
      ))}

      <Box marginLeft={2} marginTop={lines.length > 0 ? 1 : 0}>
        <Text color="cyan">› </Text>
        <TextInput
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="example.com"
        />
      </Box>

      <Text> </Text>

      {errorMsg && (
        <Box marginLeft={2}>
          <Text color="red">✗ {errorMsg}</Text>
        </Box>
      )}

      {lines.length > 0 && (
        <Text color="gray">
          {lines.length} domain{lines.length !== 1 ? 's' : ''} queued
          {' · '}Empty line or Ctrl+D to start
        </Text>
      )}

      {showCancel && onCancel && (
        <Text color="gray">[Esc] cancel</Text>
      )}
    </Box>
  );
}
