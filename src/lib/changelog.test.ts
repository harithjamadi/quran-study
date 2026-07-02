import { describe, it, expect } from "vitest";
import { RELEASES } from "./changelog";
import { APP_VERSION, compareVersions } from "./app-version";

describe("changelog", () => {
  it("APP_VERSION (app-version.ts) matches the newest release entry", () => {
    // APP_VERSION is a literal in its own module so every-page consumers
    // don't bundle the release history — this pins the two together.
    expect(RELEASES[0].version).toBe(APP_VERSION);
  });

  it("releases are ordered newest-first", () => {
    for (let i = 1; i < RELEASES.length; i++) {
      expect(
        compareVersions(RELEASES[i - 1].version, RELEASES[i].version)
      ).toBeGreaterThan(0);
    }
  });
});
