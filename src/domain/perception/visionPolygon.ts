import type { GridMap } from "../model/grid";
import { assertFiniteVector, normalized, type Vector2 } from "../model/vector";
import { traceVisionRay } from "./perception";

export interface VisionPolygonInput {
  readonly map: GridMap;
  readonly tileSize: number;
  readonly observer: Vector2;
  readonly facing: Vector2;
  readonly range: number;
  readonly fieldOfViewRadians: number;
  /** Cantidad de rayos, incluidos ambos bordes. Entero mayor o igual a 2. */
  readonly rayCount: number;
}

/**
 * Construye el polígono del cono de visión recortado por las paredes.
 *
 * El primer punto es el observador (vértice) y los siguientes son el extremo
 * de cada rayo. Sólo depende de la geometría del dominio: no conoce Phaser ni
 * el DOM, de modo que puede probarse en Node y reutilizarse en cualquier
 * representación.
 */
export function computeVisionPolygon(input: VisionPolygonInput): readonly Vector2[] {
  assertValidInput(input);
  const facing = normalized(input.facing);
  if (!facing) {
    throw new Error("Facing vector must be non-zero.");
  }

  const facingAngle = Math.atan2(facing.y, facing.x);
  const halfFieldOfView = input.fieldOfViewRadians / 2;
  const step = input.fieldOfViewRadians === 0
    ? 0
    : input.fieldOfViewRadians / (input.rayCount - 1);

  const polygon: Vector2[] = [{ x: input.observer.x, y: input.observer.y }];
  for (let index = 0; index < input.rayCount; index += 1) {
    const angle = facingAngle - halfFieldOfView + step * index;
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const target = {
      x: input.observer.x + directionX * input.range,
      y: input.observer.y + directionY * input.range,
    };
    const trace = traceVisionRay(input.map, input.tileSize, input.observer, target);
    const distance = Math.min(trace.distance, input.range);
    polygon.push({
      x: input.observer.x + directionX * distance,
      y: input.observer.y + directionY * distance,
    });
  }

  return polygon;
}

function assertValidInput(input: VisionPolygonInput): void {
  assertFiniteVector(input.observer);
  assertFiniteVector(input.facing);
  if (
    !Number.isFinite(input.tileSize)
    || input.tileSize <= 0
    || !Number.isFinite(input.range)
    || input.range < 0
    || !Number.isFinite(input.fieldOfViewRadians)
    || input.fieldOfViewRadians < 0
    || input.fieldOfViewRadians > Math.PI * 2
  ) {
    throw new Error("Vision polygon configuration is invalid.");
  }
  if (!Number.isInteger(input.rayCount) || input.rayCount < 2) {
    throw new Error("Ray count must be an integer greater than or equal to 2.");
  }
}
