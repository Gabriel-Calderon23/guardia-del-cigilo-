---
id: guardia-sigilo-upgrade-patrulla-pausas-plan
titulo: Plan por incrementos del upgrade Patrulla con pausas y mirada direccional
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Upgrade Patrulla con pausas y mirada direccional

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas ni recursos externos.
- Sin cambios en `src/domain/perception/`, `memory.ts`, `alert.ts` excepto integración necesaria.
- No modificar `pathFollower.test.ts` ni pruebas existentes. Solo añadir nuevos archivos y editar acotadamente los existentes.
- `src/domain/` sin Phaser/DOM; `src/game/` adapta y no decide reglas de dominio.
- Tiempo inyectado (sin `Date`/`performance`). Todos los tiempos/deltas como parámetros.
- Validar con `npm run validate` antes de finalizar. Sin commit/publicación.
- Verificación visual en escena es **manual** (registrar como tal).

## Incremento 1 — Modelo vectorial: rotación

**Archivos modificados/creados:**
- `src/domain/model/vector.ts` (editar) — añadir `rotateVector(vector, radians)` con validación finita.

**Cambios:**
- Implementar `rotateVector` que rota el vector 2D (anti-horario), devuelve copia, valida componentes finitos y ángulo finito. Mensajes claros.

**Criterio:** CA-05 (soporte a interpolación de barrido), CA-10.

**Pruebas:** cubierto por `tests/navigation/pauseBehavior.test.ts` (sección "rotate vector").

**Comandos:** `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 2 — Módulo dominio: patrulla cíclica

**Archivos creados:**
- `src/domain/navigation/patrolRoute.ts` (nuevo)

**Cambios:**
- `nextPatrolPoint(points, currentIndex)` con validaciones: ruta no vacía, índice entero en rango [0, length). Retorna copia. Errores explícitos.

**Criterio:** CA-01.

**Pruebas:** `tests/navigation/patrolRoute.test.ts` (8 pruebas).

**Comandos:** `npm run test:run` (solo nuevo), `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 3 — Módulo dominio: pausa y barrido de mirada

**Archivos creados:**
- `src/domain/navigation/pauseBehavior.ts` (nuevo)

**Cambios:**
- Tipos: `PausePhase`, `PatrolPauseConfig`, `PatrolPauseState`.
- `initialPatrolPause()`, `startPatrolPause(baseFacing, config)`: normaliza base, guarda copia; rechaza vector cero; si `pauseMs===0` o `sweepRadians===0` retorna `initialPatrolPause()` (walking). Valida config.
- `advancePause(state, delta, config)`: inmutable si walking; reduce remaining, vuelve walking al agotar (Math.max para clamp), rechaza delta inválido.
- `pauseGazeFacing(state, config)`: null si walking; interpola lineal `progress = 1 - remaining/total`, `angle = -sweep + 2*sweep*progress`; retorna `rotateVector(baseFacing, angle)`. Valida config.

**Criterio:** CA-02–CA-05, CA-10.

**Pruebas:** `tests/navigation/pauseBehavior.test.ts` (22 pruebas).

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 4 — Definición de puntos de patrulla

**Archivos modificados:**
- `src/application/simulation/labLevel.ts` (editar)

**Cambios:**
- Añadir/exportar `PATROL_POINTS: readonly GridPoint[]` con primer punto = `GUARD_START`, ≥4 puntos transitables. Ya presente en implementación (verificado). Si necesario, confirmar conectividad (cobertura por pruebas).

**Criterio:** CA-06.

**Pruebas:** cubierto por `patrolRoute.test.ts` (lab patrol points).

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 5 — Integración en escena (Phaser)

**Archivos modificados:**
- `src/game/scenes/GameScene.ts` (editar)

**Cambios acotados:**
- Imports: añadir `nextPatrolPoint`, `PatrolPauseConfig/State`, `initialPatrolPause`, `startPatrolPause`, `advancePause`, `pauseGazeFacing`, `PATROL_POINTS`, `GUARD_START`/labLevel según corresponda. Ya presentes.
- Estado: `patrolIndex = 0`, `pauseState = initialPatrolPause()`, `patrolActive`, `patrolBlocked`.
- Config: `PATROL_PAUSE_CONFIG` (pausaMs, sweepRadians). Ya presente.
- `create()`: iniciar `pauseState = startPatrolPause(guardFacing, config)` con pausa inicial en spawn; reiniciar índice, waypoints, flags.
- `updateGuardMovement(delta)`: si `pauseState.phase === "paused"` → delegar a `updateGuardPause(delta)` y retornar (cortar avance). Si completado tramo: si investigando traveling → `arriveAtInvestigationTarget`; si `patrolActive` y no bloqueado → `beginPauseAtPatrolPoint()`; si ruta manual completada → `resumePatrolAfterManual()`.
- `updateGuardPause(delta)`: `pauseState = advancePause(...)`, actualizar `guardFacing = pauseGazeFacing(...) ?? guardFacing` (o según implementación), si vuelve a walking → `renderPatrolLeg()`.
- `beginPauseAtPatrolPoint()`: `patrolIndex = (patrolIndex+1)%PATROL_POINTS.length`, `pauseState = startPatrolPause(guardFacing, config)`, limpiar waypoints/next.
- `renderPatrolLeg()`: calcula ruta a `nextPatrolPoint(PATROL_POINTS, patrolIndex)`, setea `patrolBlocked = (status !== "success")`, renderiza ruta con sufijo `/ PATRULLA`.
- `handlePointerDown`: si hay pausa activa, al pasar a manual cancela pausa (`pauseState = initialPatrolPause()`), limpia investigación, setea `patrolActive=false`, `patrolBlocked=false`. Ya implementado.
- `resumePatrolAfterManual()`: `renderPatrolLeg()` (reanuda patrulla desde índice actual).
- Telemetría: `patrolTelemetryLine()` retorna "pausa X.Xs | barrido ±D°" si paused, else según patrolActive/patrolBlocked/manual. Ya implementado.
- Reinicio R: `create()` reinicia todo (incluye pausa inicial). Verificado.

**Criterio:** CA-07–CA-09.

**Pruebas:** integración validada por `npm run test:run` (tests existentes + nuevos). Verificación manual opcional.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** medio (interacción con lógica existente de investigación/manual).

## Incremento 6 — Evidencia y validación integral

**Archivos modificados/creados:**
- `docs/upgrades/01-patrulla-pausas/evidencia.md` (editar si necesario, o completar) — ya existe con contenido extenso; asegurar coherencia con spec actual.
- Verificar que spec.md y plan.md creados correctamente.

**Cambios:**
- Asegurar matriz criterio↔comprobación↔resultado cubre CA-01–CA-10.
- Registrar límites manuales (verificación visual escena), entorno, comandos, códigos salida.
- Ejecutar validación completa.

**Criterio:** CA-10 y requerimiento general.

**Comandos:** `npm run validate` (typecheck + test:run + build).

**Riesgo:** bajo.

## Resumen de archivos

| Inc | Archivos | Acción |
|---|---|---|
| 1 | `src/domain/model/vector.ts` | editar |
| 2 | `src/domain/navigation/patrolRoute.ts` | nuevo |
| 3 | `src/domain/navigation/pauseBehavior.ts` | nuevo |
| 4 | `src/application/simulation/labLevel.ts` | editar (ya tiene PATROL_POINTS) |
| 5 | `src/game/scenes/GameScene.ts` | editar (ya integrado) |
| 6 | `docs/upgrades/01-patrulla-pausas/spec.md`, `plan.md`, `evidencia.md` | nuevos/editar (crear spec/plan si faltan) |

## Comandos de validación

```bash
cd guardia-del-cigilo-
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
npm.cmd run validate  # integral
```

## Notas

- Implementación existente ya cumple gran parte: `rotateVector` presente, `patrolRoute.ts` presente, `pauseBehavior.ts` presente, `PATROL_POINTS` presente, `GameScene` integrado con pausa inicial, corte durante pausa, telemetría, reinicio. Las pruebas `patrolRoute.test.ts` (8) y `pauseBehavior.test.ts` (22) ya existen y pasan.
- No modificar `pathFollower.test.ts`. No añadir dependencias.
- Registrar verificación visual como manual en evidencia.
