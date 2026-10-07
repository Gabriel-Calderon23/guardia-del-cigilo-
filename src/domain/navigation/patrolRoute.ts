import type { GridPoint } from "../model/grid";

/**
 * Devuelve el siguiente punto de una ruta de patrulla cíclica, envolviendo
 * al comienzo después del último punto. El índice indica el punto recién
 * alcanzado; el resultado es el próximo destino a recorrer.
 *
 * Lanze errores explícitos para ruta vacía e índice fuera de rango, conforme
 * a «Errores observables y sin fallos silenciosos» de la especificación.
 */
export function nextPatrolPoint(
  points: readonly GridPoint[],
  currentIndex: number,
): GridPoint {
  if (points.length === 0) {
    throw new Error("Patrol route must contain at least one point.");
  }
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= points.length) {
    throw new Error("Patrol index is outside the route.");
  }

  const next = points[(currentIndex + 1) % points.length];
  if (!next) {
    throw new Error("Patrol route invariant failed.");
  }
  // Copia para que el llamador no pueda mutar la ruta original.
  return { ...next };
}