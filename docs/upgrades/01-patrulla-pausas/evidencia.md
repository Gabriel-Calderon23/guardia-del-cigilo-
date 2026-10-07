---
id: guardia-sigilo-upgrade-patrulla-pausas-evidencia
titulo: Evidencia del upgrade Patrulla con pausas y mirada direccional
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia — Upgrade Patrulla con pausas y mirada direccional

- Criterio validado: spec del upgrade aprobada en la sesión (objetivo, alcance, casos límite y criterios de aceptación) y plantilla [`docs/plantillas/evidencia-pruebas.md`](../plantillas/evidencia-pruebas.md). La ruta `docs/upgrades/01-patrulla-pausas/` no contenía archivos al momento de esta evidencia; se tomó como referencia la spec acordada en conversación.
- Versión inicial: estado posterior a H3 (6 archivos de prueba, 39 pruebas).
- Versión final: incrementos 1 a 3 aplicados (8 archivos de prueba, 69 pruebas). No existe `.git` en el repositorio; la versión se describe por estado de archivos.
- Entorno de ejecución: Windows; Node.js v24.21.0; npm 12.0.2; Phaser 3.90.0; Vite 6.4.3; Vitest 4.1.10; TypeScript 5.9.3. (H3 se validó con Node 22.6.0 / npm 10.8.2; el entorno actual cumple `engines.node >= 22`.)

## Matriz Criterio → Comprobación → Resultado real

| Criterio (spec) | Comprobación | Resultado real |
|---|---|---|
| RF-02: recorrer cíclicamente los puntos de patrulla (wrap al inicio) | `nextPatrolPoint` devuelve el siguiente punto y envuelve; `GameScene` avanza `patrolIndex` al llegar y renderiza el tramo al terminar la pausa | **OK** — pruebas `patrolRoute.test.ts` («cycles to the next point and wraps to the start») |
| Al llegar a un punto de control, pausa de N segundos (N = 1500 ms) | `beginPauseAtPatrolPoint` → `startPatrolPause`; `updateGuardMovement` corta el avance de `advanceAlongPath` cuando `phase === "paused"` | **OK** por código y pruebas de dominio; la detención visible queda en verificación manual (ver límites) |
| La mirada se orienta con barrido ±60° relativo a la dirección de llegada | `pauseGazeFacing` interpola el ángulo `-sweep → +sweep`; `updateGuardPause` actualiza `guardFacing` por cuadro | **OK** — `pauseBehavior.test.ts` (inicio en `-sweep`, punto medio = llegada, extremo en `+sweep`, simetría, `rotateVector`) |
| Reanudar la marcha tras la pausa | `advancePause` vuelve a `walking` al agotar `remainingMs`; `updateGuardPause` renderiza el tramo siguiente | **OK** — pruebas de retorno exacto y clamp de sobrepaso |
| Caso normal en escena: detención, giro del cono de visión, reanudación; telemetría indica el estado | Línea de HUD `patrolTelemetryLine()` → `pausa X.Xs \| barrido ±60°` / `patrulla` / `patrulla bloqueada` / `ruta manual` | **PARCIAL** — código presente y compila; experimento manual de escena pendiente (sin automatización de navegador) |
| Clic cancela la pausa; al completar la ruta manual se reanuda la patrulla | `handlePointerDown` resetea `pauseState` y pasa a modo manual; `updateGuardMovement` reanuda patrulla al completar una ruta con waypoints no vacíos | **OK** por código; verificación manual pendiente |
| Caso límite: punto de patrulla bloqueado o inalcanzable → sin pausa y fracaso explícito | `patrolBlocked = status !== "success"`; no se inicia la pausa; HUD «patrulla bloqueada» y resumen `INALCANZABLE / PATRULLA` | **OK** por código; el fracaso explícito de A* ya está cubierto por `search.test.ts` («reports an unreachable goal explicitly») |
| Caso límite: N = 0 o SWEEP = 0 → pausa sin efecto | `startPatrolPause` devuelve `walking` directamente | **OK** — pruebas dedicadas «skips the pause entirely…» |
| Caso límite: ruta unitaria | `nextPatrolPoint` con un solo punto | **OK** — prueba «supports a single-point route without error» |
| Caso límite: reinicio R reproducible (RF-09) | `create()` reinicia `patrolIndex`, `pauseState` (pausa inicial), `guardFacing`, `guardWaypoints` | **OK** por código; paridad visual pendiente de verificación manual |
| Invariante: el estado informado coincide con el comportamiento ejecutado | `patrolTelemetryLine()` deriva de `pauseState.phase`, `patrolActive` y `patrolBlocked` reales | **OK** por código |
| Restricción: `src/domain/` no importa Phaser/DOM | Inspección de imports de `patrolRoute.ts` y `pauseBehavior.ts`; typecheck y build verdes | **OK** |
| Sin dependencias nuevas | `package.json` sin cambios; instalación desde lockfile (`npm ci`, 47 paquetes) | **OK** |
| TypeScript estricto; pruebas de dominio en Node | `typecheck`; Vitest `environment: "node"` | **OK** |
| No modificar pruebas existentes (en particular `pathFollower.test.ts`) | Diff de los incrementos: sólo se tocaron `labLevel.ts`, `vector.ts`, `GameScene.ts` y se agregaron `patrolRoute.ts`, `pauseBehavior.ts` y dos archivos de prueba nuevos | **OK** — `pathFollower.test.ts` intacto |
| Cobertura de pruebas nuevas: entrada a pausa, permanencia sin avanzar, interpolación, fin y reanudación, ciclo y valores límite | `tests/navigation/pauseBehavior.test.ts` (22) y `tests/navigation/patrolRoute.test.ts` (8) | **OK** — nota: la «cancelación por nuevo destino» se modela en la capa juego (reset de estado en `handlePointerDown`); no tiene prueba de dominio ni de escena |

## Comandos ejecutados y códigos de salida

| Fase | Comando | Código de salida | Resultado |
|---|---|---|---|
| Inc. 1 (autorizado) | `npm.cmd ci` | 0 | 47 paquetes desde lockfile; aviso `allowScripts` sobre esbuild (no bloqueante) |
| Inc. 1 | `npm.cmd run test:run` | 0 | 7 archivos / 47 pruebas aprobadas |
| Inc. 1 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 2 | `npm.cmd run test:run` | 0 | 8 archivos / 69 pruebas aprobadas |
| Inc. 3 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 3 | `npm.cmd run build` | 0 | 22 módulos transformados; `dist/` generado |
| **Integración** | `npm.cmd run validate` | **0** | typecheck + 69/69 pruebas + build, todo aprobado |
| Entorno | `node --version` / `npm.cmd --version` | 0 | v24.21.0 / 12.0.2 |

Nota: `npm.ps1` está bloqueado por la política de ejecución de PowerShell; se usó `npm.cmd`. El warning de chunk > 500 kB en `vite build` es preexistente (Phaser completo) y no bloquea.

## Modificaciones clave (diff resumido)

- `src/application/simulation/labLevel.ts` — nueva `PATROL_POINTS` (4 puntos; primero = `GUARD_START`).
- `src/domain/navigation/patrolRoute.ts` (nuevo) — `nextPatrolPoint(points, index)` cíclico con errores explícitos.
- `src/domain/model/vector.ts` — nuevo `rotateVector(vector, radians)`.
- `src/domain/navigation/pauseBehavior.ts` (nuevo) — `PausePhase`, `PatrolPauseConfig`, `PatrolPauseState`, `initialPatrolPause`, `startPatrolPause`, `advancePause`, `pauseGazeFacing` (barrido ±60°, tiempo inyectado).
- `src/game/scenes/GameScene.ts` — integración: pausa inicial en el spawn, corte del avance durante la pausa, llegada → `startPatrolPause` con la dirección de llegada, clic cancela la pausa, reanuda patrulla tras ruta manual, `patrolBlocked` sin pausa, línea de telemetría de pausa.
- Pruebas nuevas — `tests/navigation/patrolRoute.test.ts` (8) y `tests/navigation/pauseBehavior.test.ts` (22).

## Decisiones humanas asumidas

- Selección de los 4 puntos de patrulla por el agente: `{27,17}` (=`GUARD_START`), `{27,2}`, `{5,2}`, `{2,17}`; validados transitables y conectados por A* en prueba.
- Pausa inicial en el spawn (aprobada).
- Al completar una ruta manual, reanudar la patrulla automáticamente (aprobada).
- `SWEEP = 0` → pausa sin efecto (caso límite de la spec).
- Las patrullas usan el algoritmo seleccionado (A* por defecto; `SPACE` alterna BFS/A*).

## Límites y fallos abiertos

- No validado: la verificación visual en escena (detención, giro del cono de visión, reanudación y paridad del reinicio) requiere un experimento manual humano (`npm run dev`), igual que el riesgo residual documentado en `docs/evidencias/h3-validacion.md`. No existe automatización de navegador.
- Repositorio sin git: no hay versión por commit; paridad descrita por estado de archivos.
- `npm ci` reporta 4 vulnerabilidades (2 moderate, 2 high) del lockfile. No se ejecutó `npm audit fix` (requiere permiso y modifica el lockfile); no fueron introducidas por este upgrade.
- El `postinstall` de esbuild quedó bloqueado por `allowScripts` (npm 12); el build funcionó igual mediante el binario de plataforma.
- Fallos abiertos: ninguno bloqueante dentro del alcance validado.