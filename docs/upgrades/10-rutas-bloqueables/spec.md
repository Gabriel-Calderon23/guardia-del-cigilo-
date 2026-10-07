---
id: guardia-sigilo-upgrade-rutas-bloqueables-spec
titulo: Spec del upgrade Puertas y rutas bloqueables
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Upgrade Puertas y rutas bloqueables

## Problema

El mapa de navegación es estático. Se requiere poder alternar el estado abierto/cerrado de una celda-puerta para que el mapa de navegabilidad usado por A*/BFS cambie dinámicamente, afectando rutas del guardia y evitando que atraviese puertas cerradas, manteniendo coherencia entre representación visual, mapa vivo y replanificación.

## Intención

Modelar una puerta como entidad de dominio (estado), proveer mapa vivo derivado del mapa base + estado puerta, permitir alternarla interactivamente (F cuando armado), validar que cerrar puerta no deja a guardia/jugador en celda bloqueada, y que rutas se replanifiquen correctamente según estado.

## Objetivo

Implementar puerta alternable (abierto/cerrado) con mapa vivo `currentMap`, validaciones seguras al cerrar, presentación visual coherente, telemetría y reinicio reproducible. Sin modificar búsqueda ni pruebas existentes.

## Alcance

- Dominio puro: `door.ts` con estado `DoorState`, helpers para derivar mapa vivo (`createLiveMap`/`isDoorCell` según diseño), validación para cerrar.
- Presentación pura: `doorStyle.ts` para etiquetas/estilo.
- Escena: tecla F (armado) alterna puerta `DOOR_CELL`; al cerrar valida guardia/jugador no ocupan celda; al cambiar estado, actualiza `currentMap`, replanifica ruta activa (patrulla o manual); dibuja rectángulo puerta con color según estado; telemetría door.
- Integración con navegación (A*/BFS usan `currentMap` vivo).

## Exclusiones

- Múltiples puertas (solo `DOOR_CELL`).
- No modificar `search.ts`, `grid.ts` reglas base salvo derivado.
- Sin FSM H4 extensa.

## Restricciones

- Dominio sin Phaser/DOM; presentación pura.
- Validaciones explícitas, sin fallos silenciosos.
- No modificar pruebas existentes.
- Reinicio R restablece estado.

## Caso normal

1. Puerta abierta (inicial). Mapas permiten paso por `DOOR_CELL`.
2. Armar F → alternar a cerrada; si guardia/jugador no están en celda → `currentMap` marca bloqueada, replanifica patrulla/manual.
3. Alternar de nuevo → abierta, replanifica.
4. Cerrar cuando ocupado → rechaza con aviso, mantiene estado.

## Casos límite

- Cerrar puerta con guardia en `DOOR_CELL` → inválido, no cierra (notice).
- Cerrar puerta con jugador en `DOOR_CELL` → inválido.
- Rutas inalcanzables tras cierre → `patrolBlocked`/comportamiento manual coherente.

## Criterios de aceptación

- [CA-01] Dominio `door.ts` modela estado y validaciones puras.
- [CA-02] Mapa vivo derivado: puerta cerrada bloquea `DOOR_CELL`; abierta no.
- [CA-03] Alternado con F solo cuando armado; valida ocupación al cerrar.
- [CA-04] Replanificación al cambiar estado (patrulla activa o manual).
- [CA-05] Presentación y telemetría coherentes; dibujo puerta según estado.
- [CA-06] Reinicio R restablece estado puerta/mapa.
- [CA-07] `npm run validate` pasa, sin modificar pruebas existentes.

## Evidencia prevista

- Código: `src/domain/model/door.ts`, `src/game/presentation/doorStyle.ts`, integración en `GameScene.ts`.
- Tests: `tests/domain/door.test.ts`, `tests/presentation/doorStyle.test.ts`.
- Evidencia: `docs/upgrades/10-rutas-bloqueables/evidencia.md`.
- Validación completa.