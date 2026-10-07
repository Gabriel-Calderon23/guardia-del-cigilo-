---
id: guardia-sigilo-upgrade-rutas-bloqueables-evidencia
titulo: Evidencia de pruebas del upgrade Puertas y rutas bloqueables
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 2
---

# Evidencia de pruebas — Upgrade Puertas y rutas bloqueables

- Criterio validado: [`spec.md`](./spec.md) (EC-01…EC-12), supuestos A1–A5 e
  incrementos 1–5 de [`plan.md`](./plan.md).
- Versión: repositorio sin git; diferencias por archivos. Incrementos 1–5
  aplicados sobre la base H3.
- Entorno: Windows, Node v24.21.0, npm 12.0.2 instalado (`packageManager`
  declarado: npm 10.8.2), Phaser 3.90.0, Vite 6.4.3, Vitest 4.1.10,
  TypeScript 5.9.3. Verificación: 2026-10-07, `npm run validate`.

## Contraste de la implementación con cada criterio

| Criterio | Verificación sobre el código | Resultado |
|---|---|---|
| EC-01 — `withDoorState` puro, sin mutar el original, celda fuera del mapa | `door.ts`: copia siempre `blocked` y devuelve `GridMap` nuevo; `!isInside` → `{ok:false, reason:"out-of-bounds"}`; 5 pruebas en `door.test.ts` | aprobado (automatizado) |
| EC-02 — `canToggleDoor` con ocupación | `door.ts`: `"occupied"` sólo con jugador/guardia en la celda; 5 pruebas (ok, ocupada vacía/fuera, invariante) | aprobado (automatizado) |
| EC-03 — dominio sin Phaser/DOM | imports reales: `door.ts` → sólo `./grid`; `doorStyle.ts` → sólo `type GridPoint` | aprobado (inspección) |
| EC-04 — `F` arma/desarma, clic alterna sólo `DOOR_CELL`, clic sin `F` fija destino, `E` antes que `F` | `GameScene`: `KeyCodes.F` en `create()`; en `handlePointerDown` la rama puerta va después del distractor (`E`) y antes de la ruta manual; `toggleDoorAt` valida `(x,y) === DOOR_CELL` y avisa `SOLO PUERTA`/`CELDA OCUPADA`; clic sin `F` inalterado | aprobado por inspección; runtime manual pendiente |
| EC-05 — A*/BFS no cruzan la celda cerrada; destino inaccesible explícito | 8 pruebas `describe.each` BFS/A* en `door.test.ts` (avoid/unreachable/invalid-goal) sobre mapa alternado con `withDoorState`; la escena calcula sobre `this.currentMap` | aprobado (automatizado, dominio); desvío visual manual pendiente |
| EC-06 — replanificación en el mismo evento; fracaso visible; retoma al abrir | `setDoorClosed` → `replanAfterDoorChange()` (sólo en el evento, sin bucle por fotograma); dispatch patrulla/manual/investigación con estados `patrolBlocked`, `status`, aviso `RUTA BLOQUEADA`; al abrir retoma | aprobado por inspección; runtime manual pendiente |
| EC-07 — celda cerrada bloquea collider y ocluye visión; `evaluateSound` intacto | rectángulo añadido/quitado en `walls` (collider del jugador); percepción pasa `map: this.currentMap` (éxito de visión a través de la celda); módulo de sonido sin cambios | aprobado por inspección; bloqueo/oclusión visual manual pendiente |
| EC-08 — línea HUD `puerta @6,10: ABIERTA/CERRADA` sin romper líneas previas; estilo en módulo puro | `doorTelemetryLine` en `updateTelemetry` al final de las líneas previas; `doorStyle.ts` sin Phaser; 5 pruebas en `doorStyle.test.ts` (formato de etiqueta) | aprobado (formato/estilo automatizado); render del HUD manual pendiente |
| EC-09 — `R` restaura puerta abierta y mapa base | `create()` resetea `doorArmed=false`, `doorClosed=false`, `currentMap=LAB_MAP`, rect=null antes del reinicio | aprobado por inspección; paridad visual manual pendiente |
| EC-10 — pruebas previas intactas + nuevas en archivos propios | `npm run test:run`: 15 archivos / 119 pruebas previas + `door.test.ts` (18) + `doorStyle.test.ts` (5) = 17 archivos / 142 pruebas | aprobado (automatizado) |
| EC-11 — `npm run validate` íntegro | `npm run validate` (typecheck + test:run + build) | aprobado (automatizado) |
| EC-12 — sin dependencias nuevas ni recursos externos | `package.json` sin cambios: `dependencies` = Phaser 3.90.0; `devDependencies` previas | aprobado (inspección) |

## Ejecución

| Caso | Método | Comando o pasos | Resultado | Evidencia |
|---|---|---|---|---|
| Camino principal (inc. 1–4) | automatizado | `npm run test:run` y `npm run build` por incremento | aprobado | typecheck y build OK en cada incremento; 142 pruebas al final |
| Validación integral | automatizado | `npm run validate` | aprobado | salida de 2026-10-07, abajo |
| Import limpio | inspección | grep de imports de `door.ts`/`doorStyle.ts` | aprobado | `./grid` y `type GridPoint` únicamente |
| Interacción en navegador | manual | `npm run dev`: `F`+clic, prioridad `E`, desvío de ruta, bloqueo, visión, HUD, `R` | pendiente | ver «Límites» |
| Límite: celda negada para caminar | automatizado | `door.test.ts` (A*/BFS con `withDoorState`) | aprobado | 8 pruebas |
| Error: celda fuera del mapa / destino cerrado | automatizado | `door.test.ts` (`out-of-bounds`, `invalid-goal`, `unreachable`) | aprobado | 18 pruebas de dominio en total |

Salida resumida de `npm run validate`:

```
tsc --noEmit            → sin errores
vitest run              → 17 archivos pasados / 142 pruebas pasadas
vite build              → 30 módulos transformados, dist/index-*.js generado
```

## Límites

- **No validado (manual, requiere `npm run dev` y observación humana):**
  - EC-04 (interacción `F` + clic y prioridad `E` sobre `F` en la escena).
  - EC-05 en escena (desvío visible del guardia con ruta activa).
  - EC-06 (replanificación inmediata, fracaso en HUD y retoma al abrir).
  - EC-07 (bloqueo físico del collider y oclusión visual de la celda cerrada).
  - EC-08 (render de la línea de HUD sobre las líneas previas).
  - EC-09 (paridad visual tras `R`).
  - Se registran como **pendientes** sin declarar evidencia inexistente
    (plantilla: una afirmación no reemplaza un resultado reproducible). El
    verificador debe correr `npm run dev`.
- **No validado (fuera de alcance):** puertas múltiples, entorno alternando
  puertas, oclusión de sonido, máquina de estados H4 y automatización
  navegador/e2e.
- **Fallos abiertos:** ninguno conocido en la parte automatizada. El aviso de
  chunk de Vite (> 500 kB, por Phaser) es un aviso de build preexistente, no
  un fallo.