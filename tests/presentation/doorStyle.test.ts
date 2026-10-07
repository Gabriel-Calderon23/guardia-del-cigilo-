import { describe, expect, it } from "vitest";
import {
  DOOR_STYLE,
  doorStateLabel,
} from "../../src/game/presentation/doorStyle";

describe("door style", () => {
  it("keeps the cell and marker colours within the 0xRRGGBB range", () => {
    expect(DOOR_STYLE.openCellColor).toBeGreaterThanOrEqual(0);
    expect(DOOR_STYLE.openCellColor).toBeLessThanOrEqual(0xffffff);
    expect(DOOR_STYLE.closedCellColor).toBeGreaterThanOrEqual(0);
    expect(DOOR_STYLE.closedCellColor).toBeLessThanOrEqual(0xffffff);
    expect(DOOR_STYLE.markerColor).toBeGreaterThanOrEqual(0);
    expect(DOOR_STYLE.markerColor).toBeLessThanOrEqual(0xffffff);
  });

  it("keeps the marker line width positive", () => {
    expect(DOOR_STYLE.markerLineWidth).toBeGreaterThan(0);
  });

  it("formats the label as puerta @6,10: ABIERTA when the door is open", () => {
    expect(doorStateLabel({ x: 6, y: 10 }, false)).toBe("puerta @6,10: ABIERTA");
  });

  it("formats the label as puerta @6,10: CERRADA when the door is closed", () => {
    expect(doorStateLabel({ x: 6, y: 10 }, true)).toBe("puerta @6,10: CERRADA");
  });

  it("rejects a non-integer door cell", () => {
    expect(() => doorStateLabel({ x: 6.5, y: 10 }, true)).toThrow("integer");
  });
});