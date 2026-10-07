import type { AlertLevel } from "../../domain/perception/alert";

/**
 * Estilo de relleno del cono de visión para cada nivel de alerta.
 *
 * Módulo de presentación puro: traduce el nivel lógico a valores que la escena
 * Phaser puede aplicar. No importa Phaser ni decide comportamiento.
 */
export interface VisionStyle {
  /** Color de relleno en formato numérico 0xRRGGBB. */
  readonly color: number;
  /** Opacidad del relleno, entre 0 y 1. */
  readonly alpha: number;
}

/** Opacidad del cono: se conserva la del render H3 para no alterar la lectura. */
const FILL_ALPHA = 0.16;

export const VISION_STYLES: Readonly<Record<AlertLevel, VisionStyle>> = {
  patrol: { color: 0x73c991, alpha: FILL_ALPHA },
  suspicion: { color: 0xf2c94c, alpha: FILL_ALPHA },
  alert: { color: 0xe16969, alpha: FILL_ALPHA },
};

export function visionStyleFor(level: AlertLevel): VisionStyle {
  return VISION_STYLES[level];
}
