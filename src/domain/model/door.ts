import { cellKey, isInside, type GridMap, type GridPoint } from "./grid";

/** Motivo por el que una alternancia de puerta no procede. */
export type DoorToggleFailure = "out-of-bounds";

/**
 * Resultado de `withDoorState`: o bien el mapa nuevo con la celda en el
 * estado pedido, o bien el motivo explícito del fracaso, conforme a
 * «Errores observables y sin fallos silenciosos» de la especificación.
 */
export type DoorToggleResult =
  | { readonly ok: true; readonly map: GridMap }
  | { readonly ok: false; readonly reason: DoorToggleFailure };

/** Decisión de `canToggleDoor` sobre si la celda de la puerta puede alternarse. */
export type DoorToggleDecision = "ok" | "occupied" | "out-of-bounds";

/**
 * Devuelve un `GridMap` nuevo con la celda puesta en el estado pedido
 * (`closed`), sin mutar el mapa recibido: el conjunto `blocked` se copia
 * siempre. Una celda fuera del mapa (o no entera) produce
 * `{ ok: false, reason: "out-of-bounds" }` sin modificar nada.
 */
export function withDoorState(
  map: GridMap,
  cell: GridPoint,
  closed: boolean,
): DoorToggleResult {
  if (!isInside(map, cell)) {
    return { ok: false, reason: "out-of-bounds" };
  }

  const blocked = new Set(map.blocked);
  const key = cellKey(cell);
  if (closed) {
    blocked.add(key);
  } else {
    blocked.delete(key);
  }

  return { ok: true, map: { width: map.width, height: map.height, blocked } };
}

/**
 * Decide si la celda de la puerta puede alternarse: `out-of-bounds` si la
 * celda no pertenece al mapa, `occupied` si el guardia o el jugador la
 * ocupan (el cierre se permite sólo con la celda vacía) y `ok` en caso
 * contrario. La escena sólo aporta las posiciones actuales; la regla vive en
 * dominio puro, sin Phaser ni DOM.
 */
export function canToggleDoor(
  map: GridMap,
  cell: GridPoint,
  occupantCells: Iterable<GridPoint>,
): DoorToggleDecision {
  if (!isInside(map, cell)) {
    return "out-of-bounds";
  }

  for (const occupant of occupantCells) {
    if (occupant.x === cell.x && occupant.y === cell.y) {
      return "occupied";
    }
  }

  return "ok";
}
