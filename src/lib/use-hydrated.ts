"use client";

import { useState, useEffect } from "react";

/**
 * Returns true once the component has mounted on the client.
 * Essential for components that depend on client-side state (like localStorage)
 * to avoid hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);
  return hydrated;
}
