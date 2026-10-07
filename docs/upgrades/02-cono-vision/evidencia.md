---
id: guardia-sigilo-upgrade-cono-vision-evidencia
titulo: Evidencia del upgrade Cono de visión visible y reactivo
tipo: referencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia — Upgrade Cono de visión visible y reactivo

- Criterio validado: spec del upgrade acordada en sesión (intención de diseño, supuestos A1–A4 y plan por incrementos aprobado) y plantilla [`docs/plantillas/evidencia-pruebas.md`](../plantillas/evidencia-pruebas.md). La ruta `docs/upgrades/02-cono-vision/` no contenía `spec.md` al momento de esta evidencia; se tomó como referencia la spec acordada en conversación, igual que se documentó en el upgrade 01. **Si existe un `spec.md` con criterios distintos, esta matriz debe rehacerse contra él.**
- Versión inicial: estado posterior al upgrade 01 (8 archivos de prueba, 69 pruebas).
- Versión final: incrementos 1 a 4 aplicados (11 archivos de prueba, 90 pruebas). **El incremento 4 quedó parcial: no se integró el dibujo del polígono en la escena** (ver EC-08).
- Entorno de ejecución: Windows; Node.js v24.21.0; npm 12.0.2; Phaser 3.90.0; Vite 6.4.3; Vitest 4.1.10; TypeScript 5.9.3.

## Criterios derivados de la spec acordada

- **EC-01** — Nivel de alerta puro a partir de percepción: visión válida → `alert`; sonido audido o memoria dentro de la ventana → `suspicion`; sin señales → `patrol`; prioridad visión > sonido > memoria.
- **EC-02** — La ventana de sospecha se inyecta (no hay umbral fijo dentro del dominio).
- **EC-03** — Configuración o señales inválidas fallan de forma explícita.
- **EC-04** — Mapeo alerta → estilo con tres colores distintos: patrulla verde, sospecha amarillo, alerta rojo.
- **EC-05** — El cono cambia de color al instante según el nivel y el HUD muestra el nivel de alerta.
- **EC-06** — Polígono/malla del cono de visión recortado por paredes, reutilizando la lógica de oclusión.
- **EC-07** — La semántica de oclusión previa (regla conservadora de esquinas) se preserva.
- **EC-08** — El polígono se dibuja en la escena (`GameScene.drawPerception`).
- **EC-09** — `npm run validate` finaliza correctamente.
- **EC-10** — Restricciones: `src/domain/` sin Phaser/DOM; sin dependencias nuevas; pruebas previas intactas.

## Matriz Criterio → Comprobación → Resultado real

| Criterio | Comprobación | Resultado real |
|---|---|---|
| EC-01 | `evaluateAlertLevel` en `src/domain/perception/alert.ts`; pruebas `tests/perception/alert.test.ts` (visión, sonido, memoria, prioridad, límite de ventana) | **OK** — 10 pruebas |
| EC-02 | `AlertConfig { suspicionWindowMs }` inyectado por el llamador; el dominio no fija constantes temporales | **OK** — el valor `2000` vive en `GameScene`, no en el dominio |
| EC-03 | Pruebas «rejects invalid configuration and signals» (ventana y edad no finitas/negativas) | **OK** |
| EC-04 | `VISION_STYLES` / `visionStyleFor` en `src/game/presentation/visionStyle.ts`; pruebas `tests/presentation/visionStyle.test.ts` (3 colores distintos, verde de patrulla, alfa en rango) | **OK** — 5 pruebas |
| EC-05 | `GameScene.updatePerception` calcula el nivel; `drawPerception(level)` aplica `visionStyleFor`; `updateTelemetry` agrega `alerta <nivel>` | **OK por código** — `typecheck` y `build` verdes; verificación visual manual pendiente (sin automatización de navegador) |
| EC-06 | `computeVisionPolygon` en `src/domain/perception/visionPolygon.ts` sobre `traceVisionRay`; pruebas `tests/perception/visionPolygon.test.ts` (rango completo, recorte por pared, esquina conservadora, FOV 0, config inválida) | **OK** — 6 pruebas |
| EC-07 | Refactor de `perception.ts`: `lineIsOccluded` delega en `traceVisionRay`; las 8 pruebas previas de `tests/perception/perception.test.ts` siguen verdes | **OK** |
| EC-08 | Dibujo del polígono en `GameScene.drawPerception` | **NO VALIDADO / PENDIENTE** — no se autorizó editar `GameScene.ts` para reemplazar el `arc(...)` por el polígono; la escena sigue pintando el sector |
| EC-09 | `npm.cmd run validate` | **OK** — typecheck + 90/90 pruebas + build |
| EC-10 | Inspección de imports; `package.json` sin cambios; pruebas previas intactas | **OK** — dominio sin Phaser/DOM; 0 dependencias nuevas |

## Comandos ejecutados y códigos de salida

| Fase | Comando | Código de salida | Resultado |
|---|---|---|---|
| Inc. 1 | `npm.cmd run test:run` | 0 | 9 archivos / 79 pruebas aprobadas |
| Inc. 2 | `npm.cmd run test:run` | 0 | 10 archivos / 84 pruebas aprobadas |
| Inc. 3 | `npm.cmd run typecheck` | 0 | Sin errores |
| Inc. 3 | `npm.cmd run build` | 0 | 24 módulos transformados; `dist/` generado |
| Inc. 4 | `npm.cmd run test:run` | 1 → 0 | Primer run: 1 fallo de test por supuesto de mapa acotado; se corrigió el test. Segundo run: 11 archivos / 90 pruebas |
| **Integración** | `npm.cmd run validate` | **0** | typecheck + 90/90 pruebas + build, todo aprobado |
| Entorno | `node --version` / `npm.cmd --version` | 0 | v24.21.0 / 12.0.2 |

Nota: `npm.ps1` está bloqueado por la política de ejecución de PowerShell; se usó `npm.cmd`. El warning de chunk > 500 kB en `vite build` es preexistente (Phaser completo) y no bloquea.

## Modificaciones clave (diff resumido)

- `src/domain/perception/alert.ts` (nuevo) — `AlertLevel`, `AlertSignals`, `AlertConfig`, `evaluateAlertLevel`; puro y testeable.
- `src/game/presentation/visionStyle.ts` (nuevo) — `VisionStyle`, `VISION_STYLES`, `visionStyleFor`; mapeo alerta → color/alfa sin depender de Phaser.
- `src/game/scenes/GameScene.ts` — import de alerta y estilo; `SUSPICION_WINDOW_MS = 2000` y `ALERT_CONFIG`; `ALERT_LABELS`; campo `alertLevel`; cálculo en `updatePerception`; `drawPerception(level)` usa `visionStyleFor`; línea `alerta <nivel>` en el HUD.
- `src/domain/perception/perception.ts` — extraído/exportado `traceVisionRay` (`RayTrace`) desde `lineIsOccluded`, que ahora delega; se preserva la regla conservadora de esquinas.
- `src/domain/perception/visionPolygon.ts` (nuevo) — `VisionPolygonInput`, `computeVisionPolygon`; vértice + un punto por rayo.
- Pruebas nuevas — `tests/perception/alert.test.ts` (10), `tests/presentation/visionStyle.test.ts` (5), `tests/perception/visionPolygon.test.ts` (6).

## Decisiones humanas asumidas

- Supuestos A1–A4 aprobados: alerta derivada de percepción (sin FSM H4); niveles `patrol`/`suspicion`/`alert`; cambio discreto e inmediato; abanico recortado por oclusión.
- Colores: patrulla `0x73c991` (verde previo de H3), sospecha `0xf2c94c` (amarillo), alerta `0xe16969` (rojo); alfa uniforme `0.16`. Son constantes de presentación, ajustables.
- `SUSPICION_WINDOW_MS = 2000` definido en la capa juego (Incremento 3), no en el dominio.
- El cono se recorta también en el borde del mapa (celdas fuera de la cuadrícula no son transitables). Aceptado como comportamiento correcto.
- La verificación visual en escena queda manual; no hay automatización de navegador.

## Límites y fallos abiertos

- **EC-08 no cumplido:** el polígono calculado aún no se dibuja; `GameScene.drawPerception` conserva `arc(...)` (sector). Falta autorización para editar `GameScene.ts` y elegir `rayCount`.
- La spec `docs/upgrades/02-cono-vision/spec.md` no existe en el repositorio; EC-01…EC-10 provienen de la spec acordada en sesión.
- `docs/h3-percepcion-movimiento.md` (línea 42) quedó desactualizado: describe verde durante detección, mientras el nuevo esquema usa verde en patrulla y rojo en alerta. Actualización fuera del alcance autorizado.
- Repositorio sin `.git`: no hay commit ni versión por hash; la versión se describe por estado de archivos.
- Reconciliación futura: al implementar H4, `evaluateAlertLevel` podría reemplazarse por el estado real de la máquina de estados.
- Riesgo de rendimiento del abanico (rayos × celdas) no ejercitado en escena por falta de la integración de dibujo.
