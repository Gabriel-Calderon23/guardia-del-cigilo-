import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import {
  DISTRACTOR_CONFIG,
  canActivateDistractor,
  createDistractorSoundEvent,
} from "../../src/domain/perception/distractor";
import { evaluateSound } from "../../src/domain/perception/perception";

const OPEN_MAP = createGridMap(8, 8, []);

describe("distractor", () => {
  it("emits a sound event at the cell centre that the guard can hear", () => {
    const event = createDistractorSoundEvent(
      OPEN_MAP,
      { x: 3, y: 2 },
      10,
      DISTRACTOR_CONFIG,
      100,
    );

    expect(event).toEqual({
      position: { x: 35, y: 25 },
      radius: DISTRACTOR_CONFIG.radius,
      emittedAtMs: 100,
      durationMs: DISTRACTOR_CONFIG.durationMs,
    });
    expect(evaluateSound({ x: 35, y: 25 }, event, 100).heard).toBe(true);
    expect(evaluateSound({ x: 1000, y: 1000 }, event, 100).heard).toBe(false);
  });

  it("reuses the player sound parameters by default", () => {
    expect(DISTRACTOR_CONFIG).toEqual({ radius: 190, durationMs: 800, cooldownMs: 500 });
  });

  it("blocks reactivation until the cooldown elapses", () => {
    expect(canActivateDistractor(null, 100, DISTRACTOR_CONFIG)).toBe(true);
    expect(canActivateDistractor(100, 599, DISTRACTOR_CONFIG)).toBe(false);
    expect(canActivateDistractor(100, 600, DISTRACTOR_CONFIG)).toBe(true);
  });

  it("honours a zero cooldown", () => {
    const config = { ...DISTRACTOR_CONFIG, cooldownMs: 0 };
    expect(canActivateDistractor(100, 100, config)).toBe(true);
  });

  it("fails explicitly on a blocked or out-of-bounds cell", () => {
    const map = createGridMap(4, 4, [{ x: 1, y: 1 }]);

    expect(() =>
      createDistractorSoundEvent(map, { x: 1, y: 1 }, 10, DISTRACTOR_CONFIG, 0),
    ).toThrow("walkable");
    expect(() =>
      createDistractorSoundEvent(map, { x: 9, y: 9 }, 10, DISTRACTOR_CONFIG, 0),
    ).toThrow("walkable");
  });

  it("rejects invalid configuration and non-finite times", () => {
    expect(() =>
      createDistractorSoundEvent(
        OPEN_MAP,
        { x: 0, y: 0 },
        10,
        { ...DISTRACTOR_CONFIG, radius: -1 },
        0,
      ),
    ).toThrow("Distractor radius");
    expect(() =>
      createDistractorSoundEvent(OPEN_MAP, { x: 0, y: 0 }, 10, DISTRACTOR_CONFIG, Number.NaN),
    ).toThrow("Distractor emission time");
    expect(() => canActivateDistractor(null, Number.NaN, DISTRACTOR_CONFIG)).toThrow(
      "Distractor activation time",
    );
    expect(() => canActivateDistractor(Number.NaN, 0, DISTRACTOR_CONFIG)).toThrow(
      "Last distractor activation time",
    );
  });
});
