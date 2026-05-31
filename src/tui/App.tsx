import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { CheckResult, FilterConfig, SortConfig, ColumnConfig, PipelineOptions } from '../types.js';
import { processDomains, applyFilter, applySort } from '../pipeline/index.js';
import DomainTable from './components/DomainTable.js';
import FilterPanel from './components/FilterPanel.js';
import SortPanel from './components/SortPanel.js';
import ExportModal from './components/ExportModal.js';
import ColumnPanel from './components/ColumnPanel.js';
import DetailView from './components/DetailView.js';
import DomainInput from './components/DomainInput.js';
import StatusBar from './components/StatusBar.js';
import Spinner from './components/Spinner.js';

type AppMode = 'input' | 'processing' | 'results' | 'filter' | 'sort' | 'export' | 'columns' | 'detail';

type ExportFormat = 'csv' | 'excel' | 'json' | 'sheets';

const DEFAULT_FILTER: FilterConfig = { status: 'all', maxPrice: null, minSeo: null };
const DEFAULT_SORT: SortConfig = { primary: { field: 'seo', direction: 'asc' } };
const DEFAULT_COLUMNS: ColumnConfig = { price: true, seo: true, registered: false };

interface AppProps {
  initialDomains?: string[];
  pipelineOptions?: PipelineOptions;
}

export default function App({ initialDomains = [], pipelineOptions = {} }: AppProps) {
  const { exit } = useApp();
  const [mode, setMode] = useState<AppMode>(initialDomains.length > 0 ? 'processing' : 'input');
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [allResults, setAllResults] = useState<CheckResult[]>([]);
  const [checkingDomains, setCheckingDomains] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<FilterConfig>(DEFAULT_FILTER);
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayResults = applySort(applyFilter(allResults, filter), sort);

  const startProcessing = useCallback(async (domains: string[], appendMode = false) => {
    setMode('processing');
    if (!appendMode) setAllResults([]);
    setCheckingDomains(new Set(domains));
    setProgress({ done: 0, total: domains.length });

    await processDomains(domains, pipelineOptions, event => {
      if (event.type === 'start') {
        setProgress({ done: 0, total: event.total });
      } else if (event.type === 'result') {
        setAllResults(prev => {
          const exists = prev.findIndex(r => r.domain.name === event.result!.domain.name);
          if (exists !== -1) {
            const next = [...prev];
            next[exists] = event.result!;
            return next;
          }
          return [...prev, event.result!];
        });
        setCheckingDomains(prev => {
          const next = new Set(prev);
          next.delete(event.result!.domain.name);
          return next;
        });
      } else if (event.type === 'progress') {
        setProgress({ done: event.done, total: event.total });
      } else if (event.type === 'complete') {
        setCheckingDomains(new Set());
        setMode('results');
      }
    });
  }, [pipelineOptions]);

  // Auto-start if domains provided
  useEffect(() => {
    if (initialDomains.length > 0) {
      startProcessing(initialDomains);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = useCallback(async (format: ExportFormat, path: string) => {
    setMode('results');
    try {
      if (format === 'csv') {
        const { exportCsv } = await import('../io/csv.js');
        await exportCsv(displayResults, path);
      } else if (format === 'excel') {
        const { exportExcel } = await import('../io/excel.js');
        await exportExcel(displayResults, path);
      } else if (format === 'json') {
        const { exportJson } = await import('../io/json.js');
        await exportJson(displayResults, path);
      } else if (format === 'sheets') {
        const { exportSheets } = await import('../io/sheets.js');
        await exportSheets(displayResults, path);
      }
      setExportMsg(`✓ Exported to ${path}`);
      setTimeout(() => setExportMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTimeout(() => setError(null), 4000);
    }
  }, [displayResults]);

  useInput((input, key) => {
    if (modeRef.current !== 'results') return;

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (input === 'f') { setMode('filter'); return; }
    if (input === 's') { setMode('sort'); return; }
    if (input === 'c') { setMode('columns'); return; }
    if (input === 'x') { setMode('export'); return; }
    if (input === 'i') { setMode('input'); return; }

    if ((key.return || input === 'l') && displayResults.length > 0) {
      setMode('detail');
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(i => Math.min(displayResults.length - 1, i + 1));
    }
    if (key.pageUp) {
      setSelectedIndex(i => Math.max(0, i - 10));
    }
    if (key.pageDown) {
      setSelectedIndex(i => Math.min(displayResults.length - 1, i + 10));
    }
    if (input === 'g') setSelectedIndex(0);
    if (input === 'G') setSelectedIndex(displayResults.length - 1);
  });

  const Header = () => (
    <Box justifyContent="space-between" marginBottom={1}>
      <Text bold color="cyan">DomainHunter</Text>
      <Box>
        {mode === 'detail'
          ? <Text color="gray">[Esc/Enter] back</Text>
          : <Text color="gray">[f] filter  [s] sort  [c] columns  [x] export  [q] quit</Text>
        }
      </Box>
    </Box>
  );

  if (mode === 'input') {
    return (
      <DomainInput
        onSubmit={allResults.length > 0
          ? (domains) => startProcessing(domains, true)
          : startProcessing}
        onCancel={allResults.length > 0 ? () => setMode('results') : undefined}
        showCancel={allResults.length > 0}
        existingDomains={allResults.map(r => ({ name: r.domain.name, status: r.status }))}
      />
    );
  }

  if (mode === 'processing') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Header />
        <Box>
          <Spinner label={`Checking domains… ${progress.done}/${progress.total}`} />
        </Box>
        {allResults.length > 0 && (
          <Box marginTop={1} flexDirection="column">
            {allResults.slice(-5).map(r => (
              <Box key={r.domain.name}>
                <Text color={r.status === 'available' ? 'green' : r.status === 'taken' ? 'red' : 'gray'}>
                  {r.status === 'available' ? '✓' : r.status === 'taken' ? '✗' : '?'}{' '}
                </Text>
                <Text>{r.domain.name}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />

      {mode === 'filter' && (
        <FilterPanel
          filter={filter}
          onApply={f => { setFilter(f); setSelectedIndex(0); setMode('results'); }}
          onCancel={() => setMode('results')}
        />
      )}

      {mode === 'sort' && (
        <SortPanel
          sort={sort}
          onApply={s => { setSort(s); setSelectedIndex(0); setMode('results'); }}
          onCancel={() => setMode('results')}
        />
      )}

      {mode === 'export' && (
        <ExportModal
          onExport={handleExport}
          onCancel={() => setMode('results')}
        />
      )}

      {mode === 'columns' && (
        <ColumnPanel
          columns={columns}
          onApply={c => { setColumns(c); setMode('results'); }}
          onCancel={() => setMode('results')}
        />
      )}

      {mode === 'detail' && (() => {
        const selected = displayResults[selectedIndex];
        return selected
          ? <DetailView result={selected} onBack={() => setMode('results')} />
          : null;
      })()}

      {mode === 'results' && (
        <>
          {(filter.status !== 'all' || filter.maxPrice != null || filter.minSeo != null) && (
            <Box marginBottom={1}>
              <Text color="yellow">● Filtered: </Text>
              {filter.status !== 'all' && <Text color="yellow">{filter.status} only  </Text>}
              {filter.maxPrice != null && <Text color="yellow">≤${filter.maxPrice}  </Text>}
              {filter.minSeo != null && <Text color="yellow">SEO≥{filter.minSeo}  </Text>}
              <Text color="gray">  ({displayResults.length}/{allResults.length} shown)</Text>
            </Box>
          )}

          <DomainTable
            results={displayResults}
            checkingDomains={checkingDomains}
            selectedIndex={selectedIndex}
            visibleCount={Math.max(5, (process.stdout.rows ?? 24) - 10)}
            columns={columns}
          />
        </>
      )}

      {exportMsg && <Text color="green">{exportMsg}</Text>}
      {error && <Text color="red">Error: {error}</Text>}

      <StatusBar
        results={allResults}
        checkingCount={checkingDomains.size}
        mode={mode}
      />
    </Box>
  );
}
