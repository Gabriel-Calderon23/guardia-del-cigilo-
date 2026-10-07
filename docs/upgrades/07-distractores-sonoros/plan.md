---
id: guardia-sigilo-upgrade-distractores-sonoros-plan
titulo: Plan por incrementos del upgrade Distractores sonoros interactivos
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Upgrade Distractores sonoros interactivos

Spec de referencia: [`spec.md`](./spec.md).

> **Aviso de trazabilidad.** Al redactar este plan no se encontró `spec.md` en
> `docs/upgrades/07-distractores-sonoros/` (la carpeta contenía sólo este archivo
> de plan). Las decisiones marcadas como *supuesto a confirmar* provienen del
> requisito planteado y de la exploración del código, no de una spec verificable.
> Si existe una spec revisada, este plan debe reconciliarse con sus criterios
> (EC-xx) antes de implementar.

## Requisito base

Al activar un distractor sonoro en una celda, se genera una onda de sonido que el
guardia oye si está dentro del radio; el guardia investiga la posición del ruido
y luego retoma su patrulla.

## Decisiones supuestas (a confirmar)

| Tema | Supuesto propuesto | Estado |
|---|---|---|
| Dónde vive «investigar» | Mínimo: módulo puro en `src/domain/` + secuenciación en `GameScene`, sin implementar la FSM H4 completa (H4 sigue Pendiente) | A confirmar |
| Interacción | Tecla que arma el distractor + clic en una celda transitable para activarlo | A confirmar |
| Trayectoria | Instantánea en la celda destino (sin proyecto/rebote); sólo se valida transitabilidad | A confirmar |
| Límites | Sin inventario; un distractor activo a la vez (slot único de sonido) y enfriamiento corto | A confirmar |
| Parámetros | Reusar `SOUND_RADIUS = 190` y `SOUND_DURATION_MS = 800` de `GameScene` | A confirmar |
| Prioridad | Visión > distractor > patrulla/ruta manual; el distractor interrumpe patrulla y ruta manual | A confirmar |
| Retorno | Pausa breve (reusa `startPatrolPause`, 1500 ms) y reanuda el ciclo desde el índice actual | A confirmar |
| Presentación | Anillo de sonido + marcador de la celda + línea de HUD «investigando» + paridad tras `R` | A confirmar |

## Condiciones globales

- Sin dependencias nuevas ni recursos externos/audio (todo dibujado por código).
- Sin cambios en `src/domain/perception/perception.ts`, `memory.ts`, `alert.ts`,
  `pauseBehavior.ts`, `patrolRoute.ts`, `pathFollower.ts`, `search.ts` ni en sus
  pruebas: se **agregan** módulos y se **edita** `GameScene.ts`.
- `src/domain/` sin Phaser/DOM; `src/game/` adapta y no decide reglas.
- Cambios anteriores intactos (`visionStyle.ts`, `alertFeedback.ts`, `uiCamera`,
  pausa de patrulla, alerta derivada).
- Validar con `npm run validate`; sin commit/publicación/despliegue.
- Verificación visual en escena es **manual** (sin automatización de navegador).
- Reutilizar el slot único de sonido existente: activar un distractor reemplaza
  el sonido vigente (`withSoundEvent`).

## Incremento 1 — Módulo puro del distractor

- **Archivos**
  - `src/domain/perception/distractor.ts` (nuevo)
  - `tests/perception/distractor.test.ts` (nuevo)
- **Cambios**: `DistractorConfig` (`radius`, `durationMs`, `cooldownMs`),
  constante `DISTRACTOR_CONFIG` (190 / 800 / enfriamiento a confirmar),
  `canActivateDistractor(lastActivatedAtMs, nowMs, config)`,
  `createDistractorSoundEvent(map, cell, tileSize, config, emittedAtMs)` que
  valida la celda con `isWalkable` (error explícito si no es transitable) y
  devuelve un `SoundEvent` en el centro de la celda (`cellCenter`). Importa sólo
  `grid`, `vector` y el tipo `SoundEvent`; sin Phaser/DOM.
- **Criterio**: C-01 (evento válido en el centro de la celda, audibles por
  `evaluateSound`), C-02 (enfriamiento bloquea reactivación), C-03 (celda
  inválida falla de forma explícita), C-04 (dominio sin Phaser/DOM).
- **Comando/prueba**: `npm run test:run` (archivo nuevo) y `npm run typecheck`.
- **Riesgo**: bajo. Cuidado: no fijar umbrales temporales fuera del config.

## Incremento 2 — Entrada e inyección del sonido en la escena

- **Archivos**
  - `src/game/scenes/GameScene.ts` (editar)
- **Cambios**: nueva tecla (p. ej. `E`) que arma/desarma el distractor; en
  `handlePointerDown`, si está armado, tomar `worldToCell` y, si es transitable y
  `canActivateDistractor`, crear el `SoundEvent` con el módulo del Inc. 1 e
  inyectarlo con `withSoundEvent`, actualizar `lastDistractorAtMs` y dibujar un
  marcador; **no** mover al guardia. Si no está armado, se conserva la conducta
  actual (destino manual). Campos nuevos: `distractorArmed`,
  `lastDistractorAtMs`, `distractorMarker`.
- **Criterio**: C-05 (activar en celda libre produce sonido oído por el guardia
  dentro del radio), C-06 (celda bloqueada/fuera del mapa no activa y se informa),
  C-07 (el clic normal sigue fijando destino manual; sin regresión).
- **Comando/prueba**: `npm run typecheck`, `npm run build`; verificación manual
  `npm run dev` (activar, oír, clic normal, `R`).
- **Riesgo**: medio. El input comparte `pointerdown` con la ruta manual y el
  estado de armado debe reiniciarse en `create()`.

## Incremento 3 — Investigar el ruido y retomar patrulla

- **Archivos**
  - `src/domain/navigation/investigationBehavior.ts` (nuevo)
  - `tests/navigation/investigationBehavior.test.ts` (nuevo)
  - `src/game/scenes/GameScene.ts` (editar)
- **Cambios**: módulo puro con `InvestigationPhase`
  (`idle` / `traveling` / `inspecting`), `InvestigationConfig` (tiempo de
  inspección), `InvestigationState`, `startInvestigation(cell)`,
  `arriveAtInvestigationTarget(state)`, `advanceInvestigation(state, delta, config)`
  y un predicado puro de prioridad (visión > distractor) para no decidir la regla
  dentro de la escena. En `GameScene`: al oír un sonido sin visión, fijar el
  objetivo en `perceptionState.soundEvent.position`, calcular la ruta con
  `calculateRoute`, seguirla con `advanceAlongPath`; al llegar, pasar a
  `inspecting` (reusa `startPatrolPause`/`advancePause`) y al terminar retomar
  con `renderPatrolLeg` desde `patrolIndex`. Si A* devuelve estado distinto de
  `success`, registrar el fracaso explícito y retomar patrulla; la visión
  cancela/prevalece sobre la investigación.
- **Criterio**: C-08 (el guardia navega a la celda del ruido), C-09 (pausa y
  reanuda patrulla desde el índice actual), C-10 (ruido inalcanzable → fracaso
  explícito y retorno sin fallo silencioso), C-11 (visión prevalece sobre
  distractor), C-12 (dominio puro y probado).
- **Comando/prueba**: `npm run test:run`, `npm run typecheck`, `npm run build`;
  verificación manual `npm run dev` (investigar, pausa, retorno, caso
  inalcanzable).
- **Riesgo**: medio-alto. Interacción con `patrolActive`, `patrolBlocked`,
  `pauseState`, `guardWaypoints` y `navigationGoal`; evitar solapamientos con la
  pausa de patrulla y no anticipar la FSM H4.

## Incremento 4 — Presentación y telemetría

- **Archivos**
  - `src/game/presentation/distractorStyle.ts` (nuevo)
  - `tests/presentation/distractorStyle.test.ts` (nuevo)
  - `src/game/scenes/GameScene.ts` (editar)
- **Cambios**: módulo puro de estilo (color/alfa/radio del marcador) siguiendo el
  patrón de `visionStyle.ts`; en `GameScene`, marcador de la celda activada,
  reuso del anillo amarillo del sonido y línea de HUD con el estado
  «investigando» / «distractor» y el origen. `create()` reinicia el estado del
  distractor para paridad tras `R`.
- **Criterio**: C-13 (marcador y anillo visibles mientras el sonido está activo),
  C-14 (la telemetría informa el estado y el origen sin romper las líneas
  previas), C-15 (módulo de presentación sin Phaser), C-16 (paridad tras `R`).
- **Comando/prueba**: `npm run test:run`, `npm run typecheck`; verificación manual
  `npm run dev` (marcador, HUD, `R`).
- **Riesgo**: bajo-medio. No alterar el HUD fijo de la `uiCamera` ni el
  `alertFeedback` existente.

## Incremento 5 — Validación integral y evidencia

- **Archivos**
  - `docs/upgrades/07-distractores-sonoros/evidencia.md` (nuevo)
- **Cambios**: matriz criterio → comprobación → resultado real según
  `docs/plantillas/evidencia-pruebas.md`, con comandos, salidas y límites
  manuales.
- **Criterio**: C-17 (pruebas previas intactas + nuevas), C-18
  (`npm run validate`), C-19 (sin dependencias nuevas ni recursos externos).
- **Comando/prueba**: `npm run validate`; revisión de imports y pruebas previas.
- **Riesgo**: bajo. Registrar como no validado lo que dependa de observación
  manual, sin declarar evidencia inexistente.

## Resumen

| Inc. | Archivos | Criterio | Comando/prueba | Riesgo |
|---|---|---|---|---|
| 1 | `distractor.ts`, `distractor.test.ts` | C-01…C-04 | `test:run`, `typecheck` | Bajo |
| 2 | `GameScene.ts` | C-05…C-07 | `typecheck`, `build`, manual | Medio |
| 3 | `investigationBehavior.ts`, `investigationBehavior.test.ts`, `GameScene.ts` | C-08…C-12 | `test:run`, `typecheck`, `build`, manual | Medio-alto |
| 4 | `distractorStyle.ts`, `distractorStyle.test.ts`, `GameScene.ts` | C-13…C-16 | `test:run`, `typecheck`, manual | Bajo-medio |
| 5 | `evidencia.md` | C-17…C-19 | `validate` | Bajo |

## Puntos a confirmar antes de implementar

1. **Spec ausente**: ¿la spec revisada existe en otra ruta o preferís que la
   redacte yo y este plan se reconcilie con ella?
2. **Lógica de «investigar»**: ¿módulo puro nuevo + secuenciación en escena
   (propuesto) o adelantar el estado Investigar de la FSM H4 en `domain/behavior/`?
3. **Interacción**: ¿tecla + clic en celda, clic con modificador, o tecla que
   arroja hacia el frente del jugador?
4. **Trayectoria**: ¿instantánea (propuesta), proyectil animado o con rebote?
5. **Límites**: ¿enfriamiento (valor?), un distractor activo a la vez, o cantidad
   finita? (recordá que «inventario» está fuera de alcance).
6. **Parámetros**: ¿190 px / 800 ms o valores propios?
7. **Prioridad**: ¿la visión cancela la investigación? ¿el distractor interrumpe
   la ruta manual por clic?
8. **Retorno**: ¿pausa breve (1500 ms) y continúa el ciclo, o reinicia la ruta de
   patrulla desde `PATROL_POINTS[0]`?
