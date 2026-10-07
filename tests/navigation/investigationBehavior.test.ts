import { describe, expect, it } from "vitest";
import {
  advanceInvestigation,
  arriveAtInvestigationTarget,
  initialInvestigation,
  shouldCancelInvestigation,
  shouldStartInvestigation,
  startInvestigation,
} from "../../src/domain/navigation/investigationBehavior";

const CONFIG = { inspectMs: 1500 };

describe("investigation behavior", () => {
  it("starts traveling to the target cell", () => {
    expect(startInvestigation({ x: 5, y: 3 }, CONFIG)).toEqual({
      phase: "traveling",
      targetCell: { x: 5, y: 3 },
      remainingMs: 0,
      totalMs: CONFIG.inspectMs,
    });
  });

  it("arrives and begins inspecting with the configured duration", () => {
    const arrived = arriveAtInvestigationTarget(
      startInvestigation({ x: 5, y: 3 }, CONFIG),
      CONFIG,
    );

    expect(arrived.phase).toBe("inspecting");
    expect(arrived.remainingMs).toBe(CONFIG.inspectMs);
    expect(arrived.totalMs).toBe(CONFIG.inspectMs);
    expect(arrived.targetCell).toEqual({ x: 5, y: 3 });
  });

  it("does not advance while idle or traveling", () => {
    expect(advanceInvestigation(initialInvestigation(), 10, CONFIG).phase).toBe("idle");
    expect(
      advanceInvestigation(startInvestigation({ x: 1, y: 1 }, CONFIG), 10, CONFIG).phase,
    ).toBe("traveling");
  });

  it("returns to idle once the inspection time elapses", () => {
    const inspecting = arriveAtInvestigationTarget(
      startInvestigation({ x: 1, y: 1 }, CONFIG),
      CONFIG,
    );
    const partial = advanceInvestigation(inspecting, 1000, CONFIG);

    expect(partial.phase).toBe("inspecting");
    expect(partial.remainingMs).toBe(500);
    expect(advanceInvestigation(partial, 500, CONFIG)).toEqual(initialInvestigation());
  });

  it("clamps an overshoot to idle", () => {
    const inspecting = arriveAtInvestigationTarget(
      startInvestigation({ x: 1, y: 1 }, CONFIG),
      CONFIG,
    );

    expect(advanceInvestigation(inspecting, 2000, CONFIG)).toEqual(initialInvestigation());
  });

  it("skips inspection entirely when inspectMs is zero", () => {
    const config = { inspectMs: 0 };
    const started = startInvestigation({ x: 1, y: 1 }, config);

    expect(arriveAtInvestigationTarget(started, config)).toEqual(initialInvestigation());
  });

  it("starts only from idle, without vision, and with a heard sound", () => {
    const signals = {
      visionVisible: false,
      soundHeard: true,
    };

    expect(shouldStartInvestigation(initialInvestigation(), {
      visionVisible: false,
      soundHeard: true,
    })).toBe(true);
    expect(shouldStartInvestigation(initialInvestigation(), {
      visionVisible: true,
      soundHeard: true,
    })).toBe(false);
    expect(shouldStartInvestigation(initialInvestigation(), {
      visionVisible: false,
      soundHeard: false,
    })).toBe(false);
    expect(
      shouldStartInvestigation(startInvestigation({ x: 1, y: 1 }, CONFIG), signals),
    ).toBe(false);
  });

  it("cancels an active investigation on vision only", () => {
    const signals = { visionVisible: true };
    const traveling = startInvestigation({ x: 1, y: 1 }, CONFIG);

    expect(shouldCancelInvestigation(traveling, signals)).toBe(true);
    expect(shouldCancelInvestigation(traveling, { visionVisible: false })).toBe(false);
    expect(shouldCancelInvestigation(initialInvestigation(), signals)).toBe(false);
  });

  it("rejects invalid configuration, target and delta", () => {
    expect(() => startInvestigation({ x: 1, y: 1 }, { inspectMs: -1 })).toThrow("inspect");
    expect(() => startInvestigation({ x: 1.5, y: 1 }, CONFIG)).toThrow("integer");
    expect(() =>
      advanceInvestigation(
        arriveAtInvestigationTarget(startInvestigation({ x: 1, y: 1 }, CONFIG), CONFIG),
        Number.NaN,
        CONFIG,
      ),
    ).toThrow("delta");
  });
});