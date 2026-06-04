import type { StateStorage } from "zustand/middleware";

/**
 * localStorage-backed storage that transparently adopts data written under a
 * previous key. The app was renamed Noor → Mubin, which changed the persistence
 * key prefix (`noor.*` → `mubin.*`). On first read under the new key we copy any
 * legacy value across (and drop the old key) so existing users keep their
 * bookmarks, learning progress, and settings instead of starting from scratch.
 */
export function renamedLocalStorage(legacyKey: string): StateStorage {
  return {
    getItem: (name) => {
      if (typeof localStorage === "undefined") return null;
      const current = localStorage.getItem(name);
      if (current !== null) return current;

      const legacy = localStorage.getItem(legacyKey);
      if (legacy !== null) {
        localStorage.setItem(name, legacy);
        localStorage.removeItem(legacyKey);
        return legacy;
      }
      return null;
    },
    setItem: (name, value) => {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(name, value);
    },
    removeItem: (name) => {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(name);
    },
  };
}
