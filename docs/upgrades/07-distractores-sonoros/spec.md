---
id: guardia-sigilo-upgrade-distractores-sonoros-spec
titulo: Spec del upgrade Distractores sonoros interactivos
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Upgrade Distractores sonoros interactivos

## Problema

El jugador puede emitir un sonido (Q), pero no dispone de un distractor interactivo que pueda activarse en una celda elegida para atraer la atención del guardia. Se requiere modelar la activación del distractor, su efecto en percepción y la respuesta de investigación del guardia, manteniendo separación dominio/presentación y sin modificar reglas existentes de percepción/memoria/alerta.

## Intención

Añadir un distractor sonoro interactivo: el jugador lo arma (E), hace clic en una celda transitable para activarlo (generando un `SoundEvent` reutilizable por `evaluateSound`), y el guardia investiga el origen del ruido cuando lo oye sin visión visible, siguiendo una ruta hacia la celda, inspeccionando brevemente y retomando su patrulla desde el índice actual. Todo con módulos puros de dominio y presentación mínima.

## Objetivo

Permitir activar un distractor sonoro en una celda transitable, inyectarlo en el estado de percepción (reutilizando parámetros existentes), hacer que el guardia navegue al origen, realice una pausa/inspección breve y retome la patrulla de forma determinista. Debe cumplir arquitectura (dominio sin Phaser/DOM), errores explícitos, prioridad visión>sonido y paridad tras reinicio R.

## Alcance

- Dominio puro: `distractor.ts` valida celda transitable, crea `SoundEvent` en centro de celda con config (radius 190, durationMs 800, cooldownMs 500 por defecto), `canActivateDistractor` con enfriamiento.
- Dominio puro: `investigationBehavior.ts` modela fases `idle|traveling|inspecting`, temporizador inyectado, predicados `shouldStartInvestigation`/`shouldCancelInvestigation` con prioridad visión>sonido.
- Escena: tecla E arma/desarma distractor; clic cuando armado activa distractor (valida transitable/cooldown), crea SoundEvent e inyecta con `withSoundEvent`, registra `distractorCell`, `lastDistractorAtMs`. No mueve guardia.
- Investigación: al oír sonido sin visión (desde idle), inicia investigación hacia posición del sonido (calcula ruta A*/BFS), al llegar pasa a inspecting (reusa tiempo breve), al terminar vuelve a idle y reanuda patrulla desde índice actual. Ruido inalcanzable → fracaso explícito (notice) sin fallar silenciosamente; visión cancela investigación.
- Presentación: marcador de celda activada y anillo de sonido (reutilizado), estilos puros `distractorStyle.ts`, telemetría HUD con estado distractor e investigación.
- Reinicio R restablece estado distractor/investigación.

## Exclusiones

- No modificar `perception.ts`, `memory.ts`, `alert.ts`, `pauseBehavior.ts`, `patrolRoute.ts`, `pathFollower.ts`, `search.ts` ni sus pruebas.
- Sin inventario ni múltiples distractores activos simultáneamente (un slot). Activar nuevo reemplaza sonido vigente.
- Sin audio (solo dibujo por código).
- No implementar FSM H4 completa; se añade comportamiento acotado de investigación necesario.

## Restricciones

- Dominio sin Phaser/DOM. Presentación sin lógica de decisión.
- Tiempo inyectado (sin Date/performance).
- Errores observables y sin fallos silenciosos.
- No modificar pruebas existentes; solo añadir nuevas.
- Arquitectura por capas respetada.

## Caso normal

1. Jugador pulsa E → distractor armado (HUD).
2. Clic en celda transitable → crea SoundEvent (centro), inyecta, registra celda, activa enfriamiento, muestra marcador/anillo.
3. Guardián oye sonido sin visión → calcula ruta a origen, pasa a traveling, navega.
4. Al llegar → pasa a inspecting (pausa breve), HUD muestra inspección.
5. Al expirar → vuelve idle, reanuda patrulla desde índice actual.
6. Visión válida aparece → cancela investigación (prioridad visión>sonido).

## Casos límite

- Celda bloqueada/fuera mapa: no activa, notice "CELDA INVALIDA" (error explícito).
- Cooldown activo: rechaza, notice "EN ENFRIAMIENTO".
- inspectMs==0: arrive devuelve idle inmediatamente.
- Ruido inalcanzable (ruta status != success): notice "RUIDO INALCANZABLE (...)", no inicia traveling.
- Mismo origen repetido: si ya investigando esa celda, no reinicia innecesariamente.
- Reinicio R: limpia distractor e investigación.

## Criterios de aceptación

- [CA-01] `createDistractorSoundEvent` valida walkable, retorna SoundEvent centro con params correctos; `canActivateDistractor` respeta cooldown (incluye 0).
- [CA-02] Dominio distractor sin Phaser/DOM; errores explícitos.
- [CA-03] `investigationBehavior`: start/travel/inspect con tiempo inyectado, arrive/advance correctos, shouldStartInvestigation (idle, sin visión, con sonido), shouldCancelInvestigation (activo + visión).
- [CA-04] Tecla E arma/desarma; clic armado activa solo en celda válida/transitable, respeta cooldown, inyecta SoundEvent (reemplaza anterior), no mueve guardia.
- [CA-05] Investigación inicia solo sin visión y con sonido oído; navega a origen, inspecciona, retorna patrulla desde índice actual. Visión prevalece.
- [CA-06] Ruido inalcanzable → fracaso explícito, sin fallo silencioso, retorna conducta actual.
- [CA-07] Presentación: marcador/anillo mientras sonido activo; telemetría distractor e investigación coherentes.
- [CA-08] Reinicio R limpia estados; dominio presentación puros.
- [CA-09] `npm run validate` pasa (typecheck + test:run + build). Sin modificar pruebas existentes.

## Evidencia prevista

- Tests: `tests/perception/distractor.test.ts` (7), `tests/navigation/investigationBehavior.test.ts` (9), `tests/presentation/distractorStyle.test.ts` (5).
- Código: `src/domain/perception/distractor.ts`, `src/domain/navigation/investigationBehavior.ts`, `src/game/presentation/distractorStyle.ts`, `src/game/scenes/GameScene.ts` (ediciones acotadas).
- Evidencia: `docs/upgrades/07-distractores-sonoros/evidencia.md`.
- Validación completa + manual limitado registrado.