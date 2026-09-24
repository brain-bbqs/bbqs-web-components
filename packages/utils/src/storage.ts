// localStorage that never throws. Private-mode browsers and some embedded webviews reject any
// storage access, and a corrupted value must read as absent rather than crash the app, so every
// app wrapped each of its keys in the same try/catch. These are those wrappers, once.

/** The raw string under `key`, or null when it is absent or storage itself is unavailable. */
export function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Writes `value` under `key`, or removes the key for null. Returns whether the write succeeded;
 * `onError` (default: `console.warn`) hears about a failure so the app can say so.
 */
export function writeStorageItem(
  key: string,
  value: string | null,
  onError: (e: unknown) => void = warn(key),
): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch (e) {
    onError(e);
    return false;
  }
}

function warn(key: string): (e: unknown) => void {
  return (e) => console.warn(`Could not save ${key}:`, e);
}

export interface JsonStore<T> {
  readonly key: string;
  /** The stored record, or null when there is none or it cannot be parsed. */
  load(): T | null;
  /** Stores the record, or clears it for null. */
  save(value: T | null): void;
}

/**
 * A JSON record under one key: the shape every app's `loadStoredSettings`/`saveStoredSettings`
 * pair had. `validate` may reject a parsed value (a stale shape, say) so it reads as absent.
 */
export function createJsonStore<T>(key: string, validate: (parsed: unknown) => parsed is T = isAnything): JsonStore<T> {
  return {
    key,
    load() {
      const raw = readStorageItem(key);
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return validate(parsed) ? parsed : null;
      } catch (e) {
        console.warn(`Could not restore ${key}:`, e);
        return null;
      }
    },
    save(value) {
      writeStorageItem(key, value === null ? null : JSON.stringify(value));
    },
  };
}

function isAnything<T>(parsed: unknown): parsed is T {
  void parsed;
  return true;
}

export interface ChoiceStore<T extends string> {
  readonly key: string;
  readonly values: readonly T[];
  /** The stored choice, or null when none (or an unknown value) is stored. */
  load(): T | null;
  save(value: T): void;
  clear(): void;
}

/**
 * One of a fixed set of strings under a key, such as the "light"/"dark" theme override. `onError`
 * (default: `console.warn` naming the key) hears about a failed write, so an app keeps its own wording.
 */
export function createChoiceStore<T extends string>(
  key: string,
  values: readonly T[],
  onError: (e: unknown) => void = warn(key),
): ChoiceStore<T> {
  return {
    key,
    values,
    load() {
      const raw = readStorageItem(key);
      return raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : null;
    },
    save(value) {
      writeStorageItem(key, value, onError);
    },
    clear() {
      writeStorageItem(key, null, onError);
    },
  };
}

export interface FlagStore {
  readonly key: string;
  load(): boolean;
  save(on: boolean): void;
}

/**
 * A boolean under a key, stored as "1" when on and removed when off, so the default is off.
 * `onError` works as in {@link createChoiceStore}.
 */
export function createFlagStore(key: string, onError: (e: unknown) => void = warn(key)): FlagStore {
  return {
    key,
    load() {
      return readStorageItem(key) === "1";
    },
    save(on) {
      writeStorageItem(key, on ? "1" : null, onError);
    },
  };
}
