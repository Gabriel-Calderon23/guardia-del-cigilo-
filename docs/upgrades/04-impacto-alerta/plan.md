---
id: guardia-sigilo-upgrade-impacto-alerta-plan
titulo: Plan por incrementos del upgrade Impacto visual extremo de alerta
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Upgrade Impacto visual extremo de alerta

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas.
- Sin cambios en `src/domain/` ni pruebas existentes de dominio.
- Solo presentación + escena.
- Validar con `npm run validate`.

## Incremento 1 — Módulo puro de feedback

**Archivos creados:**
- `src/game/presentation/alertFeedback.ts` (nuevo)
- `tests/presentation/alertFeedback.test.ts` (nuevo)

**Cambios:**
- `AlertFeedbackConfig`, `ALERT_FEEDBACK` (shakeDurationMs 300, flashDurationMs 200, flashColor 0xffffff, shakeIntensity 0.01), `shouldTriggerAlertFeedback(prev,next)` edge hacia alert.

**Criterio:** CA-01–CA-03.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 2 — Integración escena

**Archivos modificados:**
- `src/game/scenes/GameScene.ts` (editar)

**Cambios acotados:**
- Detectar transición hacia alert tras calcular `nextAlertLevel`: `if (shouldTriggerAlertFeedback(this.alertLevel, nextAlertLevel)) { this.triggerAlertFeedback(); }` Ya presente.
- `triggerAlertFeedback()`: resetFX cámaras, shake worldCamera + uiCamera, flash ambas. Ya presente según código (usa worldCamera y uiCamera).

**Criterio:** CA-04.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** bajo.

## Incremento 3 — Evidencia y validación

**Archivos:** spec.md, plan.md (crear/actualizar), evidencia.md (coherente).

**Cambios:** matriz CA-01–CA-06.

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
