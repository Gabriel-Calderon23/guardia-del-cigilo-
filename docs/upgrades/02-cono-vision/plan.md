---
id: guardia-sigilo-upgrade-cono-vision-plan
titulo: Plan por incrementos del upgrade Cono de visión visible y reactivo
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Upgrade Cono de visión visible y reactivo

Spec de referencia: [`spec.md`](./spec.md).

## Condiciones globales

- Sin dependencias nuevas.
- Sin modificar `src/domain/` (percepción/alerta/memoria). Solo presentación/escena.
- No modificar pruebas existentes. Añadir nuevas solo si necesario y coherente.
- Presentación pura (`src/game/presentation/`), sin Phaser/DOM.
- Validar con `npm run validate`.

## Incremento 1 — Verificar módulo de estilos de visión

**Archivos:** `src/game/presentation/visionStyle.ts` (existente), `tests/presentation/visionStyle.test.ts` (existente).

**Cambios:** verificar consistencia (mapa AlertLevel → color/alpha). No alterar si cumple.

**Criterio:** CA-01, CA-03, CA-04.

**Comandos:** `npm run test:run`, `npm run typecheck`.

**Riesgo:** bajo.

## Incremento 2 — Integrar estilo reactivo en escena

**Archivos:** `src/game/scenes/GameScene.ts` (editar).

**Cambios acotados:** en `drawPerception(level: AlertLevel)`, usar `visionStyleFor(level)` para rellenar el arco del cono (color/alpha). Ya presente según código (`visionStyleFor` importado y usado). Verificar coherencia con facing/FOV/rango.

**Criterio:** CA-02, CA-05.

**Comandos:** `npm run typecheck`, `npm run build`.

**Riesgo:** bajo.

## Incremento 3 — Verificación y evidencia

**Archivos:** `docs/upgrades/02-cono-vision/spec.md` (crear), `plan.md` (crear), `evidencia.md` (mantener coherente).

**Cambios:** asegurar matriz cubre CA-01–CA-06.

**Comandos:** `npm run validate`.

**Riesgo:** bajo.

## Resumen

| Inc | Archivos | Acción |
|---|---|---|
| 1 | `visionStyle.ts`, `visionStyle.test.ts` | verificar (ya existen) |
| 2 | `GameScene.ts` | verificar integración (ya existe) |
| 3 | `spec.md`, `plan.md`, `evidencia.md` | crear/ajustar |

## Comandos

```bash
cd guardia-del-cigilo-
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
npm.cmd run validate
```
