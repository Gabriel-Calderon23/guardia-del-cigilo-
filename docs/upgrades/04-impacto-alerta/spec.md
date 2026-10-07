---
id: guardia-sigilo-upgrade-impacto-alerta-spec
titulo: Spec del upgrade Impacto visual extremo de alerta
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Upgrade Impacto visual extremo de alerta

## Objetivo

Ofrecer un feedback visual dramático e inconfundible cuando el jugador es detectado
(entrada al nivel máximo de alerta), mediante un camera shake corto y un flash en
pantalla que terminen limpios y restablezcan cámara y HUD en menos de 1 segundo.

## Alcance

- Disparar el efecto al **entrar** en `AlertLevel === "alert"` (edge-triggered):
  una vez por transición desde `patrol` o `suspicion` hacia `alert`.
- Camera shake de **300 ms**.
- Flash en pantalla de **200 ms** (blanco), mediante la API de cámara de Phaser.
- Duración total del efecto: 300 ms (< 1000 ms), con cámara y HUD restablecidos.
- Lógica de parámetros/disparo en un módulo **puro y testeable** bajo
  `src/game/presentation/`, siguiendo el patrón de `visionStyle.ts`.
- Llamadas Phaser (`this.cameras.main.shake`, `.flash`, `.resetFX`) en `GameScene`.
- El shake **no** debe desplazar el HUD: el HUD permanece fijo y legible.
- El reinicio `R` (`scene.restart()`) deja cámara y HUD limpias.

## Exclusiones

- No agregar arte, audio ni recursos externos (todo por código).
- No agregar dependencias.
- No modificar `src/domain/` ni `src/application/` (el efecto es presentación).
- `suspicion` y `patrol` no disparan el impacto fuerte.
- No implementar la máquina de estados H4 ni cambiar cómo se deriva la alerta.
- No automatización de navegador/end-to-end; la verificación en escena queda manual.
- No commit, publicación ni despliegue.

## Restricciones

- `AGENTS.md` y `docs/arquitectura.md`: `src/domain/` sin Phaser/DOM; `src/game/`
  adapta y no decide reglas de comportamiento; presentación no decide conducta.
- `specs/01-producto.md`: fuera de alcance arte/animaciones de producción y
  recursos externos; el escenario base se dibuja por código.
- `docs/permisos-recomendados.md`: editar sólo archivos de esta spec aprobada;
  validar con `npm run validate` antes de declarar terminado.
- `docs/evidencias/h3-validacion.md`: sin automatización de navegador; la
  verificación visual es manual.
- H4 sigue pendiente: `AlertLevel` es una derivación observable de percepción,
  no el estado real de una FSM.

## Decisiones de diseño confirmadas

1. Disparador: **sólo al entrar en alerta** (edge-triggered), sin re-disparo
   mientras la visión siga válida.
2. Duración/estilo: **shake 300 ms + flash 200 ms** (flash blanco, shake de baja
   intensidad).
3. Mecanismo: **API de cámara de Phaser** (`shake`/`flash`), limpieza con
   `resetFX()`.
4. Ubicación: **módulo puro en `src/game/presentation/` + adaptador en
   `GameScene`**, con pruebas dedicadas.
5. HUD: **permanece fijo** durante el shake.

## Caso normal

1. El jugador entra en el cono con visión válida.
2. `evaluateAlertLevel` pasa de `patrol`/`suspicion` a `alert`.
3. El módulo puro detecta la transición y expone los parámetros del efecto.
4. `GameScene` ejecuta shake (300 ms) + flash (200 ms).
5. A los ~300 ms la cámara vuelve a su estado y el HUD permanece fijo y legible.

## Casos límite

- Visión sostenida: el efecto se dispara una sola vez hasta volver a un nivel
  menor y reentrar.
- Reentrada rápida alerta → no-alerta → alerta: vuelve a dispararse (sin cooldown
  según la decisión 1).
- Sonido o memoria dentro de ventana (`suspicion`): no dispara el impacto fuerte.
- Reinicio `R` durante el efecto: `create()` reinicia y no quedan restos de shake
  ni flash.
- Efecto aún activo y nueva entrada a alerta: no se apilan efectos; el estado
  termina limpio.
- `prefers-reduced-motion` u opción de desactivar: **no** contemplado en esta
  iteración (exclusión).

## Criterios de aceptación

- **EC-01** — Función pura de disparo (p. ej. `shouldTriggerAlertFeedback(prev, next)`)
  devuelve `true` sólo cuando `next === "alert"` y `prev !== "alert"`.
- **EC-02** — Tabla/config de parámetros pura con shake 300 ms y flash 200 ms;
  duración total < 1000 ms (asertado en prueba).
- **EC-03** — El módulo de presentación no importa Phaser (verificado por imports
  y `typecheck`).
- **EC-04** — `GameScene` invoca `cameras.main.shake(...)` y `flash(...)` en la
  transición a alerta y limpia con `resetFX()`; no se re-dispara por fotograma.
- **EC-05** — El HUD permanece fijo durante el shake (no se desplaza).
- **EC-06** — `updateTelemetry` conserva/refleja el nivel `alert` sin romper la
  telemetría previa.
- **EC-07** — `R` restablece cámara/HUD (sin shake ni flash residuales).
- **EC-08** — Pruebas previas intactas; nuevas pruebas de presentación en
  `tests/presentation/`.
- **EC-09** — `npm run validate` finaliza correctamente.
- **EC-10** — Sin dependencias nuevas ni recursos externos.

## Evidencia prevista

- Pruebas nuevas: `tests/presentation/alertFeedback.test.ts` (disparo por
  transición, no-disparo en sostenido/suspicion/patrol, parámetros y total < 1s).
- Pruebas existentes intactas: `tests/presentation/visionStyle.test.ts`,
  `tests/perception/alert.test.ts`, `tests/perception/perception.test.ts`, etc.
- `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run validate`.
- Inspección de imports del módulo puro (sin Phaser/DOM).
- Verificación visual **manual** en `npm run dev`: disparo, limpieza < 1s, HUD
  fijo y paridad tras `R`.
- Documento de evidencia posterior en `docs/upgrades/04-impacto-alerta/evidencia.md`
  según `docs/plantillas/evidencia-pruebas.md`.

## Supuestos y dependencias

- A1: "alerta máxima" = `AlertLevel === "alert"` (`src/domain/perception/alert.ts`).
- A2: se reutiliza el patrón de presentación pura de
  `src/game/presentation/visionStyle.ts`.
- A3: el disparador lógico ya existe en `GameScene.updatePerception`; sólo se
  agrega la comparación con el nivel previo.
- A4: mecanismo propuesto para HUD fijo — una cámara dedicada para el HUD que no
  recibe el shake (la cámara principal ignora los objetos de HUD), o compensación
  equivalente. A confirmar en revisión.
- A5: `AlertLevel` podría reemplazarse por el estado real cuando se implemente H4
  (reconciliación futura).

## Preguntas abiertas

- Ninguna bloqueante para esta iteración. Queda a revisión el mecanismo concreto
  del HUD fijo (A4) y si más adelante se desea opción de desactivar el efecto.
