import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface DomainInputProps {
  onSubmit: (domains: string[]) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function DomainInput({ onSubmit, onCancel, showCancel = false }: DomainInputProps) {
  const [value, setValue] = useState('');
  const [lines, setLines] = useState<string[]>([]);

  useInput((_input, key) => {
    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    if (key.ctrl && _input === 'd') {
      const all = [...lines, ...(value.trim() ? [value.trim()] : [])];
      if (all.length) onSubmit(all);
      return;
    }
  });

  const handleSubmit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      // Empty line = done entering
      const all = [...lines];
      if (all.length) onSubmit(all);
      return;
    }

    // Support pasting multiple comma/space/newline-separated domains
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length > 1) {
      setLines(l => [...l, ...parts]);
      setValue('');
    } else {
      setLines(l => [...l, trimmed]);
      setValue('');
    }
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">DomainHunter</Text>
      <Text> </Text>
      <Text>Enter domain names to check (one per line, or comma-separated):</Text>
      <Text color="gray">Press Enter after each domain. Empty line or Ctrl+D to start checking.</Text>
      <Text> </Text>

      {lines.map((line, i) => (
        <Box key={i} marginLeft={2}>
          <Text color="green">✓ </Text>
          <Text>{line}</Text>
        </Box>
      ))}

      <Box marginLeft={2} marginTop={lines.length > 0 ? 1 : 0}>
        <Text color="cyan">› </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="example.com"
        />
      </Box>

      <Text> </Text>
      {lines.length > 0 && (
        <Text color="gray">{lines.length} domain{lines.length !== 1 ? 's' : ''} queued · Empty line to start · Ctrl+D to start</Text>
      )}
      {showCancel && onCancel && (
        <Text color="gray">[Esc] cancel</Text>
      )}
    </Box>
  );
}
