import { describe, expect, it } from "vitest";
import {
  advancePause,
  initialPatrolPause,
  pauseGazeFacing,
  startPatrolPause,
  type PatrolPauseConfig,
} from "../../src/domain/navigation/pauseBehavior";
import { rotateVector, type Vector2 } from "../../src/domain/model/vector";

const CONFIG: PatrolPauseConfig = { pauseMs: 1000, sweepRadians: Math.PI / 3 };
const BASE: Vector2 = { x: 1, y: 0 };

describe("start patrol pause", () => {
  it("enters the paused phase with the configured duration", () => {
    const state = startPatrolPause(BASE, CONFIG);

    expect(state.phase).toBe("paused");
    expect(state.remainingMs).toBe(1000);
    expect(state.totalMs).toBe(1000);
    expect(state.baseFacing).toEqual(BASE);
  });

  it("normalizes the arrival direction as sweep base", () => {
    const state = startPatrolPause({ x: 3, y: 4 }, CONFIG);

    expect(state.baseFacing.x).toBeCloseTo(0.6, 5);
    expect(state.baseFacing.y).toBeCloseTo(0.8, 5);
  });

  it("stores a copy of the base facing", () => {
    const input: Vector2 = { x: 1, y: 0 };
    const state = startPatrolPause(input, CONFIG);

    expect(state.baseFacing).not.toBe(input);
    expect(state.baseFacing).toEqual(input);
  });

  it("rejects a zero arrival direction", () => {
    expect(() => startPatrolPause({ x: 0, y: 0 }, CONFIG)).toThrow("base facing");
  });

  it("rejects invalid configurations", () => {
    expect(() => startPatrolPause(BASE, { pauseMs: Number.NaN, sweepRadians: 1 })).toThrow(
      "Pause duration",
    );
    expect(() => startPatrolPause(BASE, { pauseMs: -1, sweepRadians: 1 })).toThrow(
      "Pause duration",
    );
    expect(() => startPatrolPause(BASE, { pauseMs: 1000, sweepRadians: Number.NaN })).toThrow(
      "Sweep angle",
    );
    expect(() => startPatrolPause(BASE, { pauseMs: 1000, sweepRadians: -1 })).toThrow(
      "Sweep angle",
    );
  });

  it("skips the pause entirely when N is zero", () => {
    const state = startPatrolPause(BASE, { pauseMs: 0, sweepRadians: Math.PI / 3 });

    expect(state.phase).toBe("walking");
    expect(state.remainingMs).toBe(0);
  });

  it("skips the pause entirely when the sweep angle is zero", () => {
    const state = startPatrolPause(BASE, { pauseMs: 1000, sweepRadians: 0 });

    expect(state.phase).toBe("walking");
  });
});

describe("advance pause", () => {
  it("keeps a walking state unchanged", () => {
    const walking = initialPatrolPause();
    const next = advancePause(walking, 250, CONFIG);

    expect(next).toBe(walking);
  });

  it("reduces the remaining time inside the pause", () => {
    const state = startPatrolPause(BASE, CONFIG);
    const next = advancePause(state, 250, CONFIG);

    expect(next.phase).toBe("paused");
    expect(next.remainingMs).toBe(750);
    expect(next.baseFacing).toEqual(state.baseFacing);
  });

  it("returns to walking exactly when time runs out", () => {
    const state = startPatrolPause(BASE, CONFIG);
    const next = advancePause(state, 1000, CONFIG);

    expect(next.phase).toBe("walking");
    expect(next.remainingMs).toBe(0);
    expect(next.totalMs).toBe(0);
  });

  it("clamps an overshooting delta without negative time", () => {
    const state = startPatrolPause(BASE, CONFIG);
    const next = advancePause(state, 1500, CONFIG);

    expect(next.phase).toBe("walking");
    expect(next.remainingMs).toBe(0);
  });

  it("rejects invalid deltas", () => {
    const state = startPatrolPause(BASE, CONFIG);

    expect(() => advancePause(state, Number.NaN, CONFIG)).toThrow("delta time");
    expect(() => advancePause(state, Number.POSITIVE_INFINITY, CONFIG)).toThrow("delta time");
    expect(() => advancePause(state, -1, CONFIG)).toThrow("delta time");
  });
});

describe("pause gaze facing", () => {
  it("returns null while walking", () => {
    const facing = pauseGazeFacing(initialPatrolPause(), CONFIG);

    expect(facing).toBeNull();
  });

  it("starts the sweep at minus the configured angle", () => {
    const state = startPatrolPause(BASE, CONFIG);
    const facing = pauseGazeFacing(state, CONFIG);

    expect(facing).not.toBeNull();
    if (facing) {
      expect(facing.x).toBeCloseTo(Math.cos(-Math.PI / 3), 5);
      expect(facing.y).toBeCloseTo(Math.sin(-Math.PI / 3), 5);
    }
  });

  it("passes through the arrival direction at the midpoint", () => {
    let state = startPatrolPause(BASE, CONFIG);
    state = advancePause(state, 500, CONFIG);
    const facing = pauseGazeFacing(state, CONFIG);

    expect(facing).not.toBeNull();
    if (facing) {
      expect(facing.x).toBeCloseTo(1, 5);
      expect(facing.y).toBeCloseTo(0, 5);
    }
  });

  it("reaches plus the configured angle near the end of the pause", () => {
    let state = startPatrolPause(BASE, CONFIG);
    state = advancePause(state, 999.999999, CONFIG);
    const facing = pauseGazeFacing(state, CONFIG);

    expect(facing).not.toBeNull();
    if (facing) {
      expect(facing.x).toBeCloseTo(Math.cos(Math.PI / 3), 4);
      expect(facing.y).toBeCloseTo(Math.sin(Math.PI / 3), 4);
    }
  });

  it("sweeps symmetrically around the arrival direction", () => {
    const state = startPatrolPause({ x: 0, y: 1 }, { pauseMs: 1000, sweepRadians: Math.PI / 2 });
    const start = pauseGazeFacing(state, { pauseMs: 1000, sweepRadians: Math.PI / 2 });

    expect(start).not.toBeNull();
    if (start) {
      expect(start.x).toBeCloseTo(1, 5);
      expect(start.y).toBeCloseTo(0, 5);
    }
  });

  it("rejects an invalid configuration", () => {
    const state = startPatrolPause(BASE, CONFIG);

    expect(() => pauseGazeFacing(state, { pauseMs: Number.NaN, sweepRadians: 1 })).toThrow(
      "Pause duration",
    );
  });
});

describe("rotate vector", () => {
  it("rotates a cardinal direction by a quarter turn", () => {
    const rotated = rotateVector({ x: 1, y: 0 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(1, 5);
  });

  it("preserves the vector length", () => {
    const rotated = rotateVector({ x: 3, y: 4 }, Math.PI / 3);

    expect(Math.hypot(rotated.x, rotated.y)).toBeCloseTo(5, 5);
  });

  it("returns to the original orientation after a full turn", () => {
    const rotated = rotateVector({ x: 1, y: 0 }, 2 * Math.PI);

    expect(rotated.x).toBeCloseTo(1, 5);
    expect(rotated.y).toBeCloseTo(0, 5);
  });

  it("rejects a non-finite angle", () => {
    expect(() => rotateVector({ x: 1, y: 0 }, Number.NaN)).toThrow("finite");
  });
});