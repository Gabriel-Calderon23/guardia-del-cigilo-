import type { GridPoint } from "../model/grid";

/**
 * Ciclo de vida de la investigación de un ruido.
 *
 * Módulo puro de dominio: no conoce Phaser, el DOM ni la escena. Modela las
 * fases (idle → traveling → inspecting → idle), el temporizador de inspección
 * con tiempo inyectado y la prioridad «visión > distractor». No calcula rutas:
 * la escena reutiliza `calculateRoute`/`advanceAlongPath` y este módulo sólo
 * decide cuándo y cómo cambia de fase.
 */
export type InvestigationPhase = "idle" | "traveling" | "inspecting";

export interface InvestigationConfig {
  /** Tiempo de inspección en la celda del ruido, en milisegundos. */
  readonly inspectMs: number;
}

export interface InvestigationState {
  readonly phase: InvestigationPhase;
  /** Celda objetivo del ruido; null fuera de una investigación activa. */
  readonly targetCell: GridPoint | null;
  /** Tiempo restante de inspección; 0 fuera de `inspecting`. */
  readonly remainingMs: number;
  /** Duración total configurada de la inspección; 0 fuera de `inspecting`. */
  readonly totalMs: number;
}

export interface InvestigationSignals {
  readonly visionVisible: boolean;
  readonly soundHeard: boolean;
}

function validateConfig(config: InvestigationConfig): void {
  if (!Number.isFinite(config.inspectMs) || config.inspectMs < 0) {
    throw new Error("Investigation inspect time must be finite and non-negative.");
  }
}

export function initialInvestigation(): InvestigationState {
  return { phase: "idle", targetCell: null, remainingMs: 0, totalMs: 0 };
}

export function startInvestigation(
  cell: GridPoint,
  config: InvestigationConfig,
): InvestigationState {
  validateConfig(config);
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    throw new Error("Investigation target cell must have integer coordinates.");
  }
  return {
    phase: "traveling",
    targetCell: { x: cell.x, y: cell.y },
    remainingMs: 0,
    totalMs: config.inspectMs,
  };
}

/**
 * Transición traveling → inspecting al llegar a la celda del ruido. Con
 * `inspectMs === 0` la inspección no tiene efecto y vuelve a `idle` de
 * inmediato (caso límite equivalente a la pausa N=0 de la patrulla).
 */
export function arriveAtInvestigationTarget(
  state: InvestigationState,
  config: InvestigationConfig,
): InvestigationState {
  validateConfig(config);
  if (state.phase !== "traveling") {
    return state;
  }
  if (config.inspectMs === 0) {
    return initialInvestigation();
  }
  return {
    ...state,
    phase: "inspecting",
    remainingMs: config.inspectMs,
    totalMs: config.inspectMs,
  };
}

/**
 * Avanza la inspección con tiempo inyectado (sin `Date` ni `performance`).
 * Agotado el tiempo restante, vuelve a `idle` con límite de sobrepaso.
 */
export function advanceInvestigation(
  state: InvestigationState,
  deltaMs: number,
  config: InvestigationConfig,
): InvestigationState {
  validateConfig(config);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Investigation delta time must be finite and non-negative.");
  }
  if (state.phase !== "inspecting") {
    return state;
  }
  const remainingMs = Math.max(0, state.remainingMs - deltaMs);
  if (remainingMs === 0) {
    return initialInvestigation();
  }
  return { ...state, remainingMs };
}

/**
 * Prioridad pura: la visión manda sobre el distractor. Sólo inicia una
 * investigación un sonido oído sin visión, partiendo del estado `idle`.
 */
export function shouldStartInvestigation(
  state: InvestigationState,
  signals: InvestigationSignals,
): boolean {
  return state.phase === "idle" && !signals.visionVisible && signals.soundHeard;
}

/** La visión cancela cualquier investigación en curso. */
export function shouldCancelInvestigation(
  state: InvestigationState,
  signals: Pick<InvestigationSignals, "visionVisible">,
): boolean {
  return state.phase !== "idle" && signals.visionVisible;
}