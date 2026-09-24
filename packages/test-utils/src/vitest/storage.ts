// Private-mode browsers (and some embedded webviews) throw on any localStorage access, and every
// storage helper in the apps must degrade to its default instead of crashing. This installs that
// condition for a test, without depending on any one test runner's mocking.

const METHODS = ["getItem", "setItem", "removeItem", "clear", "key"] as const;

/**
 * Makes every Storage access (localStorage and sessionStorage alike) throw until the returned
 * function restores the originals.
 *
 * ```ts
 * let restore: () => void;
 * beforeEach(() => (restore = throwingStorage()));
 * afterEach(() => restore());
 * ```
 */
export function throwingStorage(message = "storage disabled"): () => void {
  const proto = Storage.prototype as unknown as Record<(typeof METHODS)[number], () => unknown>;
  const originals = Object.fromEntries(METHODS.map((m) => [m, proto[m]])) as Record<
    (typeof METHODS)[number],
    () => unknown
  >;
  for (const method of METHODS) {
    proto[method] = () => {
      throw new Error(message);
    };
  }
  return () => {
    for (const method of METHODS) proto[method] = originals[method];
  };
}
