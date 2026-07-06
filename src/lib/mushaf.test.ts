import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPageRows, GRID_ROWS, type MushafPage, type MushafRow } from "./mushaf";

function loadPage(p: number): MushafPage {
  const file = join(process.cwd(), "public", "data", "mushaf", `${p}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as MushafPage;
}

const count = (rows: MushafRow[], kind: MushafRow["kind"]) =>
  rows.filter((r) => r.kind === kind).length;

describe("buildPageRows", () => {
  it("pads a normal page to exactly 15 rows", () => {
    for (const p of [50, 77, 187, 300, 604]) {
      const { rows } = buildPageRows(loadPage(p));
      expect(rows.length, `page ${p}`).toBe(GRID_ROWS);
    }
  });

  it("folds the basmalah into the title band when there is only one header slot (p.77)", () => {
    // An-Nisāʾ first ayah is line 2 → a single header slot. The old code forced a
    // separate basmalah line and overflowed the page to 16 rows.
    const { rows } = buildPageRows(loadPage(77));
    expect(rows.length).toBe(15);
    expect(count(rows, "basmalah")).toBe(0);
    const surah = rows.find((r) => r.kind === "surah");
    expect(surah).toEqual({ kind: "surah", surah: 4, withBasmalah: true });
    expect(count(rows, "ayah")).toBe(14);
  });

  it("gives the basmalah its own line when there are two header slots (p.50)", () => {
    const { rows } = buildPageRows(loadPage(50));
    expect(rows.length).toBe(15);
    expect(rows[0]).toEqual({ kind: "surah", surah: 3, withBasmalah: false });
    expect(rows[1]).toEqual({ kind: "basmalah" });
    expect(count(rows, "ayah")).toBe(13);
  });

  it("treats the opening pages 1–2 as centred ornamental pages", () => {
    const p1 = buildPageRows(loadPage(1));
    expect(p1.centeredPage).toBe(true);
    // Al-Fātiḥah has no basmalah line of its own.
    expect(count(p1.rows, "basmalah")).toBe(0);
    expect(count(p1.rows, "ayah")).toBe(7);

    const p2 = buildPageRows(loadPage(2));
    expect(p2.centeredPage).toBe(true);
    expect(count(p2.rows, "surah")).toBe(1);
    expect(count(p2.rows, "basmalah")).toBe(1);
  });

  it("lays out a multi-surah page with one header per surah (p.604)", () => {
    const { rows } = buildPageRows(loadPage(604));
    expect(rows.length).toBe(15);
    expect(count(rows, "surah")).toBe(3); // 112, 113, 114
    expect(count(rows, "basmalah")).toBe(3);
    // The closing line of each surah is centred.
    const centredAyahs = rows.filter((r) => r.kind === "ayah" && r.centered);
    expect(centredAyahs.length).toBeGreaterThanOrEqual(3);
  });

  it("never emits a phantom basmalah for At-Tawbah (surah 9 has none)", () => {
    // Surah 9 begins on page 187.
    const { rows } = buildPageRows(loadPage(187));
    const surah9 = rows.find((r) => r.kind === "surah" && r.surah === 9);
    expect(surah9).toBeTruthy();
    if (surah9 && surah9.kind === "surah") expect(surah9.withBasmalah).toBe(false);
  });
});
