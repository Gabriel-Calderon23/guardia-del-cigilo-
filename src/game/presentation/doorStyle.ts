import type { GridPoint } from "../../domain/model/grid";

/**
 * Estilo de presentación de la celda-puerta del upgrade «Puertas y rutas
 * bloqueables».
 *
 * Módulo de presentación puro, siguiendo el patrón de `distractorStyle.ts`:
 * traduce valores de presentación (colores de la celda abierta/cerrada y del
 * marcador) que la escena Phaser aplica al rectángulo añadido a `walls`. No
 * importa Phaser ni decide comportamiento.
 */
export interface DoorStyle {
  /** Color de la celda con la puerta abierta (transitable), en 0xRRGGBB. */
  readonly openCellColor: number;
  /** Color de la celda con la puerta cerrada (pared), en 0xRRGGBB. */
  readonly closedCellColor: number;
  /** Color del marco/marcador de la celda-puerta, en 0xRRGGBB. */
  readonly markerColor: number;
  /** Grosor del marco/marcador, en píxeles. */
  readonly markerLineWidth: number;
}

/**
 * Estilo de la puerta: la celda cerrada comparte la base de color de las
 * paredes del nivel (0x27333d) y el marco usa un tono neutro. Constantes de
 * presentación, ajustables.
 */
export const DOOR_STYLE: DoorStyle = {
  openCellColor: 0x7cb342,
  closedCellColor: 0x27333d,
  markerColor: 0x8a5a2b,
  markerLineWidth: 2,
};

/**
 * Etiqueta de telemetría del estado de la puerta, con el formato
 * `puerta @x,y: ABIERTA|CERRADA`. Rechaza coordenadas no enteras con un error
 * explícito, conforme a «Errores observables y sin fallos silenciosos».
 */
export function doorStateLabel(cell: GridPoint, closed: boolean): string {
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    throw new Error("Door cell must have integer coordinates.");
  }
  return `puerta @${cell.x},${cell.y}: ${closed ? "CERRADA" : "ABIERTA"}`;
}