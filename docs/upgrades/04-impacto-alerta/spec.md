---
id: guardia-sigilo-upgrade-impacto-alerta-spec
titulo: Spec del upgrade Impacto visual extremo de alerta
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Upgrade Impacto visual extremo de alerta

## Problema

Cuando el guardia pasa a nivel `alert` (visión válida), el feedback visual actual no transmite suficiente impacto para que el cambio sea claramente observable. Se requiere un efecto visual dramático pero breve (camera shake + flash) disparado solo al entrar en alerta.

## Intención

Añadir impacto visual extremo al entrar en `AlertLevel === "alert"` (edge-triggered), con parámetros puros, integración acotada a presentación/escena, sin modificar reglas de dominio (alert.ts, percepción) ni pruebas existentes.

## Objetivo

Disparar shake + flash de câmara al producirse la transición hacia `alert` (desde patrol/suspicion), con limpieza correcta, duración total < 1s, HUD permanece fijo, sin dependencias nuevas.

## Alcance

- Módulo puro `alertFeedback.ts` con `AlertFeedbackConfig`, `ALERT_FEEDBACK` (shake 300ms, flash 200ms, flash blanco, intensidad baja), `shouldTriggerAlertFeedback(prev,next)`.
- Integración en `GameScene`: al calcular `nextAlertLevel`, detectar transición hacia alert → ejecutar shake en cámara principal + `uiCamera`, flash en ambas, resetFX adecuado.
- No modificar `src/domain/perception/alert.ts`.

## Exclusiones

- No modificar pruebas existentes de alerta/percepción.
- Sin audio, sin cambiar umbrales.
- Sin FSM H4.

## Restricciones

- Dominio puro separado; presentación/escena adapta. `alertFeedback.ts` solo importa tipo `AlertLevel`.
- TypeScript estricto, sin dependencias nuevas.
- Tiempo/duración explícitos.

## Caso normal

1. Transición `patrol/suspicion` → `alert`: dispara efecto una vez.
2. Permanece en `alert` (visión sostenida): no se re-dispara.
3. Vuelve a `suspicion/patrol` y luego reentra a `alert`: vuelve a dispararse.

## Casos límite

- Transición directa válida hacia alert.
- Transiciones que no alcanzan alert: sin efecto.
- Reinicio R: reinicia estado sin efecto residual.

## Criterios de aceptación

- [CA-01] `shouldTriggerAlertFeedback` devuelve true solo en transición hacia `alert` (edge-triggered). false en otros casos.
- [CA-02] Módulo puro sin Phaser/DOM; solo importa tipo `AlertLevel`.
- [CA-03] Parámetros por defecto: shake 300ms, flash 200ms, flash blanco, intensidad baja; duración total razonable < 1s.
- [CA-04] Integración en escena ejecuta shake+flash en cámaras principales/uiCamera con resetFX apropiado; HUD permanece fijo.
- [CA-05] No se modifican `alert.ts` ni pruebas existentes.
- [CA-06] `npm run validate` pasa.

## Evidencia prevista

- `src/game/presentation/alertFeedback.ts`, `tests/presentation/alertFeedback.test.ts`.
- `docs/upgrades/04-impacto-alerta/evidencia.md` coherente.
- Validación completa.