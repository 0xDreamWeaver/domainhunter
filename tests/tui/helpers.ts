import type { Key } from 'ink';

/** Build a Key object with all fields defaulted to false. */
export function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  };
}

export const ESC   = makeKey({ escape: true });
export const ENTER = makeKey({ return: true });
export const TAB   = makeKey({ tab: true });
export const LEFT  = makeKey({ leftArrow: true });
export const RIGHT = makeKey({ rightArrow: true });
export const UP    = makeKey({ upArrow: true });
export const DOWN  = makeKey({ downArrow: true });

/**
 * Yield enough event-loop turns for React to flush deferred useEffect calls.
 * React 18 schedules effects via MessageChannel (microtask) then processes them
 * in a subsequent macrotask.  Two setImmediate rounds is sufficient in Node/Bun.
 */
export const flush = () =>
  new Promise<void>(resolve => setImmediate(() => setImmediate(resolve)));
