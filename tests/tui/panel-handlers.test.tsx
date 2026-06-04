/**
 * Panel keyboard tests.
 *
 * Each panel uses useInput() directly (canonical Ink pattern).
 * We simulate keypresses via stdin.write() with raw byte sequences.
 * Always await flush() after render before the first keypress (React 18
 * defers useEffect, which is when useInput registers its listener).
 * Await flush() between keypresses that cause re-renders.
 */
import React from 'react';
import { describe, test, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import FilterPanel from '../../src/tui/components/FilterPanel.js';
import SortPanel from '../../src/tui/components/SortPanel.js';
import ExportModal from '../../src/tui/components/ExportModal.js';
import ColumnPanel from '../../src/tui/components/ColumnPanel.js';
import type { FilterConfig, SortConfig, ColumnConfig } from '../../src/types.js';
import { ESC, ENTER, TAB, LEFT, RIGHT, DOWN, SPACE, flush } from './helpers.js';

const DEFAULT_FILTER: FilterConfig = { status: 'all', maxPrice: null, minSeo: null };
const DEFAULT_SORT: SortConfig = { primary: { field: 'seo', direction: 'asc' } };
const DEFAULT_COLUMNS: ColumnConfig = { price: true, seo: true, registered: false };

// ---------------------------------------------------------------------------
// FilterPanel
// ---------------------------------------------------------------------------

describe('FilterPanel', () => {
  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { stdin } = render(
      <FilterPanel filter={DEFAULT_FILTER} onApply={() => {}} onCancel={onCancel} />
    );
    await flush();
    stdin.write(ESC);
    await flush();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter advances focus: status → maxPrice → minSeo → apply', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { stdin } = render(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(ENTER); await flush(); // status → maxPrice
    stdin.write(ENTER); await flush(); // maxPrice → minSeo
    stdin.write(ENTER); await flush(); // minSeo → apply

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('all');
    expect(applied.maxPrice).toBeNull();
    expect(applied.minSeo).toBeNull();
  });

  test('right arrow on status field selects "available"', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { stdin } = render(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(RIGHT); await flush(); // status: all → available
    stdin.write(ENTER); await flush(); // → maxPrice
    stdin.write(ENTER); await flush(); // → minSeo
    stdin.write(ENTER); await flush(); // apply

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('available');
  });

  test('right arrow twice on status field selects "taken"', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { stdin } = render(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(RIGHT); await flush();
    stdin.write(RIGHT); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('taken');
  });

  test('Tab changes focus and updates display', async () => {
    const { stdin, lastFrame } = render(
      <FilterPanel filter={DEFAULT_FILTER} onApply={() => {}} onCancel={() => {}} />
    );
    await flush();
    const before = lastFrame();
    stdin.write(TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// SortPanel
// ---------------------------------------------------------------------------

describe('SortPanel', () => {
  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { stdin } = render(
      <SortPanel sort={DEFAULT_SORT} onApply={() => {}} onCancel={onCancel} />
    );
    await flush();
    stdin.write(ESC);
    await flush();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter through all sections applies sort', async () => {
    const onApply = mock((_s: SortConfig) => {});
    const { stdin } = render(
      <SortPanel sort={DEFAULT_SORT} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    // 4 sections: primary-field → primary-dir → secondary-field → secondary-dir → apply
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [SortConfig])[0];
    expect(applied.primary.field).toBe('seo');
    expect(applied.primary.direction).toBe('asc');
  });

  test('left arrow on primary-field moves to previous field', async () => {
    const onApply = mock((_s: SortConfig) => {});
    const { stdin } = render(
      <SortPanel sort={DEFAULT_SORT} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    // Default field is 'seo' (idx 3). Left → 'price' (idx 2).
    stdin.write(LEFT); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();
    stdin.write(ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [SortConfig])[0];
    expect(applied.primary.field).toBe('price');
  });

  test('Tab cycles sections and updates display', async () => {
    const { stdin, lastFrame } = render(
      <SortPanel sort={DEFAULT_SORT} onApply={() => {}} onCancel={() => {}} />
    );
    await flush();
    const before = lastFrame();
    stdin.write(TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// ExportModal
// ---------------------------------------------------------------------------

describe('ExportModal', () => {
  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { stdin } = render(
      <ExportModal onExport={() => {}} onCancel={onCancel} />
    );
    await flush();
    stdin.write(ESC);
    await flush();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('right arrow changes selected format from CSV to Excel', async () => {
    const { stdin, lastFrame } = render(
      <ExportModal onExport={() => {}} onCancel={() => {}} />
    );
    await flush();
    stdin.write(RIGHT);
    await flush();
    expect(lastFrame()).toContain('[Excel]');
  });

  test('Enter on format section moves to path focus', async () => {
    const { stdin, lastFrame } = render(
      <ExportModal onExport={() => {}} onCancel={() => {}} />
    );
    await flush();
    const before = lastFrame();
    stdin.write(ENTER);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });

  test('Tab switches between format and path', async () => {
    const { stdin, lastFrame } = render(
      <ExportModal onExport={() => {}} onCancel={() => {}} />
    );
    await flush();
    const before = lastFrame();
    stdin.write(TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// ColumnPanel
// ---------------------------------------------------------------------------

describe('ColumnPanel', () => {
  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={() => {}} onCancel={onCancel} />
    );
    await flush();
    stdin.write(ESC);
    await flush();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter applies unchanged config', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(ENTER);
    await flush();
    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied).toEqual(DEFAULT_COLUMNS);
  });

  test('Space toggles the focused option (price off)', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(SPACE); await flush(); // toggle price (cursor at idx 0, price=true→false)
    stdin.write(ENTER);  await flush();

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.price).toBe(false);
    expect(applied.seo).toBe(true);
  });

  test('j moves cursor down, Space toggles correct option', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(DOWN);  await flush(); // cursor 0 → 1 (seo)
    stdin.write(SPACE); await flush(); // toggle seo (true→false)
    stdin.write(ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.price).toBe(true);
    expect(applied.seo).toBe(false);
  });

  test('navigate to registered column and enable it', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    stdin.write(DOWN);  await flush(); // 0 → 1
    stdin.write(DOWN);  await flush(); // 1 → 2 (registered)
    stdin.write(SPACE); await flush(); // registered: false→true
    stdin.write(ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.registered).toBe(true);
  });

  test('cursor does not go below last option', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { stdin } = render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} />
    );
    await flush();
    for (let i = 0; i < 10; i++) {
      stdin.write(DOWN); await flush();
    }
    stdin.write(SPACE); await flush(); // should toggle registered (idx 2, clamped)
    stdin.write(ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.registered).toBe(true);
    expect(applied.seo).toBe(true);
  });
});
