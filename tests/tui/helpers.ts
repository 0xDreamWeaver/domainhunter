/** Raw byte sequences for simulating terminal keypresses via stdin.write(). */
export const ESC   = '\x1b';
export const ENTER = '\r';
export const TAB   = '\t';
export const LEFT  = '\x1b[D';
export const RIGHT = '\x1b[C';
export const UP    = '\x1b[A';
export const DOWN  = '\x1b[B';
export const SPACE = ' ';

/**
 * Yield enough event-loop turns for React 18 to flush deferred useEffect calls.
 * Two setImmediate rounds is sufficient in Node/Bun.
 */
export const flush = () =>
  new Promise<void>(resolve => setImmediate(() => setImmediate(resolve)));
