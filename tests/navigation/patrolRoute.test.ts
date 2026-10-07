import { describe, expect, it } from "vitest";
import {
  GUARD_START,
  LAB_MAP,
  PATROL_POINTS,
} from "../../src/application/simulation/labLevel";
import { isWalkable, type GridPoint } from "../../src/domain/model/grid";
import { nextPatrolPoint } from "../../src/domain/navigation/patrolRoute";
import { findPathAStar } from "../../src/domain/navigation/search";

describe("patrol route", () => {
  it("cycles to the next point and wraps to the start", () => {
    const points: readonly GridPoint[] = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];

    expect(nextPatrolPoint(points, 0)).toEqual({ x: 2, y: 2 });
    expect(nextPatrolPoint(points, 1)).toEqual({ x: 3, y: 3 });
    expect(nextPatrolPoint(points, 2)).toEqual({ x: 1, y: 1 });
  });

  it("supports a single-point route without error", () => {
    const points: readonly GridPoint[] = [{ x: 4, y: 4 }];

    expect(nextPatrolPoint(points, 0)).toEqual({ x: 4, y: 4 });
  });

  it("returns a copy so callers cannot mutate the route", () => {
    const points: readonly GridPoint[] = [{ x: 1, y: 1 }];
    const next = nextPatrolPoint(points, 0);

    expect(next).toEqual({ x: 1, y: 1 });
    expect(next).not.toBe(points[0]);
  });

  it("rejects an empty route", () => {
    expect(() => nextPatrolPoint([], 0)).toThrow("Patrol route");
  });

  it("rejects an invalid current index", () => {
    const points: readonly GridPoint[] = [{ x: 1, y: 1 }];

    expect(() => nextPatrolPoint(points, -1)).toThrow("Patrol index");
    expect(() => nextPatrolPoint(points, 1)).toThrow("Patrol index");
    expect(() => nextPatrolPoint(points, Number.NaN)).toThrow("Patrol index");
  });
});

describe("lab patrol points", () => {
  it("starts at the guard spawn position", () => {
    expect(PATROL_POINTS[0]).toEqual(GUARD_START);
  });

  it("declares at least four walkable control points", () => {
    expect(PATROL_POINTS.length).toBeGreaterThanOrEqual(4);
    for (const point of PATROL_POINTS) {
      expect(isWalkable(LAB_MAP, point)).toBe(true);
    }
  });

  it("keeps every leg of the cycle reachable with A*", () => {
    for (let index = 0; index < PATROL_POINTS.length; index += 1) {
      const from = PATROL_POINTS[index];
      const to = nextPatrolPoint(PATROL_POINTS, index);
      if (!from) {
        throw new Error(`Patrol point ${index} is missing.`);
      }
      const result = findPathAStar(LAB_MAP, from, to);

      expect({ from, to, status: result.status }, `leg ${index}`).toEqual({
        from,
        to,
        status: "success",
      });
    }
  });
});