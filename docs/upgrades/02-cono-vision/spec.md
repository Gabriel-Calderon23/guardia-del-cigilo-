---
id: guardia-sigilo-upgrade-cono-vision-spec
titulo: Spec del upgrade Cono de visión visible y reactivo
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Upgrade Cono de visión visible y reactivo

## Problema

El guardia dispone de lógica de percepción (visión con oclusión, sonido, memoria) y niveles de alerta derivados, pero la representación visual del cono de visión no está completamente integrada/visible de forma coherente con el nivel de alerta, dificultando la observación y verificación del comportamiento.

## Intención

Hacer visible el cono de visión del guardia con estilo reactivo según el nivel de alerta (`patrol`, `suspicion`, `alert`), manteniendo estricta separación entre dominio puro y presentación Phaser, sin modificar reglas de percepción ni pruebas existentes, y preservando la arquitectura establecida.

## Objetivo

Integrar la representación visual del cono de visión (polígono/sector) con parámetros de presentación reactivos al nivel de alerta, garantizando que el dibujo refleje fielmente facing, rango, campo visual y oclusión cuando corresponda, sin introducir dependencias en dominio y sin romper validación existente.

## Alcance

- Módulo de presentación puro para estilos de visión: mapea `AlertLevel` a color, alfa, grosor/línea según corresponda.
- Dibujo del cono de visión en escena Phaser usando `visionPolygon.ts`/geometría existente y estilo reactivo.
- Coherencia entre telemetría (`vision ...`), nivel de alerta (`alerta ...`) y representación visual.
- Mantener separación: dominio no importa Phaser/DOM; presentación sin lógica de decisión.
- Preservar pruebas existentes intactas.

## Exclusiones

- No modificar `src/domain/perception/perception.ts`, `alert.ts`, `memory.ts`.
- No modificar pruebas existentes de percepción/alerta.
- No añadir dependencias.
- No cambiar umbrales de alerta definidos.

## Restricciones

- `src/domain/` libre de Phaser/DOM.
- `src/game/presentation/` puro (solo estilos/parámetros).
- TypeScript estricto.
- No modificar pruebas existentes.

## Caso normal

1. Nivel `patrol`: cono visible con estilo base (verde/azulado según implementación existente) mostrando sector según facing/FOV.
2. Al pasar a `suspicion` (sonido/memoria en ventana): estilo cambia (amarillo/ámbar) reflejando estado.
3. Al pasar a `alert` (visión válida): estilo cambia (rojo) reflejando amenaza.
4. Dibujo se actualiza cada frame coherente con facing, rango, FOV.

## Casos límite

- Transiciones edge (patrol↔suspicion↔alert↔patrol) sin parpadeos indebidos.
- Facing inválido o cero: no corrompe dibujo (usar valores válidos existentes).
- Reinicio R: estilos/visualización se reinician correctamente.

## Criterios de aceptación

- [CA-01] Existe módulo de presentación para estilos de visión (`visionStyle.ts`) que mapea `AlertLevel` a parámetros visuales puros.
- [CA-02] El dibujo del cono en escena utiliza el estilo reactivo según `alertLevel` actual.
- [CA-03] No hay imports de Phaser/DOM en dominio. Presentación sin lógica de reglas.
- [CA-04] No se modifican pruebas existentes (`visionPolygon.test.ts`, `alert.test.ts`, percepción).
- [CA-05] Integración coherente con telemetría HUD (visión/alerta).
- [CA-06] `npm run validate` pasa (typecheck + test:run + build).

## Evidencia prevista

- Archivo de estilos en `src/game/presentation/visionStyle.ts` (existente según código) y uso en `GameScene`.
- Pruebas de estilo si existen (`visionStyle.test.ts` ya presente).
- `docs/upgrades/02-cono-vision/evidencia.md` actualizado/mantenido coherente con spec.
- Validación: `npm run validate`.