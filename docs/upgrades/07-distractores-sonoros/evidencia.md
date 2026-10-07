---
id: guardia-sigilo-upgrade-distractores-sonoros-evidencia
titulo: Evidencia del upgrade Distractores sonoros interactivos
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia de pruebas — Upgrade 07 «Distractores sonoros interactivos»

- Criterio validado: C-01…C-19 del [`plan.md`](./plan.md) del upgrade.
- Versión: sin repositorio git; estado de archivos posterior a los
  incrementos 1–4 del plan (octubre 2026).
- Entorno: Windows; Node >= 22 (requerido por `package.json`); npm 10.8.2;
  phaser 3.90.0; typescript 5.9.3; vite 6.4.3; vitest 4.1.10.
- Contraste con la spec: la carpeta `docs/upgrades/07-distractores-sonoros/`
  contiene sólo `plan.md` y este archivo; **no existe `spec.md`** para el
  upgrade 07 (verificado; el único `spec.md` del repo corresponde al upgrade
  04). Como se acordó con la persona, el contraste se realiza contra los
  criterios C-01…C-19 del plan aprobado.

La matriz usa **automatizado** cuando hay una prueba de dominio o un comando
reproducible, y **manual** cuando la comprobación requiere observación en la
escena (`npm run dev`). Lo que depende de observación manual se registra como
**pendiente** y no se declara evidencia inexistente. La columna «Evidencia»
cita la unidad concreta de implementación que responde al criterio.

## Matriz criterio → comprobación → resultado real

| Criterio | Método | Comando o pasos | Resultado | Evidencia (implementación) |
|---|---|---|---|---|
| C-01 — evento de sonido en el centro de la celda, audible por `evaluateSound` | automatizado | `npm run test:run` | aprobado | `src/domain/perception/distractor.ts` → `createDistractorSoundEvent` (centro vía `cellCenter`, radio 190, duración 800); audible por `evaluateSound`; test «emits a sound event at the cell centre that the guard can hear» |
| C-02 — enfriamiento bloquea reactivación | automatizado | `npm run test:run` | aprobado | `canActivateDistractor` (500 ms de `DISTRACTOR_CONFIG`); tests «blocks reactivation until the cooldown elapses» y «honours a zero cooldown» |
| C-03 — celda inválida falla de forma explícita | automatizado | `npm run test:run` | aprobado | `createDistractorSoundEvent` valida con `isWalkable` y lanza error explícito; test «fails explicitly on a blocked or out-of-bounds cell» |
| C-04 — dominio sin Phaser/DOM | automatizado + inspección de imports | `npm run typecheck`; revisión de `distractor.ts` | aprobado | `distractor.ts` importa sólo `grid`, `vector` y el tipo `SoundEvent`; `tsc` sin errores |
| C-05 — activar en celda libre produce sonido oído dentro del radio | manual | `npm run dev`: `E` + clic en celda libre | pendiente | escena sin automatización; respaldo `withSoundEvent`/slot único ya cubierto por `perceptionSimulation.test.ts` |
| C-06 — celda bloqueada/fuera del mapa no activa y se informa | manual | `npm run dev`: `E` + clic en pared/fuera del mapa | pendiente | escena sin automatización; la falla explícita (C-03) está automatizada |
| C-07 — el clic normal sigue fijando destino manual | manual | `npm run dev`: clic sin armar | pendiente | escena sin automatización; `handlePointerDown` conserva la rama manual |
| C-08 — el guardia navega a la celda del ruido | manual | `npm run dev`: distractor alcanzable | pendiente | escena sin automatización; `beginInvestigation` calcula con `calculateRoute` y sigue con `advanceAlongPath` (fase `traveling`) |
| C-09 — pausa breve y reanuda patrulla desde el índice actual | manual | `npm run dev`: observar pausa y retorno | pendiente | escena sin automatización; `advanceInvestigation` (1500 ms vía `INVESTIGATION_CONFIG`) y retorno con `renderPatrolLeg` desde `patrolIndex` |
| C-10 — ruido inalcanzable → fracaso explícito y retorno | manual (+ A* automatizado) | `npm run dev`; `search.test.ts` | pendiente (A* subyacente: aprobado) | `beginInvestigation` registra `RUIDO INALCANZABLE (status)` sin cambio de fase; `search.ts` «reports an unreachable goal explicitly» |
| C-11 — visión prevalece sobre el distractor | automatizado (predicado) + manual (integración) | `npm run test:run`; `npm run dev` | aprobado (predicado); integración visual pendiente | `shouldStartInvestigation`/`shouldCancelInvestigation` (visión > distractor); tests «starts only from idle…» y «cancels an active investigation on vision only» |
| C-12 — dominio puro y probado | automatizado + imports | `npm run test:run` | aprobado | `src/domain/navigation/investigationBehavior.ts` importa sólo `type GridPoint`; 9 pruebas verdes |
| C-13 — marcador y anillo visibles mientras el sonido está activo | manual | `npm run dev` | pendiente | escena sin automatización; estilos en `DISTRACTOR_STYLE` (marcador ámbar + anillo) |
| C-14 — telemetría informa estado y origen sin romper líneas previas | manual (+ formato automatizado) | `npm run dev`; `distractorStyle.test.ts` | pendiente (formato: aprobado) | `distractorOriginLabel` → `distractor @x,y`; tests «formats the origin label from a cell» y «uses a dash when there is no origin» |
| C-15 — módulo de presentación sin Phaser | automatizado + imports | `npm run typecheck` | aprobado | `src/game/presentation/distractorStyle.ts` importa sólo `type GridPoint`; `tsc` sin errores |
| C-16 — paridad tras `R` | manual (+ inspección) | `npm run dev` | pendiente | `create()` reinicia marcador y estado del distractor; `scene.restart()` recrea todo sin residuos |
| C-17 — pruebas previas intactas + nuevas | automatizado | `npm run test:run` | aprobado | 15 archivos / 119 pruebas: 99 previas intactas + 20 nuevas (distractor 6, investigation 9, distractorStyle 5) |
| C-18 — `npm run validate` | automatizado | `npm run validate` | aprobado | `tsc --noEmit` sin errores; `vitest run` 15/119; `vite build` 28 módulos |
| C-19 — sin dependencias nuevas ni recursos externos | automatizado (inspección) | revisión de `package.json` e imports | aprobado | `package.json` sin cambios (phaser 3.90.0 + devDeps existentes); sin archivos de audio/imágenes en `public/` ni rutas de recursos |

### Salida real de `npm run validate` (C-18, corrida del 2026-10-07)

```
> npm run validate
> npm run typecheck && npm run test:run && npm run build

> tsc --noEmit            → sin errores
> vitest run              → Test Files 15 passed (15)
                           Tests 119 passed (119)
> tsc --noEmit && vite build
                           → 28 modules transformed
                           ✓ built in 3.23s
```

## Límites

- **No validado (observación manual pendiente en `npm run dev`)**: C-05, C-06,
  C-07, C-08, C-09, C-10, C-13, C-14, C-16 y la integración visual de C-11.
  No hay automatización de navegador en el laboratorio; la confirmación visual
  de la escena queda a cargo de la persona.
- **Spec ausente**: `docs/upgrades/07-distractores-sonoros/spec.md` no existe;
  el contraste usa los criterios del plan aprobado. Si apareciera una spec
  revisada con criterios EC-xx, esta matriz debe reconciliarse.
- **Fallos abiertos**: ninguno conocido. El build muestra el aviso preexistente
  de *chunk > 500 kB* (Phaser), no bloqueante y ajeno a este upgrade.

Una captura o la afirmación del agente no reemplaza un resultado reproducible.