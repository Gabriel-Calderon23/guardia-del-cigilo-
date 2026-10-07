import { describe, expect, it } from "vitest";
import type { AlertLevel } from "../../src/domain/perception/alert";
import { VISION_STYLES, visionStyleFor } from "../../src/game/presentation/visionStyle";

const LEVELS: readonly AlertLevel[] = ["patrol", "suspicion", "alert"];

describe("vision style", () => {
  it("maps every alert level to a style", () => {
    for (const level of LEVELS) {
      expect(visionStyleFor(level)).toEqual(VISION_STYLES[level]);
    }
    expect(Object.keys(VISION_STYLES).sort()).toEqual([...LEVELS].sort());
  });

  it("keeps patrol green as the current detection colour", () => {
    expect(VISION_STYLES.patrol.color).toBe(0x73c991);
  });

  it("uses yellow for suspicion and red for alert", () => {
    expect(VISION_STYLES.suspicion.color).toBe(0xf2c94c);
    expect(VISION_STYLES.alert.color).toBe(0xe16969);
  });

  it("uses three distinct colours", () => {
    const colors = LEVELS.map((level) => VISION_STYLES[level].color);
    expect(new Set(colors).size).toBe(LEVELS.length);
  });

  it("keeps alpha within the visible range", () => {
    for (const level of LEVELS) {
      expect(VISION_STYLES[level].alpha).toBeGreaterThanOrEqual(0);
      expect(VISION_STYLES[level].alpha).toBeLessThanOrEqual(1);
    }
  });
});
