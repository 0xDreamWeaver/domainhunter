import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { FilterConfig, StatusFilter } from '../../types.js';

interface FilterPanelProps {
  filter: FilterConfig;
  onApply: (filter: FilterConfig) => void;
  onCancel: () => void;
}

type FocusField = 'status' | 'maxPrice' | 'minSeo';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'available', 'taken'];

export default function FilterPanel({ filter, onApply, onCancel }: FilterPanelProps) {
  const [status, setStatus] = useState<StatusFilter>(filter.status);
  const [maxPrice, setMaxPrice] = useState(filter.maxPrice?.toString() ?? '');
  const [minSeo, setMinSeo] = useState(filter.minSeo?.toString() ?? '');
  const [focus, setFocus] = useState<FocusField>('status');

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (key.return) {
      if (focus === 'status') {
        setFocus('maxPrice');
      } else if (focus === 'maxPrice') {
        setFocus('minSeo');
      } else {
        onApply({
          status,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
          minSeo: minSeo ? parseInt(minSeo, 10) : null,
        });
      }
      return;
    }

    if (focus === 'status') {
      const idx = STATUS_OPTIONS.indexOf(status);
      if (key.leftArrow || input === 'h') {
        setStatus(STATUS_OPTIONS[Math.max(0, idx - 1)] ?? status);
      } else if (key.rightArrow || input === 'l') {
        setStatus(STATUS_OPTIONS[Math.min(STATUS_OPTIONS.length - 1, idx + 1)] ?? status);
      }
    }

    if (key.tab) {
      const fields: FocusField[] = ['status', 'maxPrice', 'minSeo'];
      const idx = fields.indexOf(focus);
      setFocus(fields[(idx + 1) % fields.length] ?? 'status');
    }
  });

  const fieldStyle = (field: FocusField) => ({
    color: focus === field ? 'cyan' : 'white',
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={50}
    >
      <Text bold color="cyan">Filter Domains</Text>
      <Text> </Text>

      <Box flexDirection="column" marginBottom={1}>
        <Text {...fieldStyle('status')}>
          {focus === 'status' ? '> ' : '  '}Availability:
        </Text>
        <Box marginLeft={4}>
          {STATUS_OPTIONS.map(opt => (
            <Box key={opt} marginRight={2}>
              <Text color={status === opt ? 'cyan' : 'gray'}>
                {status === opt ? '◉' : '○'} {opt}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text {...fieldStyle('maxPrice')}>
          {focus === 'maxPrice' ? '> ' : '  '}Max Price ($):
        </Text>
        <Box marginLeft={4}>
          {focus === 'maxPrice' ? (
            <TextInput
              value={maxPrice}
              onChange={setMaxPrice}
              placeholder="no limit"
            />
          ) : (
            <Text color="gray">{maxPrice || 'no limit'}</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text {...fieldStyle('minSeo')}>
          {focus === 'minSeo' ? '> ' : '  '}Min SEO Score (0–100):
        </Text>
        <Box marginLeft={4}>
          {focus === 'minSeo' ? (
            <TextInput
              value={minSeo}
              onChange={setMinSeo}
              placeholder="no minimum"
            />
          ) : (
            <Text color="gray">{minSeo || 'no minimum'}</Text>
          )}
        </Box>
      </Box>

      <Text> </Text>
      <Text color="gray">[Tab] next field  [←→] toggle  [Enter] apply  [Esc] cancel</Text>
    </Box>
  );
}
