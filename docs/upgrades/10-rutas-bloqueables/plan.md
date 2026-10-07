---
id: guardia-sigilo-upgrade-rutas-bloqueables-plan
titulo: Plan por incrementos del upgrade Puertas y rutas bloqueables
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Upgrade Puertas y rutas bloqueables

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas.
- No modificar `search.ts`, `grid.ts` core; derivado de mapa vivo.
- Dominio/presentación puros según capa.
- No modificar pruebas existentes.

## Incremento 1 — Dominio puerta

**Archivos creados:**
- `src/domain/model/door.ts` (nuevo)
- `tests/domain/door.test.ts` (nuevo)

**Cambios:**
- `DoorState`, helpers para validar cierre (no ocupar DOOR_CELL), derivar mapa vivo.

**Criterio:** CA-01, CA-02.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 2 — Presentación puerta

**Archivos creados:**
- `src/game/presentation/doorStyle.ts` (nuevo)
- `tests/presentation/doorStyle.test.ts` (nuevo)

**Cambios:** etiquetas/estilo puros.

**Criterio:** CA-05.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 3 — Integración escena

**Archivos modificados:**
- `src/game/scenes/GameScene.ts` (editar)

**Cambios acotados:**
- Estado: doorArmed, doorClosed, doorNotice, doorRect, currentMap. Ya presentes.
- Tecla F: toggle armado. Ya presente.
- `toggleDoorAt(pointer)`: valida DOOR_CELL, alterna estado con validación (cerrar solo si libre), actualiza currentMap, redibuja paredes/puerta, replanifica (patrulla o manual). Ya implementado.
- Dibujo puerta: rectángulo con color según estado. Ya presente.
- Telemetría: doorTelemetryLine(). Ya presente.
- create(): reinicia doorClosed/currentMap. Ya presente.

**Criterio:** CA-03–CA-06.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** medio.

## Incremento 4 — Evidencia y validación

**Archivos:** spec.md, plan.md, evidencia.md.

**Cambios:** matriz completa.

**Comandos:** `npm run validate`.

**Riesgo:** bajo.

## Comandos

```bash
cd guardia-del-cigilo-
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
npm.cmd run validate
```
