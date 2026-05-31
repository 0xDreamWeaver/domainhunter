import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

type ExportFormat = 'csv' | 'excel' | 'json' | 'sheets';

interface ExportModalProps {
  onExport: (format: ExportFormat, path: string) => void;
  onCancel: () => void;
}

const FORMATS: { label: string; value: ExportFormat; ext: string }[] = [
  { label: 'CSV', value: 'csv', ext: '.csv' },
  { label: 'Excel', value: 'excel', ext: '.xlsx' },
  { label: 'JSON', value: 'json', ext: '.json' },
  { label: 'Google Sheets', value: 'sheets', ext: '' },
];

export default function ExportModal({ onExport, onCancel }: ExportModalProps) {
  const [formatIdx, setFormatIdx] = useState(0);
  const [path, setPath] = useState('');
  const [focus, setFocus] = useState<'format' | 'path'>('format');

  const selectedFormat = FORMATS[formatIdx]!;

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (key.tab) {
      setFocus(f => f === 'format' ? 'path' : 'format');
      return;
    }

    if (key.return) {
      if (focus === 'format') {
        const defaultPath = selectedFormat.value === 'sheets'
          ? ''
          : `domains${selectedFormat.ext}`;
        setPath(p => p || defaultPath);
        setFocus('path');
      } else {
        if (path.trim()) onExport(selectedFormat.value, path.trim());
      }
      return;
    }

    if (focus === 'format') {
      if (key.leftArrow || input === 'h') setFormatIdx(i => Math.max(0, i - 1));
      if (key.rightArrow || input === 'l') setFormatIdx(i => Math.min(FORMATS.length - 1, i + 1));
    }
  });

  const placeholder = selectedFormat.value === 'sheets'
    ? 'Spreadsheet ID or URL'
    : `domains${selectedFormat.ext}`;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={2}
      paddingY={1}
      width={54}
    >
      <Text bold color="magenta">Export Results</Text>
      <Text> </Text>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focus === 'format' ? 'cyan' : 'white'}>
          {focus === 'format' ? '▶ ' : '  '}Format:
        </Text>
        <Box marginLeft={4}>
          {FORMATS.map((f, i) => (
            <Box key={f.value} marginRight={2}>
              <Text color={formatIdx === i ? 'cyan' : 'gray'}>
                {formatIdx === i ? `[${f.label}]` : f.label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color={focus === 'path' ? 'cyan' : 'white'}>
          {focus === 'path' ? '▶ ' : '  '}
          {selectedFormat.value === 'sheets' ? 'Spreadsheet:' : 'Output file:'}
        </Text>
        <Box marginLeft={4}>
          {focus === 'path' ? (
            <TextInput value={path} onChange={setPath} placeholder={placeholder} />
          ) : (
            <Text color="gray">{path || placeholder}</Text>
          )}
        </Box>
      </Box>

      <Text> </Text>
      <Text color="gray">[Tab] switch  [←→] format  [Enter] confirm  [Esc] cancel</Text>
    </Box>
  );
}
