---
id: guardia-sigilo-upgrade-patrulla-pausas-spec
titulo: Spec del upgrade Patrulla con pausas y mirada direccional
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Upgrade Patrulla con pausas y mirada direccional

## Problema

El guardia patrulla siguiendo puntos de control de forma continua sin pausas ni cambio en la orientación de la mirada. Esto dificulta la legibilidad del comportamiento de patrullado y no modela una patrulla realista con puntos de observación donde el agente detiene su avance y barre su campo visual antes de reanudar la marcha.

## Intención

Añadir pausas controladas en cada punto de patrulla, con un barrido direccional de la mirada (-60° a +60° respecto a la dirección de llegada) que se ejecute de forma determinista, sin afectar la arquitectura (dominio puro separado de Phaser) y preservando la reproducibilidad (reinicio R).

## Objetivo

Que el guardia, al llegar a cada punto de control de su ruta cíclica, se detenga durante N segundos ejecutando un barrido de mirada simétrico alrededor de la dirección de llegada, reanudando luego el recorrido hacia el siguiente punto. Todo debe ser observable (telemetría) y verificable mediante pruebas automatizadas en dominio.

## Alcance

- Ruta de patrulla cíclica definida por puntos de control (`PATROL_POINTS`) que incluye el punto de spawn y al menos 4 puntos transitables, validando conectividad entre tramos con A*.
- Al llegar a un punto de control: iniciar pausa de duración N (configurable), interrumpiendo el avance a lo largo de la ruta mientras dure la pausa.
- Durante la pausa: la mirada se orienta interpolando linealmente entre -sweep y +sweep (radianes) respecto a la dirección de llegada normalizada. En fase "walking" la dirección sigue la marcha.
- Reanudación automática al expirar la pausa, pasando al siguiente tramo de la patrulla.
- Clic del ratón cancela la pausa activa y pasa a modo ruta manual (fijando destino). Al completar una ruta manual con waypoints, se reanuda la patrulla desde el índice actual.
- Telemetría HUD indica estado: "pausa X.Xs | barrido ±60°" durante pausa; "patrulla", "patrulla bloqueada" o "ruta manual" fuera de pausa.
- Reinicio (R) restablece índice de patrulla, estado de pausa (con pausa inicial en spawn), facing del guardia y waypoints.
- Caso límite: punto bloqueado/inalcanzable → no se inicia pausa, se marca `patrolBlocked` y HUD muestra "patrulla bloqueada".

## Exclusiones

- No se modifica el comportamiento de búsqueda de caminos (A*/BFS) ni `pathFollower.test.ts`.
- No se añade audio, ni cambios en percepción más allá de lo necesario para mantener la integración existente.
- No se implementa FSM H4 completa (solo la pausa de patrulla específica de este upgrade).
- No se realizan cambios en dependencias del `package.json`.

## Restricciones

- Dominio (`src/domain/`) sin dependencias de Phaser/DOM. Solo tipos y lógica pura.
- Código TypeScript estricto, sin `any`.
- Tiempo inyectado (sin `Date` ni `performance`); deltas y tiempos pasados como parámetros.
- Errores observables y sin fallos silenciosos (validaciones explícitas con mensajes descriptivos).
- Preservar cambios anteriores y no modificar pruebas existentes salvo añadir nuevas.
- Arquitectura: `domain/` puro, `game/` adapta.

## Caso normal

1. Guardián en spawn con ruta de patrulla activa (índice 0).
2. Al completar el tramo hacia un punto de control, llega al punto → se inicia pausa N con base en dirección de llegada normalizada.
3. Durante la pausa, `guardFacing` varía siguiendo barrido de -sweep a +sweep (progreso lineal 0 → 1).
4. Al agotarse `remainingMs`, vuelve a fase "walking" y se calcula/renderiza tramo hacia siguiente punto (índice avanza cíclicamente).
5. HUD refleja estado de pausa con segundos restantes y ±grados de barrido.
6. Clic en mapa cancela pausa, pasa a ruta manual; al llegar a destino manual, reanuda patrulla.

## Caso límite

- Ruta con un solo punto: `nextPatrolPoint` devuelve el mismo punto (wrap cíclico) sin error.
- Ruta vacía: lanza error explícito ("Patrol route must contain at least one point.").
- Índice fuera de rango: lanza error explícito ("Patrol index is outside the route.").
- `pauseMs === 0` o `sweepRadians === 0`: `startPatrolPause` devuelve estado "walking" (pausa sin efecto).
- Dirección de llegada nula (vector cero): se rechaza con error explícito.
- Delta negativo o no finito: se rechaza con error explícito.
- Punto inalcanzable: `patrolBlocked = true`, no se inicia pausa, HUD "patrulla bloqueada".
- Overshoot de delta: `advancePause` clampa a 0 y vuelve a "walking".

## Criterios de aceptación

- [CA-01] `nextPatrolPoint(points, index)` devuelve siguiente punto con wrap cíclico; con un solo punto retorna copia del mismo; rechaza ruta vacía e índice inválido.
- [CA-02] `startPatrolPause(baseFacing, config)` entra en fase "paused" con duración configurada, normaliza base y guarda copia; rechaza vector cero y config inválida.
- [CA-03] Con `pauseMs === 0` o `sweepRadians === 0` devuelve "walking" (caso límite).
- [CA-04] `advancePause(state, delta, config)` reduce `remainingMs`, vuelve a "walking" al agotar (con clamp de overshoot), mantiene estado "walking" inmutable; rechaza delta inválido.
- [CA-05] `pauseGazeFacing(state, config)` devuelve `null` en "walking"; en "paused" interpola -sweep (inicio), 0 (mitad), +sweep (cerca del fin); simétrico y con rotación preservando longitud.
- [CA-06] `PATROL_POINTS` incluye `GUARD_START`, tiene ≥4 puntos transitables y todos los tramos ciclo son alcanzables con A* en mapa de laboratorio.
- [CA-07] Integración en escena: pausa inicial en spawn; llegada a punto → inicia pausa con dirección de llegada; durante pausa no avanza ruta; expira → avanza índice y reanuda; clic cancela pausa y pasa a manual; completar ruta manual reanuda patrulla; `patrolBlocked` evita pausa.
- [CA-08] Telemetría: línea "pausa X.Xs | barrido ±D°" durante pausa; etiquetas correctas fuera de ella.
- [CA-09] Reinicio R restablece estado (índice, pausa, facing, waypoints) de forma reproducible.
- [CA-10] Dominio sin Phaser/DOM; `rotateVector` añadido a modelo; validaciones explícitas y sin fallos silenciosos.

## Evidencia prevista

- Pruebas unitarias: `tests/navigation/patrolRoute.test.ts` (8 pruebas), `tests/navigation/pauseBehavior.test.ts` (22 pruebas).
- Verificación de integración: `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run validate`.
- Evidencia documental: `docs/upgrades/01-patrulla-pausas/evidencia.md` con matriz criterio↔comprobación↔resultado.
- Verificación manual opcional (limitada): `npm run dev` para observar detención, barrido, reanudación y paridad tras R (registrado como no automatizado).
