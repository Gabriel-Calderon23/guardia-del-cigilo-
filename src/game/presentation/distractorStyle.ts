import type { GridPoint } from "../../domain/model/grid";

/**
 * Estilo de presentación del distractor sonoro.
 *
 * Módulo de presentación puro, siguiendo el patrón de `visionStyle.ts`: traduce
 * valores de presentación (color, alfa, radio del marcador y anillo) que la
 * escena Phaser puede aplicar. No importa Phaser ni decide comportamiento.
 */
export interface DistractorStyle {
  /** Color del marcador de la celda activada, en formato numérico 0xRRGGBB. */
  readonly markerColor: number;
  /** Opacidad del trazo del marcador, entre 0 y 1. */
  readonly markerAlpha: number;
  /** Radio del marcador, en píxeles. */
  readonly markerRadius: number;
  /** Color del anillo del sonido, en formato numérico 0xRRGGBB. */
  readonly ringColor: number;
  /** Opacidad del anillo, entre 0 y 1. */
  readonly ringAlpha: number;
  /** Grosor de línea del anillo, en píxeles. */
  readonly ringLineWidth: number;
}

/**
 * Ámbar consistente con el sonido del jugador y el anillo de H3.
 * Constantes de presentación, ajustables.
 */
export const DISTRACTOR_STYLE: DistractorStyle = {
  markerColor: 0xe5b454,
  markerAlpha: 1,
  markerRadius: 13,
  ringColor: 0xe5b454,
  ringAlpha: 0.8,
  ringLineWidth: 2,
};

/**
 * Etiqueta del origen del distractor para la telemetría. `null` significa que
 * no hay un distractor activo. Rechaza coordenadas no enteras con un error
 * explícito, conforme a «Errores observables y sin fallos silenciosos».
 */
export function distractorOriginLabel(cell: GridPoint | null): string {
  if (cell === null) {
    return "-";
  }
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    throw new Error("Distractor origin cell must have integer coordinates.");
  }
  return `${cell.x},${cell.y}`;
}