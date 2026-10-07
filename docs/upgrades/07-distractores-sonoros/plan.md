---
id: guardia-sigilo-upgrade-distractores-sonoros-plan
titulo: Plan por incrementos del upgrade Distractores sonoros interactivos
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Upgrade Distractores sonoros interactivos

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas ni recursos externos.
- No modificar `src/domain/perception/perception.ts`, `memory.ts`, `alert.ts`, `pauseBehavior.ts`, `patrolRoute.ts`, `pathFollower.ts`, `search.ts` ni sus pruebas.
- `src/domain/` sin Phaser/DOM; `src/game/` adapta.
- Tiempo inyectado (sin Date/performance).
- No modificar pruebas existentes; añadir nuevas.
- Validar con `npm run validate`.

## Incremento 1 — Módulo dominio: distractor

**Archivos creados:**
- `src/domain/perception/distractor.ts` (nuevo)
- `tests/perception/distractor.test.ts` (nuevo)

**Cambios:**
- `DistractorConfig`, `DISTRACTOR_CONFIG = {radius:190, durationMs:800, cooldownMs:500}`
- `canActivateDistractor(lastActivatedAtMs|null, nowMs, config)`: valida finitos, cooldown
- `createDistractorSoundEvent(map, cell, tileSize, config, emittedAtMs)`: valida walkable (falla explícito), retorna SoundEvent centro

**Criterio:** CA-01, CA-02.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 2 — Módulo dominio: investigación

**Archivos creados:**
- `src/domain/navigation/investigationBehavior.ts` (nuevo)
- `tests/navigation/investigationBehavior.test.ts` (nuevo)

**Cambios:**
- Tipos `InvestigationPhase`, `InvestigationConfig`, `InvestigationState`, `InvestigationSignals`
- `initialInvestigation`, `startInvestigation` (valida coords enteras), `arriveAtInvestigationTarget` (inspectMs==0 → idle), `advanceInvestigation` (inyectado, clamp), `shouldStartInvestigation` (idle && !vision && sound), `shouldCancelInvestigation` (activo && vision)

**Criterio:** CA-03.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 3 — Presentación: distractor style

**Archivos creados:**
- `src/game/presentation/distractorStyle.ts` (nuevo)
- `tests/presentation/distractorStyle.test.ts` (nuevo)

**Cambios:**
- `DistractorStyle`, `DISTRACTOR_STYLE` (marker/ring), `distractorOriginLabel(cell|null)` valida enteras.

**Criterio:** CA-07, CA-08.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 4 — Integración escena: input, activación, dibujo

**Archivos modificados:**
- `src/game/scenes/GameScene.ts` (editar)

**Cambios acotados:**
- Imports: distractor + investigation + style (ya presentes).
- Estado: `distractorArmed`, `lastDistractorAtMs`, `distractorCell`, `distractorNotice`, `investigationState`, `investigationNotice`. Ya presentes.
- Tecla E: toggle distractorArmed, limpia notice. Ya presente.
- Clic: si distractorArmed → `activateDistractor(pointer)` y return; else comportamiento manual existente. Ya presente.
- `activateDistractor`: valida walkable → CELDA INVALIDA; valida cooldown → EN ENFRIAMIENTO; crea evento con `createDistractorSoundEvent` + `withSoundEvent`, setea lastDistractorAtMs, distractorCell, notice ACTIVO. Ya presente.
- Dibujo: marcador/anillo según distractorCell y soundEvent activo. Ya presente.
- Telemetría: `distractorTelemetryLine()` y `investigationTelemetryLine()`. Ya presentes.
- create(): reinicia estados. Ya presente.

**Criterio:** CA-04, CA-07, CA-08.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** bajo.

## Incremento 5 — Integración escena: investigación del ruido

**Archivos modificados:**
- `src/game/scenes/GameScene.ts` (editar)

**Cambios acotados:**
- `updatePerception(time)`: usa `shouldStartInvestigation` con signals {visionVisible, soundHeard} + soundEvent → `beginInvestigation(position)`. Si activo y mismo origen cambia → replanifica? Si mismo origen, no reiniciar. También `shouldCancelInvestigation` con visión → `cancelInvestigation`. Ya implementado.
- `beginInvestigation(position)`: convierte a celda, calcula ruta guardia→celda; si status!=success → `investigationNotice = "RUIDO INALCANZABLE (...)"`, no inicia fase; else `startInvestigation(cell, INVESTIGATION_CONFIG)`, limpia pausa, renderRoute con sufijo `/ INVESTIGAR`. Ya presente.
- `cancelInvestigation()`: vuelve idle, limpia notice, `renderPatrolLeg()`. Ya presente.
- `updateGuardMovement(delta)`: si `investigationState.phase==="inspecting"` → delega `updateInvestigationInspect`. Si completado tramo y `phase==="traveling"` → `arriveAtInvestigationTarget(...)` (pasa a inspecting). Ya presente.
- `updateInvestigationInspect(delta)`: avanza, si vuelve idle → limpia notice, `renderPatrolLeg()` (reanuda patrulla desde índice). Ya presente.
- Prioridad visión>sonido asegurada por predicados y cancelación. Ya presente.

**Criterio:** CA-05, CA-06.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** medio (interacción con patrulla/pausa).

## Incremento 6 — Evidencia y validación

**Archivos:**
- `docs/upgrades/07-distractores-sonoros/spec.md` (crear)
- `docs/upgrades/07-distractores-sonoros/plan.md` (crear v2)
- `docs/upgrades/07-distractores-sonoros/evidencia.md` (mantener coherente)

**Cambios:** matriz criterio↔comprobación↔resultado completa, registrar límites manuales, ejecutar validación.

**Criterio:** CA-09.

**Comandos:** `npm run validate`.

**Riesgo:** bajo.

## Resumen archivos

| Inc | Archivos | Acción |
|---|---|---|
| 1 | `distractor.ts`, `distractor.test.ts` | nuevo (existen) |
| 2 | `investigationBehavior.ts`, `investigationBehavior.test.ts` | nuevo (existen) |
| 3 | `distractorStyle.ts`, `distractorStyle.test.ts` | nuevo (existen) |
| 4–5 | `GameScene.ts` | editar (ya integrado) |
| 6 | `spec.md`, `plan.md`, `evidencia.md` | crear/ajustar |

## Comandos

```bash
cd guardia-del-cigilo-
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
npm.cmd run validate
```
