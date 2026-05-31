import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ColumnConfig } from '../../types.js';

interface ColumnPanelProps {
  columns: ColumnConfig;
  onApply: (columns: ColumnConfig) => void;
  onCancel: () => void;
}

const OPTIONS: { key: keyof ColumnConfig; label: string; desc: string }[] = [
  { key: 'price', label: 'Best Price', desc: 'Lowest registrar price' },
  { key: 'seo', label: 'SEO Score', desc: 'Visual score bar + number' },
  { key: 'registered', label: 'Registered', desc: 'Registration date (taken domains)' },
];

export default function ColumnPanel({ columns, onApply, onCancel }: ColumnPanelProps) {
  const [local, setLocal] = useState<ColumnConfig>({ ...columns });
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }
    if (key.return) { onApply(local); return; }

    if (key.upArrow || input === 'k') {
      setCursor(c => Math.max(0, c - 1));
    }
    if (key.downArrow || input === 'j') {
      setCursor(c => Math.min(OPTIONS.length - 1, c + 1));
    }
    if (input === ' ') {
      const opt = OPTIONS[cursor];
      if (opt) setLocal(prev => ({ ...prev, [opt.key]: !prev[opt.key] }));
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
      width={46}
    >
      <Text bold color="blue">Configure Columns</Text>
      <Text> </Text>
      <Text color="gray">Domain and Status are always visible.</Text>
      <Text> </Text>
      {OPTIONS.map((opt, i) => (
        <Box key={opt.key} marginBottom={0}>
          <Text color={cursor === i ? 'cyan' : 'white'}>
            {cursor === i ? '> ' : '  '}
            <Text color={local[opt.key] ? 'green' : 'gray'}>
              {local[opt.key] ? '[x]' : '[ ]'}
            </Text>
            {' '}{opt.label}
          </Text>
          <Text color="gray">  {opt.desc}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text color="gray">[↑↓/jk] move  [Space] toggle  [Enter] apply  [Esc] cancel</Text>
    </Box>
  );
}
