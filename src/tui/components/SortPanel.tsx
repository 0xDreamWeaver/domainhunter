import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SortConfig, SortField, SortDirection } from '../../types.js';

interface SortPanelProps {
  sort: SortConfig;
  onApply: (sort: SortConfig) => void;
  onCancel: () => void;
}

const FIELDS: { label: string; value: SortField }[] = [
  { label: 'Name', value: 'name' },
  { label: 'Status', value: 'status' },
  { label: 'Price', value: 'price' },
  { label: 'SEO Score', value: 'seo' },
];

const DIRECTIONS: { label: string; value: SortDirection }[] = [
  { label: 'Ascending ↑', value: 'asc' },
  { label: 'Descending ↓', value: 'desc' },
];

type Section = 'primary-field' | 'primary-dir' | 'secondary-field' | 'secondary-dir';

export default function SortPanel({ sort, onApply, onCancel }: SortPanelProps) {
  const [primaryField, setPrimaryField] = useState<SortField>(sort.primary.field);
  const [primaryDir, setPrimaryDir] = useState<SortDirection>(sort.primary.direction);
  const [secondaryField, setSecondaryField] = useState<SortField | null>(sort.secondary?.field ?? null);
  const [secondaryDir, setSecondaryDir] = useState<SortDirection>(sort.secondary?.direction ?? 'asc');
  const [section, setSection] = useState<Section>('primary-field');

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (key.return) {
      const sections: Section[] = ['primary-field', 'primary-dir', 'secondary-field', 'secondary-dir'];
      const idx = sections.indexOf(section);
      if (idx === sections.length - 1) {
        onApply({
          primary: { field: primaryField, direction: primaryDir },
          secondary: secondaryField
            ? { field: secondaryField, direction: secondaryDir }
            : undefined,
        });
      } else {
        setSection(sections[idx + 1] ?? 'primary-field');
      }
      return;
    }

    if (key.tab) {
      const sections: Section[] = ['primary-field', 'primary-dir', 'secondary-field', 'secondary-dir'];
      const idx = sections.indexOf(section);
      setSection(sections[(idx + 1) % sections.length] ?? 'primary-field');
      return;
    }

    const isLeft = key.leftArrow || input === 'h';
    const isRight = key.rightArrow || input === 'l';

    if (section === 'primary-field') {
      const idx = FIELDS.findIndex(f => f.value === primaryField);
      if (isLeft) setPrimaryField(FIELDS[Math.max(0, idx - 1)]?.value ?? primaryField);
      if (isRight) setPrimaryField(FIELDS[Math.min(FIELDS.length - 1, idx + 1)]?.value ?? primaryField);
    }

    if (section === 'primary-dir') {
      if (isLeft || isRight) setPrimaryDir(d => d === 'asc' ? 'desc' : 'asc');
    }

    if (section === 'secondary-field') {
      const options: Array<SortField | null> = [null, ...FIELDS.map(f => f.value)];
      const idx = options.indexOf(secondaryField);
      if (isLeft) setSecondaryField(options[Math.max(0, idx - 1)] ?? null);
      if (isRight) setSecondaryField(options[Math.min(options.length - 1, idx + 1)] ?? null);
    }

    if (section === 'secondary-dir') {
      if (isLeft || isRight) setSecondaryDir(d => d === 'asc' ? 'desc' : 'asc');
    }
  });

  const isActive = (s: Section) => section === s;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      width={52}
    >
      <Text bold color="yellow">Sort Domains</Text>
      <Text> </Text>

      <Text bold>Primary Sort</Text>
      <Box marginLeft={2} marginBottom={1} flexDirection="column">
        <Text color={isActive('primary-field') ? 'cyan' : 'white'}>
          {isActive('primary-field') ? '> ' : '  '}Field: {' '}
          {FIELDS.map(f => (
            <Text key={f.value} color={primaryField === f.value ? 'cyan' : 'gray'}>
              {primaryField === f.value ? `[${f.label}] ` : `${f.label} `}
            </Text>
          ))}
        </Text>
        <Text color={isActive('primary-dir') ? 'cyan' : 'white'}>
          {isActive('primary-dir') ? '> ' : '  '}Direction:{' '}
          {DIRECTIONS.map(d => (
            <Text key={d.value} color={primaryDir === d.value ? 'cyan' : 'gray'}>
              {primaryDir === d.value ? `[${d.label}] ` : `${d.label} `}
            </Text>
          ))}
        </Text>
      </Box>

      <Text bold>Secondary Sort (optional)</Text>
      <Box marginLeft={2} flexDirection="column">
        <Text color={isActive('secondary-field') ? 'cyan' : 'white'}>
          {isActive('secondary-field') ? '> ' : '  '}Field:{' '}
          <Text color={secondaryField == null ? 'cyan' : 'gray'}>{secondaryField == null ? '[none] ' : 'none '}</Text>
          {FIELDS.map(f => (
            <Text key={f.value} color={secondaryField === f.value ? 'cyan' : 'gray'}>
              {secondaryField === f.value ? `[${f.label}] ` : `${f.label} `}
            </Text>
          ))}
        </Text>
        {secondaryField && (
          <Text color={isActive('secondary-dir') ? 'cyan' : 'white'}>
            {isActive('secondary-dir') ? '> ' : '  '}Direction:{' '}
            {DIRECTIONS.map(d => (
              <Text key={d.value} color={secondaryDir === d.value ? 'cyan' : 'gray'}>
                {secondaryDir === d.value ? `[${d.label}] ` : `${d.label} `}
              </Text>
            ))}
          </Text>
        )}
      </Box>

      <Text> </Text>
      <Text color="gray">[Tab] next  [←→] change  [Enter] apply  [Esc] cancel</Text>
    </Box>
  );
}
