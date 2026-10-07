import type { AlertLevel } from "../../domain/perception/alert";

/**
 * Parámetros y disparo del impacto visual de alerta máxima.
 *
 * Módulo de presentación puro: traduce la transición del nivel lógico a los
 * valores que la escena Phaser aplicará (camera shake + flash). No importa
 * Phaser ni decide comportamiento.
 */
export interface AlertFeedbackConfig {
  /** Duración del camera shake en milisegundos. */
  readonly shakeDurationMs: number;
  /** Intensidad relativa del camera shake, no negativa. */
  readonly shakeIntensity: number;
  /** Duración del flash en pantalla en milisegundos. */
  readonly flashDurationMs: number;
  /** Color del flash en formato numérico 0xRRGGBB. */
  readonly flashColor: number;
}

/** Impacto corto y dramático: shake 300 ms + flash 200 ms, total bajo 1 s. */
export const ALERT_FEEDBACK: AlertFeedbackConfig = {
  shakeDurationMs: 300,
  shakeIntensity: 0.008,
  flashDurationMs: 200,
  flashColor: 0xffffff,
};

/**
 * El efecto sólo se dispara al entrar en alerta máxima desde otro nivel.
 * Una alerta sostenida no vuelve a dispararse; una reentrada sí.
 */
export function shouldTriggerAlertFeedback(
  previous: AlertLevel,
  next: AlertLevel,
): boolean {
  return next === "alert" && previous !== "alert";
}

/**
 * Mayor duración del efecto. Sirve para garantizar el límite de un segundo
 * sin fijar ese umbral dentro del módulo.
 */
export function totalFeedbackDurationMs(config: AlertFeedbackConfig): number {
  assertValidConfig(config);
  return Math.max(config.shakeDurationMs, config.flashDurationMs);
}

function assertValidConfig(config: AlertFeedbackConfig): void {
  assertPositiveDuration(config.shakeDurationMs, "Shake duration");
  assertPositiveDuration(config.flashDurationMs, "Flash duration");
  if (!Number.isFinite(config.shakeIntensity) || config.shakeIntensity < 0) {
    throw new Error("Shake intensity must be finite and non-negative.");
  }
  if (
    !Number.isFinite(config.flashColor)
    || config.flashColor < 0
    || config.flashColor > 0xffffff
  ) {
    throw new Error("Flash colour must be within the 0xRRGGBB range.");
  }
}

function assertPositiveDuration(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and positive.`);
  }
}
