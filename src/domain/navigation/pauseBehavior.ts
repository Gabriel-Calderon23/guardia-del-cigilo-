import { normalized, rotateVector, type Vector2 } from "../model/vector";

export type PausePhase = "walking" | "paused";

export interface PatrolPauseConfig {
  /** Duración de la pausa en milisegundos (N). */
  readonly pauseMs: number;
  /** Amplitud del barrido en radianes, aplicada como offset ± respectivo a la dirección de llegada. */
  readonly sweepRadians: number;
}

export interface PatrolPauseState {
  readonly phase: PausePhase;
  /** Tiempo restante de la pausa. Fuera de pausa es 0. */
  readonly remainingMs: number;
  /** Duración total configurada de la pausa. Fuera de pausa es 0. */
  readonly totalMs: number;
  /** Dirección de llegada al punto de control, normalizada; base del barrido. */
  readonly baseFacing: Vector2;
}

function validateConfig(config: PatrolPauseConfig): void {
  if (!Number.isFinite(config.pauseMs) || config.pauseMs < 0) {
    throw new Error("Pause duration must be finite and non-negative.");
  }
  if (!Number.isFinite(config.sweepRadians) || config.sweepRadians < 0) {
    throw new Error("Sweep angle must be finite and non-negative.");
  }
}

export function initialPatrolPause(): PatrolPauseState {
  return { phase: "walking", remainingMs: 0, totalMs: 0, baseFacing: { x: 0, y: 0 } };
}

/**
 * Inicia la pausa al llegar a un punto de control. `baseFacing` es la dirección
 * de llegada, normalizada como base del barrido de mirada.
 *
 * Caso límite de la spec: con `pauseMs === 0` (N = 0) o `sweepRadians === 0`
 * la pausa no tiene efecto y devuelve directamente el estado `walking`.
 */
export function startPatrolPause(
  baseFacing: Vector2,
  config: PatrolPauseConfig,
): PatrolPauseState {
  validateConfig(config);
  const base = normalized(baseFacing);
  if (!base) {
    throw new Error("Pause base facing must not be zero.");
  }
  if (config.pauseMs === 0 || config.sweepRadians === 0) {
    return initialPatrolPause();
  }

  return {
    phase: "paused",
    remainingMs: config.pauseMs,
    totalMs: config.pauseMs,
    baseFacing: base,
  };
}

/**
 * Avanza la pausa con tiempo inyectado (sin Date ni performance).
 * Agotado el tiempo restante, vuelve a `walking`.
 */
export function advancePause(
  state: PatrolPauseState,
  deltaMs: number,
  config: PatrolPauseConfig,
): PatrolPauseState {
  validateConfig(config);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Pause delta time must be finite and non-negative.");
  }
  if (state.phase !== "paused") {
    return state;
  }

  const remainingMs = Math.max(0, state.remainingMs - deltaMs);
  if (remainingMs === 0) {
    return initialPatrolPause();
  }
  return { ...state, remainingMs };
}

/**
 * Vector de mirada vigente. Durante la pausa interpola linealmente el ángulo
 * desde `-sweepRadians` hasta `+sweepRadians` (barrido de ida, relativo a la
 * dirección de llegada). En `walking` devuelve `null`: el llamador usa la
 * dirección de marcha de `advanceAlongPath`.
 */
export function pauseGazeFacing(
  state: PatrolPauseState,
  config: PatrolPauseConfig,
): Vector2 | null {
  validateConfig(config);
  if (state.phase !== "paused") {
    return null;
  }

  const progress = 1 - state.remainingMs / state.totalMs;
  const angle = -config.sweepRadians + 2 * config.sweepRadians * progress;
  return rotateVector(state.baseFacing, angle);
}