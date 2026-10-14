import { useEffect, useState } from "react";

const PREFIX = "paperpulse:";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === "function" ? (initial as () => T)() : initial;
    return readStored(key, fallback);
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage may be full or disabled (private mode); the app keeps working in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function clearPersistentState() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) && k !== `${PREFIX}theme`)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
