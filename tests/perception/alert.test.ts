import { describe, expect, it } from "vitest";
import { evaluateAlertLevel } from "../../src/domain/perception/alert";

const CONFIG = { suspicionWindowMs: 2000 };

const BASE = {
  visionVisible: false,
  soundHeard: false,
  memoryAgeMs: null,
};

describe("alert level", () => {
  it("raises alert when vision is valid", () => {
    expect(evaluateAlertLevel({ ...BASE, visionVisible: true }, CONFIG)).toBe("alert");
  });

  it("prioritizes vision over sound and memory", () => {
    expect(
      evaluateAlertLevel(
        { visionVisible: true, soundHeard: true, memoryAgeMs: 0 },
        CONFIG,
      ),
    ).toBe("alert");
  });

  it("raises suspicion on a heard sound without vision", () => {
    expect(evaluateAlertLevel({ ...BASE, soundHeard: true }, CONFIG)).toBe("suspicion");
  });

  it("raises suspicion while memory is within the window", () => {
    expect(evaluateAlertLevel({ ...BASE, memoryAgeMs: 1999 }, CONFIG)).toBe("suspicion");
  });

  it("includes the window boundary as suspicion", () => {
    expect(evaluateAlertLevel({ ...BASE, memoryAgeMs: 2000 }, CONFIG)).toBe("suspicion");
  });

  it("returns patrol once memory is older than the window", () => {
    expect(evaluateAlertLevel({ ...BASE, memoryAgeMs: 2001 }, CONFIG)).toBe("patrol");
  });

  it("returns patrol without any signal", () => {
    expect(evaluateAlertLevel(BASE, CONFIG)).toBe("patrol");
  });

  it("treats a zero-width window as boundary-only", () => {
    expect(evaluateAlertLevel({ ...BASE, memoryAgeMs: 0 }, { suspicionWindowMs: 0 })).toBe(
      "suspicion",
    );
    expect(evaluateAlertLevel({ ...BASE, memoryAgeMs: 1 }, { suspicionWindowMs: 0 })).toBe(
      "patrol",
    );
  });

  it("keeps suspicion on sound even when memory is stale", () => {
    expect(
      evaluateAlertLevel({ ...BASE, soundHeard: true, memoryAgeMs: 99999 }, CONFIG),
    ).toBe("suspicion");
  });

  it("rejects invalid configuration and signals", () => {
    expect(() => evaluateAlertLevel(BASE, { suspicionWindowMs: Number.NaN })).toThrow(
      "Suspicion window",
    );
    expect(() => evaluateAlertLevel(BASE, { suspicionWindowMs: -1 })).toThrow(
      "Suspicion window",
    );
    expect(() => evaluateAlertLevel({ ...BASE, memoryAgeMs: Number.NaN }, CONFIG)).toThrow(
      "Memory age",
    );
    expect(() => evaluateAlertLevel({ ...BASE, memoryAgeMs: -5 }, CONFIG)).toThrow(
      "Memory age",
    );
  });
});
