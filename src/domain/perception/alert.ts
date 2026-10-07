/**
 * Nivel de alerta observable derivado de las señales de percepción vigentes.
 *
 * Módulo puro: no conoce Phaser, el DOM ni la presentación. Sólo traduce lo que
 * el guardia percibió (visión, sonido y memoria) a un nivel que la escena puede
 * representar. La ventana temporal de sospecha se inyecta para no fijar un
 * umbral dentro del dominio.
 */

export type AlertLevel = "patrol" | "suspicion" | "alert";

export interface AlertSignals {
  readonly visionVisible: boolean;
  readonly soundHeard: boolean;
  /** Antigüedad de la última percepción válida, o null si no hay memoria. */
  readonly memoryAgeMs: number | null;
}

export interface AlertConfig {
  /** Máxima antigüedad de memoria que todavía sostiene sospecha. */
  readonly suspicionWindowMs: number;
}

/**
 * Prioridad: una visión válida produce alerta; un sonido audido o una memoria
 * dentro de la ventana produce sospecha; sin señales, patrulla.
 */
export function evaluateAlertLevel(
  signals: AlertSignals,
  config: AlertConfig,
): AlertLevel {
  assertValidConfig(config);
  assertValidSignals(signals);

  if (signals.visionVisible) {
    return "alert";
  }
  if (signals.soundHeard) {
    return "suspicion";
  }
  if (
    signals.memoryAgeMs !== null
    && signals.memoryAgeMs <= config.suspicionWindowMs
  ) {
    return "suspicion";
  }
  return "patrol";
}

function assertValidConfig(config: AlertConfig): void {
  if (!Number.isFinite(config.suspicionWindowMs) || config.suspicionWindowMs < 0) {
    throw new Error("Suspicion window must be finite and non-negative.");
  }
}

function assertValidSignals(signals: AlertSignals): void {
  if (
    signals.memoryAgeMs !== null
    && (!Number.isFinite(signals.memoryAgeMs) || signals.memoryAgeMs < 0)
  ) {
    throw new Error("Memory age must be finite and non-negative when present.");
  }
}
