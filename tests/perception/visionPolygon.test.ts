import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import { computeVisionPolygon } from "../../src/domain/perception/visionPolygon";

const OPEN_MAP = createGridMap(20, 20, []);
const BASE = {
  map: OPEN_MAP,
  tileSize: 10,
  observer: { x: 15, y: 15 },
  facing: { x: 1, y: 0 },
  range: 50,
  fieldOfViewRadians: Math.PI / 2,
  rayCount: 5,
};

describe("vision polygon", () => {
  it("starts at the observer and samples one point per ray", () => {
    const polygon = computeVisionPolygon(BASE);

    expect(polygon).toHaveLength(BASE.rayCount + 1);
    expect(polygon[0]).toEqual({ x: 15, y: 15 });
  });

  it("keeps every ray at full range in the open field", () => {
    const polygon = computeVisionPolygon({ ...BASE, observer: { x: 105, y: 105 } });

    for (const point of polygon.slice(1)) {
      expect(Math.hypot(point.x - 105, point.y - 105)).toBeCloseTo(50, 5);
    }
  });

  it("clips the central ray at the near face of a wall", () => {
    const map = createGridMap(20, 20, [{ x: 3, y: 1 }]);
    const polygon = computeVisionPolygon({ ...BASE, map });

    expect(polygon[3]).toEqual({ x: 30, y: 15 });
  });

  it("applies the conservative corner rule to the diagonal ray", () => {
    const map = createGridMap(8, 8, [{ x: 2, y: 1 }]);
    const polygon = computeVisionPolygon({
      ...BASE,
      map,
      range: 100,
      rayCount: 3,
    });

    expect(polygon[3]?.x).toBeCloseTo(20, 5);
    expect(polygon[3]?.y).toBeCloseTo(20, 5);
  });

  it("collapses to a ray when the field of view is zero", () => {
    const polygon = computeVisionPolygon({ ...BASE, fieldOfViewRadians: 0 });
    const points = polygon.slice(1);

    for (const point of points) {
      expect(point).toEqual(points[0]);
    }
  });

  it("rejects invalid configuration", () => {
    expect(() => computeVisionPolygon({ ...BASE, range: -1 })).toThrow("Vision polygon");
    expect(() => computeVisionPolygon({ ...BASE, fieldOfViewRadians: Math.PI * 3 })).toThrow(
      "Vision polygon",
    );
    expect(() => computeVisionPolygon({ ...BASE, tileSize: 0 })).toThrow("Vision polygon");
    expect(() => computeVisionPolygon({ ...BASE, rayCount: 1 })).toThrow("Ray count");
    expect(() => computeVisionPolygon({ ...BASE, facing: { x: 0, y: 0 } })).toThrow("Facing");
  });
});
