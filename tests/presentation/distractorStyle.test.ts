import { describe, expect, it } from "vitest";
import {
  DISTRACTOR_STYLE,
  distractorOriginLabel,
} from "../../src/game/presentation/distractorStyle";

describe("distractor style", () => {
  it("keeps marker and ring colours within the 0xRRGGBB range", () => {
    expect(DISTRACTOR_STYLE.markerColor).toBeGreaterThanOrEqual(0);
    expect(DISTRACTOR_STYLE.markerColor).toBeLessThanOrEqual(0xffffff);
    expect(DISTRACTOR_STYLE.ringColor).toBeGreaterThanOrEqual(0);
    expect(DISTRACTOR_STYLE.ringColor).toBeLessThanOrEqual(0xffffff);
  });

  it("keeps alpha, radius and line width within valid ranges", () => {
    expect(DISTRACTOR_STYLE.markerAlpha).toBeGreaterThanOrEqual(0);
    expect(DISTRACTOR_STYLE.markerAlpha).toBeLessThanOrEqual(1);
    expect(DISTRACTOR_STYLE.ringAlpha).toBeGreaterThanOrEqual(0);
    expect(DISTRACTOR_STYLE.ringAlpha).toBeLessThanOrEqual(1);
    expect(DISTRACTOR_STYLE.markerRadius).toBeGreaterThan(0);
    expect(DISTRACTOR_STYLE.ringLineWidth).toBeGreaterThan(0);
  });

  it("formats the origin label from a cell", () => {
    expect(distractorOriginLabel({ x: 3, y: 2 })).toBe("3,2");
    expect(distractorOriginLabel({ x: 27, y: 17 })).toBe("27,17");
  });

  it("uses a dash when there is no origin", () => {
    expect(distractorOriginLabel(null)).toBe("-");
  });

  it("rejects a non-integer origin cell", () => {
    expect(() => distractorOriginLabel({ x: 1.5, y: 2 })).toThrow("integer");
  });
});