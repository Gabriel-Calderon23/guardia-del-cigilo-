---
id: guardia-sigilo-upgrade-impacto-alerta-plan
titulo: Plan por incrementos del upgrade Impacto visual extremo de alerta
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Upgrade Impacto visual extremo de alerta

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas ni recursos externos (todo por código).
- Sin cambios en `src/domain/` ni `src/application/`.
- Cambios anteriores intactos: `visionStyle.ts`, `alert.ts`, `pauseBehavior.ts`,
  `patrolRoute.ts`, `visionPolygon.ts` y sus pruebas no se tocan.
- Validar con `npm run validate`; no commit/publicación.
- Archivos previstos: 1 nuevo de presentación, 1 nuevo de prueba, 1 nuevo de
  evidencia, y edición acotada de `GameScene.ts`.
- Verificación visual en escena es **manual** (sin automatización de navegador).

## Incremento 1 — Módulo puro de parámetros y disparo

- **Archivos**
  - `src/game/presentation/alertFeedback.ts` (nuevo)
  - `tests/presentation/alertFeedback.test.ts` (nuevo)
- **Cambios**: `AlertFeedbackConfig`, constante `ALERT_FEEDBACK` (shake 300 ms,
  flash 200 ms, flash blanco, intensidad baja), `shouldTriggerAlertFeedback(prev, next)`
  (edge-triggered) y helper de duración total. Sólo importa el tipo `AlertLevel`;
  sin Phaser/DOM, con el estilo de `visionStyle.ts`.
- **Criterio**: EC-01, EC-02, EC-03, EC-10 (parcial).
- **Comando/prueba**: `npm run test:run` (nuevo archivo) y `npm run typecheck`.
- **Riesgo**: bajo. Único cuidado: mantener el módulo puro (import de tipo) y no
  acoplar umbrales temporales.

## Incremento 2 — Adaptador Phaser en la escena

- **Archivos**
  - `src/game/scenes/GameScene.ts` (editar)
- **Cambios**: campo de nivel previo; en `updatePerception` comparar
  `previousAlertLevel` vs nuevo y, si `shouldTriggerAlertFeedback`, ejecutar
  `cameras.main.resetFX()` + `shake(...)` + `flash(...)`; actualizar el nivel
  previo. En `create()` reiniciar ese estado y `cameras.main.resetFX()`.
- **Criterio**: EC-04, EC-06, EC-07 (paridad tras `R`).
- **Comando/prueba**: `npm run typecheck`, `npm run build`; verificación manual
  `npm run dev` (entrada a alerta, limpieza < 1s, `R`).
- **Riesgo**: medio. Evitar re-disparo por fotograma (edge-trigger) y no dejar
  efectos residuales; el HUD aún se desplaza con el shake (se corrige en Inc. 3).

## Incremento 3 — HUD fijo durante el shake

- **Archivos**
  - `src/game/scenes/GameScene.ts` (editar)
- **Cambios**: mecanismo propuesto (A4 de la spec): cámara dedicada de UI que
  renderiza el HUD y que no recibe el shake, mientras la cámara principal ignora
  los objetos de HUD; alternativa de compensación si la revisión lo prefiere.
- **Criterio**: EC-05.
- **Comando/prueba**: `npm run typecheck` + verificación manual `npm run dev`
  (el HUD no se desplaza; el flash sigue cubriendo pantalla según se decida).
- **Riesgo**: medio. Capas de cámara y cobertura del flash; a confirmar el
  mecanismo exacto en la aprobación del plan.

## Incremento 4 — Validación integral y evidencia

- **Archivos**
  - `docs/upgrades/04-impacto-alerta/evidencia.md` (nuevo)
- **Cambios**: matriz criterio → comprobación → resultado real según
  `docs/plantillas/evidencia-pruebas.md`; registrar comandos y salidas.
- **Criterio**: EC-08 (pruebas previas intactas + nuevas), EC-09 (`npm run validate`).
- **Comando/prueba**: `npm run validate`; repaso de imports y de pruebas existentes.
- **Riesgo**: bajo. Registrar como no validado lo que dependa de observación
  manual, sin declarar evidencia que no exista.

## Resumen

| Inc. | Archivos | Criterio | Comando/prueba | Riesgo |
|---|---|---|---|---|
| 1 | `alertFeedback.ts`, `alertFeedback.test.ts` | EC-01,02,03,10 | `test:run`, `typecheck` | Bajo |
| 2 | `GameScene.ts` | EC-04,06,07 | `typecheck`, `build`, manual | Medio |
| 3 | `GameScene.ts` | EC-05 | `typecheck`, manual | Medio |
| 4 | `evidencia.md` | EC-08,09 | `validate` | Bajo |

## Puntos a confirmar antes de implementar

- **A4 / Inc. 3**: mecanismo del HUD fijo (cámara de UI dedicada vs. compensación)
  y si el flash debe cubrir también el HUD o sólo el mundo.
- Valores finos de intensidad del shake y del color del flash si se quieren fijar
  en la spec (hoy: baja intensidad, blanco).
