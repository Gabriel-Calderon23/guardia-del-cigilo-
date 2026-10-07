import { describe, expect, it } from "vitest";
import { LAB_MAP } from "../../src/application/simulation/labLevel";
import {
  canToggleDoor,
  withDoorState,
  type DoorToggleResult,
} from "../../src/domain/model/door";
import {
  createGridMap,
  isWalkable,
  type GridMap,
  type GridPoint,
} from "../../src/domain/model/grid";
import { findPathAStar, findPathBfs } from "../../src/domain/navigation/search";

// Celda-puerta designada por la spec del upgrade (se exporta como DOOR_CELL
// en labLevel en un incremento posterior).
const DOOR_CELL: GridPoint = { x: 6, y: 10 };

function expectOk(result: DoorToggleResult): GridMap {
  if (!result.ok) {
    throw new Error(`Expected a successful door toggle, got ${result.reason}.`);
  }
  return result.map;
}

describe("withDoorState", () => {
  it("returns a new map with the cell blocked without mutating the original", () => {
    const map = createGridMap(5, 5, []);

    const closed = expectOk(withDoorState(map, { x: 2, y: 2 }, true));

    expect(closed).not.toBe(map);
    expect(closed.blocked).not.toBe(map.blocked);
    expect(isWalkable(closed, { x: 2, y: 2 })).toBe(false);
    expect(isWalkable(map, { x: 2, y: 2 })).toBe(true);
    expect(map.blocked.size).toBe(0);
  });

  it("reopens the cell on the way back", () => {
    const map = createGridMap(5, 5, []);

    const closed = expectOk(withDoorState(map, { x: 2, y: 2 }, true));
    const reopened = expectOk(withDoorState(closed, { x: 2, y: 2 }, false));

    expect(isWalkable(reopened, { x: 2, y: 2 })).toBe(true);
    expect(reopened.blocked.size).toBe(0);
  });

  it("keeps the other blocked cells intact", () => {
    const map = createGridMap(5, 5, [{ x: 1, y: 1 }]);

    const closed = expectOk(withDoorState(map, { x: 2, y: 2 }, true));

    expect(isWalkable(closed, { x: 1, y: 1 })).toBe(false);
    expect(isWalkable(closed, { x: 2, y: 2 })).toBe(false);
    expect(closed.blocked.size).toBe(2);
  });

  it("fails explicitly when the cell is outside the map", () => {
    const map = createGridMap(5, 5, []);

    for (const cell of [
      { x: -1, y: 0 },
      { x: 5, y: 0 },
      { x: 0, y: 5 },
      { x: 1.5, y: 1 },
      { x: Number.NaN, y: 0 },
    ]) {
      expect(withDoorState(map, cell, true)).toEqual({
        ok: false,
        reason: "out-of-bounds",
      });
    }
    expect(map.blocked.size).toBe(0);
  });

  it("does not mutate LAB_MAP when closing the door cell", () => {
    const sizeBefore = LAB_MAP.blocked.size;

    const closed = expectOk(withDoorState(LAB_MAP, DOOR_CELL, true));

    expect(isWalkable(closed, DOOR_CELL)).toBe(false);
    expect(isWalkable(LAB_MAP, DOOR_CELL)).toBe(true);
    expect(LAB_MAP.blocked.size).toBe(sizeBefore);
    expect(closed.blocked.size).toBe(sizeBefore + 1);
  });
});

describe("canToggleDoor", () => {
  const map = createGridMap(5, 5, []);
  const cell: GridPoint = { x: 2, y: 2 };

  it("allows toggling an empty cell", () => {
    expect(canToggleDoor(map, cell, [])).toBe("ok");
  });

  it("accepts occupants in other cells", () => {
    expect(canToggleDoor(map, cell, [{ x: 0, y: 1 }, { x: 4, y: 4 }])).toBe("ok");
  });

  it("rejects the close when the guard or the player occupy the cell", () => {
    expect(canToggleDoor(map, cell, [{ x: 0, y: 1 }, cell])).toBe("occupied");
    expect(canToggleDoor(map, cell, [cell])).toBe("occupied");
  });

  it("allows opening a closed cell without occupants", () => {
    const closed = expectOk(withDoorState(map, cell, true));

    expect(canToggleDoor(closed, cell, [])).toBe("ok");
  });

  it("rejects cells outside the map", () => {
    expect(canToggleDoor(map, { x: -1, y: 0 }, [])).toBe("out-of-bounds");
    expect(canToggleDoor(map, { x: 0.5, y: 0 }, [])).toBe("out-of-bounds");
  });
});

describe.each([
  ["BFS", findPathBfs],
  ["A*", findPathAStar],
] as const)("%s with a toggled door", (_name, findPath) => {
  const gapMap = createGridMap(5, 5, [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 3 },
  ]);
  const west: GridPoint = { x: 0, y: 2 };
  const east: GridPoint = { x: 4, y: 2 };
  const gapDoor: GridPoint = { x: 2, y: 2 };

  it("routes through the open door cell", () => {
    const result = findPath(gapMap, west, east);

    expect(result.status).toBe("success");
    expect(result.totalCost).toBe(4);
    expect(result.path).toContainEqual(gapDoor);
  });

  it("avoids the closed door cell", () => {
    const closed = expectOk(withDoorState(gapMap, gapDoor, true));

    const result = findPath(closed, west, east);

    expect(result.status).toBe("success");
    expect(result.totalCost).toBe(8);
    expect(result.path).not.toContainEqual(gapDoor);
    expect(result.path.every((point) => isWalkable(closed, point))).toBe(true);
    expect(isWalkable(gapMap, gapDoor)).toBe(true);
  });

  it("reports an unreachable goal when closing severs the only connection", () => {
    const split = createGridMap(3, 3, [{ x: 1, y: 0 }, { x: 1, y: 2 }]);
    const start: GridPoint = { x: 0, y: 1 };
    const goal: GridPoint = { x: 2, y: 1 };

    expect(findPath(split, start, goal).status).toBe("success");

    const closed = expectOk(withDoorState(split, { x: 1, y: 1 }, true));
    const result = findPath(closed, start, goal);

    expect(result.status).toBe("unreachable");
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBeNull();
  });

  it("reports invalid-goal when the destination is the closed door", () => {
    const map = createGridMap(5, 5, []);
    const goal: GridPoint = { x: 3, y: 3 };
    const closed = expectOk(withDoorState(map, goal, true));

    const result = findPath(closed, { x: 0, y: 0 }, goal);

    expect(result.status).toBe("invalid-goal");
    expect(result.expandedNodes).toBe(0);
  });
});
