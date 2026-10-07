import { cellCenter, isWalkable, type GridMap, type GridPoint } from "../model/grid";
import type { SoundEvent } from "./perception";

/**
 * Reglas puras del distractor sonoro interactivo.
 *
 * Módulo de dominio: no conoce Phaser ni el DOM. Traduce una celda elegida por
 * el jugador a un `SoundEvent` reutilizable por la percepción existente
 * (`evaluateSound` / `withSoundEvent`) y controla el enfriamiento entre
 * activaciones. No decide conducta: sólo valida y describe el sonido.
 */
export interface DistractorConfig {
  /** Radio de audición del sonido, en píxeles. */
  readonly radius: number;
  /** Duración del sonido, en milisegundos. */
  readonly durationMs: number;
  /** Tiempo mínimo entre activaciones, en milisegundos. */
  readonly cooldownMs: number;
}

/**
 * Parámetros por defecto. Reusan el sonido que el jugador ya emite:
 * `SOUND_RADIUS = 190` y `SOUND_DURATION_MS = 800` de la escena.
 */
export const DISTRACTOR_CONFIG: DistractorConfig = {
  radius: 190,
  durationMs: 800,
  cooldownMs: 500,
};

function validateConfig(config: DistractorConfig): void {
  if (!Number.isFinite(config.radius) || config.radius < 0) {
    throw new Error("Distractor radius must be finite and non-negative.");
  }
  if (!Number.isFinite(config.durationMs) || config.durationMs < 0) {
    throw new Error("Distractor duration must be finite and non-negative.");
  }
  if (!Number.isFinite(config.cooldownMs) || config.cooldownMs < 0) {
    throw new Error("Distractor cooldown must be finite and non-negative.");
  }
}

/**
 * Indica si el distractor puede activarse en `nowMs` dado el instante de la
 * última activación. `null` (nunca activado) siempre habilita. Un
 * `cooldownMs` igual a cero permite reactivar de inmediato.
 */
export function canActivateDistractor(
  lastActivatedAtMs: number | null,
  nowMs: number,
  config: DistractorConfig,
): boolean {
  validateConfig(config);
  if (!Number.isFinite(nowMs)) {
    throw new Error("Distractor activation time must be finite.");
  }
  if (lastActivatedAtMs !== null && !Number.isFinite(lastActivatedAtMs)) {
    throw new Error("Last distractor activation time must be finite.");
  }
  if (lastActivatedAtMs === null) {
    return true;
  }
  return nowMs - lastActivatedAtMs >= config.cooldownMs;
}

/**
 * Construye el `SoundEvent` del distractor en el centro de `cell`. Falla de
 * forma explícita si la celda no es transitable o está fuera del mapa, conforme
 * a «Errores observables y sin fallos silenciosos».
 */
export function createDistractorSoundEvent(
  map: GridMap,
  cell: GridPoint,
  tileSize: number,
  config: DistractorConfig,
  emittedAtMs: number,
): SoundEvent {
  validateConfig(config);
  if (!Number.isFinite(emittedAtMs)) {
    throw new Error("Distractor emission time must be finite.");
  }
  if (!isWalkable(map, cell)) {
    throw new Error(`Distractor cell must be walkable: ${cell.x},${cell.y}.`);
  }
  return {
    position: cellCenter(cell, tileSize),
    radius: config.radius,
    emittedAtMs,
    durationMs: config.durationMs,
  };
}
