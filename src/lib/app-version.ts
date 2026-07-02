/**
 * Current app version — kept as a literal in its own tiny module so the
 * footer and version store (loaded on every page) don't drag the full
 * bilingual changelog into the shared client bundle. A changelog test pins
 * this to `RELEASES[0].version`; update both together when cutting a release.
 */
export const APP_VERSION = "0.11.0";

/**
 * Compare two dotted version strings. Returns a negative number if `a < b`,
 * positive if `a > b`, and 0 if equal. Tolerant of differing segment counts.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
