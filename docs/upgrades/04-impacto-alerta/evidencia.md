---
id: guardia-sigilo-upgrade-impacto-alerta-evidencia
titulo: Evidencia del upgrade Impacto visual extremo de alerta
tipo: referencia
audiencia: estudiante
acceso: publico
version: 2
---

# Evidencia — Upgrade Impacto visual extremo de alerta

- Criterio validado: spec [`./spec.md`](./spec.md) y plan [`./plan.md`](./plan.md),
  según la plantilla [`../../plantillas/evidencia-pruebas.md`](../../plantillas/evidencia-pruebas.md).
- Este documento es la versión 2: re-contrastó la implementación contra cada
  criterio de la spec y re-ejecutó `npm run validate` (23:27 UTC-3, 6 de oct. de 2026).
- Versión inicial: estado posterior al upgrade 02 (11 archivos de prueba, 90 pruebas).
- Versión final: incrementos 1 a 3 implementados (12 archivos de prueba, 99 pruebas).
  No existe `.git` en el repositorio; la versión se describe por estado de archivos.
- Entorno de ejecución: Windows; Node.js v24.21.0; npm 12.0.2; Phaser 3.90.0;
  Vite 6.4.3; Vitest 4.1.10; TypeScript 5.9.3.

## Matriz Criterio → Comprobación → Resultado real

| Criterio (spec) | Comprobación | Resultado real |
|---|---|---|
| EC-01: disparo sólo al entrar en alerta (`next === "alert"` y `prev !== "alert"`) | `shouldTriggerAlertFeedback(prev, next)` en `src/game/presentation/alertFeedback.ts` (línea 33); 9 pruebas en `tests/presentation/alertFeedback.test.ts`: entrada desde `patrol`/`suspicion`, no re-disparo sostenido, no disparo en salida de alerta / niveles bajos, reentrada, tabla por nivel | **OK** |
| EC-02: config pura shake 300 ms + flash 200 ms; total < 1000 ms asertado en prueba | `ALERT_FEEDBACK` (línea 22) con `shakeDurationMs: 300`, `flashDurationMs: 200`, `flashColor: 0xffffff`; `totalFeedbackDurationMs` retorna `Math.max` = 300; pruebas «uses the agreed short durations» y «keeps the whole effect under one second» (`toBeLessThan(1000)`, `toBe(300)`) | **OK** — total 300 ms |
| EC-03: módulo de presentación sin Phaser | `alertFeedback.ts` sólo `import type { AlertLevel }` (línea 1); sin imports de Phaser/DOM; `typecheck` verde | **OK** |
| EC-04: `GameScene` invoca `cameras.main.shake(...)` y `flash(...)` en la transición, con `resetFX()`; sin re-disparo por fotograma | `updatePerception` (línea 415) compara `this.alertLevel` (nivel previo) con `nextAlertLevel`; `triggerAlertFeedback` (línea 424) hace `resetFX()` + `shake(...)` y `flashCamera(...)`; `flashCamera` (línea 433) convierte `0xffffff` a canales RGB; edge-trigger impide re-disparo por cuadro | **OK por código** — verificación visual manual pendiente |
| EC-05: HUD fijo durante el shake | Cámara de UI dedicada creada al final de `create()` (`this.uiCamera`, línea 198): `cameras.main.ignore([titleText, navigationHud])` y `uiCamera.ignore(mundo)`; `shake` sólo se aplica a `cameras.main` → el HUD no se desplaza | **OK por código** — verificación visual manual pendiente |
| EC-06: `updateTelemetry` conserva/refleja `alert` sin romper telemetría previa | `this.alertLevel = nextAlertLevel` (línea 418) antes de `updateTelemetry(…)` (línea 421); HUD sigue mostrando `alerta <nivel>`; sin cambios en `updateTelemetry` | **OK** |
| EC-07: `R` restablece cámara/HUD sin remanentes | `create()` reinicia `this.alertLevel = "patrol"` y llama `cameras.main.resetFX()` (línea 119); `CameraManager.shutdown` (fuente Phaser) destruye todas las cámaras y `start` recrea sólo la principal, por lo que la cámara de UI no se acumula | **OK por código** — verificación visual manual pendiente |
| EC-08: pruebas previas intactas + nuevas en `tests/presentation/` | 12 archivos / 99 pruebas (antes 11 / 90); no se modificó ninguna prueba existente; nueva `tests/presentation/alertFeedback.test.ts` | **OK** — +1 archivo / +9 pruebas |
| EC-09: `npm run validate` finaliza correctamente | `npm.cmd run validate` → typecheck + test:run + build | **OK** — exit 0 (ver tabla) |
| EC-10: sin dependencias nuevas ni recursos externos | `package.json`/`package-lock.json` sin cambios (sólo `phaser` 3.90.0 + devDeps previas); módulo de presentación puro sin recursos | **OK** — 0 dependencias nuevas |

## Comandos ejecutados y códigos de salida

| Fase | Comando | Código | Resultado |
|---|---|---|---|
| Inc. 1 | `npm.cmd run test:run` | 0 | 12 archivos / 99 pruebas aprobadas |
| Inc. 1 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 2 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 2 | `npm.cmd run build` | 0 | 25 módulos transformados; `dist/` generado |
| Inc. 2 | `npm.cmd run test:run` | 0 | 12 archivos / 99 pruebas aprobadas |
| Inc. 3 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 3 | `npm.cmd run build` | 0 | 25 módulos transformados; `dist/` generado |
| Inc. 3 | `npm.cmd run test:run` | 0 | 12 archivos / 99 pruebas aprobadas |
| **Integración (versión 1)** | `npm.cmd run validate` | **0** | typecheck + 99/99 pruebas + build |
| **Integración (versión 2, re-runs)** | `npm.cmd run validate` | **0** | typecheck + 99/99 pruebas + build (25 módulos, 5.03 s) |
| Entorno | `node --version` / `npm.cmd --version` | 0 | v24.21.0 / 12.0.2 |

Nota: el warning de chunk > 500 kB en `vite build` es preexistente (Phaser completo)
y no bloquea. No hubo cambios de dependencias ni `npm ci` en este upgrade.

## Modificaciones clave (diff resumido)

- `src/game/presentation/alertFeedback.ts` (nuevo) — `AlertFeedbackConfig`,
  `ALERT_FEEDBACK`, `shouldTriggerAlertFeedback`, `totalFeedbackDurationMs` y
  validación explícita; puro y testeable.
- `tests/presentation/alertFeedback.test.ts` (nuevo) — 9 pruebas (disparo,
  parámetros, total < 1 s, rangos y valores inválidos).
- `src/game/scenes/GameScene.ts` — import del módulo; `resetFX()` en `create()`;
  `nextAlertLevel` con disparo por transición; `triggerAlertFeedback()` y
  `flashCamera()`; `titleText` referenciable; cámara de UI dedicada con `ignore`
  cruzados entre cámara principal y de UI.
- `docs/upgrades/04-impacto-alerta/spec.md` y `plan.md` (nuevos) — spec y plan
  aprobados en sesión.
- `docs/upgrades/04-impacto-alerta/evidencia.md` (este documento).

## Decisiones humanas asumidas

- Disparador **edge-triggered**: sólo al entrar en `alert` desde otro nivel;
  alerta sostenida no re-dispara; reentrada sí (sin cooldown).
- Parámetros: shake 300 ms, flash 200 ms blanco (`0xffffff`), intensidad de shake
  `0.008` (baja). Constantes de presentación, ajustables.
- Mecanismo: API de cámara de Phaser (`shake`/`flash`), duración en milisegundos,
  limpieza con `resetFX()`.
- HUD fijo mediante **cámara de UI dedicada**; el **flash cubre mundo + HUD**
  (ambas cámaras). A4 de la spec resuelto en esta dirección.
- `AlertLevel` sigue siendo una derivación observable de percepción; no es el
  estado real de la FSM H4.

## Límites y fallos abiertos

- **Verificación visual manual pendiente**: no hay automatización de navegador
  (ver `docs/evidencias/h3-validacion.md`). Requiere `npm run dev` humano:
  1. Acercar al jugador al cono y confirmar shake + flash.
  2. Confirmar limpieza de cámara y HUD en < 1 s.
  3. Confirmar que HUD/título no se desplazan durante el shake.
  4. Confirmar paridad tras `R` (sin efectos ni cámaras residuales).
- **Supuesto de mantenimiento**: `uiCamera.ignore(...)` captura la lista del
  display en `create()`; la escena usa `graphics.clear()` + redibujo y no agrega
  objetos en tiempo de ejecución. Objetos dinámicos futuros exigirían actualizar
  los `ignore`.
- `docs/h3-percepcion-movimiento.md` (línea 42) sigue describiendo el esquema de
  color previo al upgrade 02; actualización fuera del alcance autorizado.
- Repositorio sin `.git`: no hay versión por commit; reconciliación futura de
  `evaluateAlertLevel` con el estado real al implementar H4.
- `prefers-reduced-motion` u opción de desactivar el efecto: excluidos por spec.
- Fallos abiertos: ninguno bloqueante dentro del alcance validado.