/**
 * Panel handler tests.
 *
 * Each panel exposes its keyboard logic by calling onRegisterHandler(fn) in a
 * useEffect.  React 18 defers useEffect until after "paint", so we must
 * flush() after render before the handler is available.  Likewise, any press()
 * that causes internal state changes re-registers the handler in the next
 * render cycle — we flush() between presses that drive navigation.
 */
import React from 'react';
import { describe, test, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import type { Key } from 'ink';
import FilterPanel from '../../src/tui/components/FilterPanel.js';
import SortPanel from '../../src/tui/components/SortPanel.js';
import ExportModal from '../../src/tui/components/ExportModal.js';
import ColumnPanel from '../../src/tui/components/ColumnPanel.js';
import type { FilterConfig, SortConfig, ColumnConfig } from '../../src/types.js';
import { ESC, ENTER, TAB, LEFT, RIGHT, DOWN, makeKey, flush } from './helpers.js';

const DEFAULT_FILTER: FilterConfig = { status: 'all', maxPrice: null, minSeo: null };
const DEFAULT_SORT: SortConfig = { primary: { field: 'seo', direction: 'asc' } };
const DEFAULT_COLUMNS: ColumnConfig = { price: true, seo: true, registered: false };

/**
 * Render a panel component and return a press() helper that always invokes
 * the most-recently registered handler.  Callers must await flush() before
 * the first press to allow the initial useEffect to run.
 */
function mountPanel<P extends { onRegisterHandler: (h: (i: string, k: Key) => void) => void }>(
  element: React.ReactElement<P>
) {
  let currentHandler: (input: string, key: Key) => void = () => {};
  const registerFn = (h: (input: string, key: Key) => void) => { currentHandler = h; };
  const cloned = React.cloneElement(element, { onRegisterHandler: registerFn } as Partial<P>);
  const result = render(cloned);
  return {
    ...result,
    press: (input: string, key: Key) => currentHandler(input, key),
    registerFn,
  };
}

// ---------------------------------------------------------------------------
// FilterPanel
// ---------------------------------------------------------------------------

describe('FilterPanel', () => {
  test('registers a handler after mount', async () => {
    const registerFn = mock((_h: (i: string, k: Key) => void) => {});
    render(
      <FilterPanel
        filter={DEFAULT_FILTER}
        onApply={() => {}}
        onCancel={() => {}}
        onRegisterHandler={registerFn}
      />
    );
    await flush();
    expect(registerFn).toHaveBeenCalled();
    expect(typeof (registerFn.mock.calls[0] as [(i: string, k: Key) => void])[0]).toBe('function');
  });

  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { press } = mountPanel(
      <FilterPanel filter={DEFAULT_FILTER} onApply={() => {}} onCancel={onCancel} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ESC);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter advances focus: status → maxPrice → minSeo → apply', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { press } = mountPanel(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ENTER); await flush(); // status → maxPrice
    press('', ENTER); await flush(); // maxPrice → minSeo
    press('', ENTER); await flush(); // minSeo → apply

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('all');
    expect(applied.maxPrice).toBeNull();
    expect(applied.minSeo).toBeNull();
  });

  test('right arrow on status field selects "available"', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { press } = mountPanel(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('l', makeKey({ rightArrow: true })); await flush(); // status: all → available
    press('', ENTER); await flush(); // → maxPrice
    press('', ENTER); await flush(); // → minSeo
    press('', ENTER); await flush(); // apply

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('available');
  });

  test('right arrow twice on status field selects "taken"', async () => {
    const onApply = mock((_f: FilterConfig) => {});
    const { press } = mountPanel(
      <FilterPanel filter={DEFAULT_FILTER} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('l', makeKey({ rightArrow: true })); await flush();
    press('l', makeKey({ rightArrow: true })); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [FilterConfig])[0];
    expect(applied.status).toBe('taken');
  });

  test('Tab changes focus and re-renders', async () => {
    const { press, lastFrame } = mountPanel(
      <FilterPanel filter={DEFAULT_FILTER} onApply={() => {}} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    const before = lastFrame();
    press('', TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });

  test('re-registers handler when focus changes', async () => {
    let callCount = 0;
    let currentHandler: (i: string, k: Key) => void = () => {};
    render(
      <FilterPanel
        filter={DEFAULT_FILTER}
        onApply={() => {}}
        onCancel={() => {}}
        onRegisterHandler={(h) => { callCount++; currentHandler = h; }}
      />
    );
    await flush();
    const countAfterMount = callCount;
    currentHandler('', ENTER); // focus: status → maxPrice → triggers re-render + re-register
    await flush();
    expect(callCount).toBeGreaterThan(countAfterMount);
  });
});

// ---------------------------------------------------------------------------
// SortPanel
// ---------------------------------------------------------------------------

describe('SortPanel', () => {
  test('registers a handler after mount', async () => {
    const registerFn = mock((_h: (i: string, k: Key) => void) => {});
    render(
      <SortPanel sort={DEFAULT_SORT} onApply={() => {}} onCancel={() => {}} onRegisterHandler={registerFn} />
    );
    await flush();
    expect(registerFn).toHaveBeenCalled();
  });

  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { press } = mountPanel(
      <SortPanel sort={DEFAULT_SORT} onApply={() => {}} onCancel={onCancel} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ESC);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter through all sections applies sort', async () => {
    const onApply = mock((_s: SortConfig) => {});
    const { press } = mountPanel(
      <SortPanel sort={DEFAULT_SORT} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    // 4 sections: primary-field → primary-dir → secondary-field → secondary-dir → apply
    press('', ENTER); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [SortConfig])[0];
    expect(applied.primary.field).toBe('seo');
    expect(applied.primary.direction).toBe('asc');
  });

  test('left arrow on primary-field moves to previous field', async () => {
    const onApply = mock((_s: SortConfig) => {});
    const { press } = mountPanel(
      <SortPanel sort={DEFAULT_SORT} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    // Default field is 'seo' (idx 3). Left → 'price' (idx 2).
    press('h', makeKey({ leftArrow: true })); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();
    press('', ENTER); await flush();

    const applied = (onApply.mock.calls[0] as [SortConfig])[0];
    expect(applied.primary.field).toBe('price');
  });

  test('Tab cycles sections', async () => {
    const { press, lastFrame } = mountPanel(
      <SortPanel sort={DEFAULT_SORT} onApply={() => {}} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    const before = lastFrame();
    press('', TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// ExportModal
// ---------------------------------------------------------------------------

describe('ExportModal', () => {
  test('registers a handler after mount', async () => {
    const registerFn = mock((_h: (i: string, k: Key) => void) => {});
    render(
      <ExportModal onExport={() => {}} onCancel={() => {}} onRegisterHandler={registerFn} />
    );
    await flush();
    expect(registerFn).toHaveBeenCalled();
  });

  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { press } = mountPanel(
      <ExportModal onExport={() => {}} onCancel={onCancel} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ESC);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('right arrow changes selected format from CSV to Excel', async () => {
    const { press, lastFrame } = mountPanel(
      <ExportModal onExport={() => {}} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('l', makeKey({ rightArrow: true }));
    await flush();
    expect(lastFrame()).toContain('[Excel]');
  });

  test('Enter on format section moves to path, re-registers handler', async () => {
    let callCount = 0;
    let currentHandler: (i: string, k: Key) => void = () => {};
    render(
      <ExportModal
        onExport={() => {}}
        onCancel={() => {}}
        onRegisterHandler={(h) => { callCount++; currentHandler = h; }}
      />
    );
    await flush();
    const countAfterMount = callCount;
    currentHandler('', ENTER); // format → path focus change → re-render + re-register
    await flush();
    expect(callCount).toBeGreaterThan(countAfterMount);
  });

  test('Tab switches between format and path', async () => {
    const { press, lastFrame } = mountPanel(
      <ExportModal onExport={() => {}} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    const before = lastFrame();
    press('', TAB);
    await flush();
    expect(lastFrame()).not.toBe(before);
  });
});

// ---------------------------------------------------------------------------
// ColumnPanel
// ---------------------------------------------------------------------------

describe('ColumnPanel', () => {
  test('registers a handler after mount', async () => {
    const registerFn = mock((_h: (i: string, k: Key) => void) => {});
    render(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={() => {}} onCancel={() => {}} onRegisterHandler={registerFn} />
    );
    await flush();
    expect(registerFn).toHaveBeenCalled();
  });

  test('Esc calls onCancel', async () => {
    const onCancel = mock(() => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={() => {}} onCancel={onCancel} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ESC);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Enter applies unchanged config', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('', ENTER);
    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied).toEqual(DEFAULT_COLUMNS);
  });

  test('Space toggles the focused option (price off)', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press(' ', makeKey()); await flush(); // toggle price (cursor at idx 0, price=true→false)
    press('', ENTER);

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.price).toBe(false);
    expect(applied.seo).toBe(true);
  });

  test('j moves cursor down, Space toggles correct option', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('j', DOWN); await flush(); // cursor 0 → 1 (seo)
    press(' ', makeKey()); await flush(); // toggle seo (true→false)
    press('', ENTER);

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.price).toBe(true);
    expect(applied.seo).toBe(false);
  });

  test('navigate to registered column and enable it', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    press('j', DOWN); await flush(); // 0 → 1
    press('j', DOWN); await flush(); // 1 → 2 (registered)
    press(' ', makeKey()); await flush(); // registered: false→true
    press('', ENTER);

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.registered).toBe(true);
  });

  test('cursor does not go below last option', async () => {
    const onApply = mock((_c: ColumnConfig) => {});
    const { press } = mountPanel(
      <ColumnPanel columns={DEFAULT_COLUMNS} onApply={onApply} onCancel={() => {}} onRegisterHandler={() => {}} />
    );
    await flush();
    // Press down many times (only 3 options: idx 0,1,2)
    for (let i = 0; i < 10; i++) {
      press('j', DOWN); await flush();
    }
    press(' ', makeKey()); await flush(); // should toggle registered (idx 2)
    press('', ENTER);

    const applied = (onApply.mock.calls[0] as [ColumnConfig])[0];
    expect(applied.registered).toBe(true);
    expect(applied.seo).toBe(true); // not accidentally toggled
  });
});
