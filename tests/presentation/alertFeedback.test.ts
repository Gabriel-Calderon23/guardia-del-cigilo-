import { describe, expect, it } from "vitest";
import type { AlertLevel } from "../../src/domain/perception/alert";
import {
  ALERT_FEEDBACK,
  shouldTriggerAlertFeedback,
  totalFeedbackDurationMs,
} from "../../src/game/presentation/alertFeedback";

const LEVELS: readonly AlertLevel[] = ["patrol", "suspicion", "alert"];

describe("alert feedback", () => {
  it("triggers only when entering alert from another level", () => {
    expect(shouldTriggerAlertFeedback("patrol", "alert")).toBe(true);
    expect(shouldTriggerAlertFeedback("suspicion", "alert")).toBe(true);
  });

  it("does not retrigger while alert is sustained", () => {
    expect(shouldTriggerAlertFeedback("alert", "alert")).toBe(false);
  });

  it("does not trigger when leaving alert or staying below it", () => {
    expect(shouldTriggerAlertFeedback("alert", "suspicion")).toBe(false);
    expect(shouldTriggerAlertFeedback("alert", "patrol")).toBe(false);
    expect(shouldTriggerAlertFeedback("patrol", "suspicion")).toBe(false);
    expect(shouldTriggerAlertFeedback("suspicion", "patrol")).toBe(false);
    expect(shouldTriggerAlertFeedback("patrol", "patrol")).toBe(false);
    expect(shouldTriggerAlertFeedback("suspicion", "suspicion")).toBe(false);
  });

  it("triggers again after leaving and re-entering alert", () => {
    expect(shouldTriggerAlertFeedback("suspicion", "alert")).toBe(true);
    expect(shouldTriggerAlertFeedback("alert", "suspicion")).toBe(false);
    expect(shouldTriggerAlertFeedback("suspicion", "alert")).toBe(true);
  });

  it("triggers for every non-alert source level", () => {
    for (const previous of LEVELS) {
      const expected = previous !== "alert";
      expect(shouldTriggerAlertFeedback(previous, "alert")).toBe(expected);
    }
  });

  it("uses the agreed short durations", () => {
    expect(ALERT_FEEDBACK.shakeDurationMs).toBe(300);
    expect(ALERT_FEEDBACK.flashDurationMs).toBe(200);
  });

  it("keeps the whole effect under one second", () => {
    expect(totalFeedbackDurationMs(ALERT_FEEDBACK)).toBeLessThan(1000);
    expect(totalFeedbackDurationMs(ALERT_FEEDBACK)).toBe(300);
  });

  it("keeps intensity non-negative and flash colour in RGB range", () => {
    expect(ALERT_FEEDBACK.shakeIntensity).toBeGreaterThanOrEqual(0);
    expect(ALERT_FEEDBACK.flashColor).toBeGreaterThanOrEqual(0);
    expect(ALERT_FEEDBACK.flashColor).toBeLessThanOrEqual(0xffffff);
  });

  it("rejects invalid durations, intensity and colour", () => {
    expect(() =>
      totalFeedbackDurationMs({ ...ALERT_FEEDBACK, shakeDurationMs: Number.NaN }),
    ).toThrow("Shake duration");
    expect(() =>
      totalFeedbackDurationMs({ ...ALERT_FEEDBACK, shakeDurationMs: 0 }),
    ).toThrow("Shake duration");
    expect(() =>
      totalFeedbackDurationMs({ ...ALERT_FEEDBACK, flashDurationMs: -1 }),
    ).toThrow("Flash duration");
    expect(() =>
      totalFeedbackDurationMs({ ...ALERT_FEEDBACK, shakeIntensity: Number.NaN }),
    ).toThrow("Shake intensity");
    expect(() =>
      totalFeedbackDurationMs({ ...ALERT_FEEDBACK, flashColor: 0x1000000 }),
    ).toThrow("Flash colour");
  });
});
