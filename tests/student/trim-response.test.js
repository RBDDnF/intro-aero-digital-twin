import { describe, expect, it } from "vitest";

import {
  calculateCm,
  calculateTrimAngleRad,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  describe("numerical verification case", () => {
    it("matches the Section 8 reference calculation", () => {
      const cm = calculateCm(0.04, -0.8, 2.86);
      const trimAngleRad = calculateTrimAngleRad(0.04, -0.8);
      const trimAngleDeg = calculateTrimAngleDeg(0.04, -0.8);
      const deltaCm = calculateDeltaCm(-0.8, 2.0);

      expect(cm).toBeCloseTo(0, 6);
      expect(trimAngleRad).toBeCloseTo(0.05, 6);
      expect(trimAngleDeg).toBeCloseTo(2.86, 2);
      expect(deltaCm).toBeCloseTo(-0.028, 6);
      expect(isTrimmed(cm)).toBe(true);
      expect(classifyDisturbance(2.0, deltaCm)).toBe(
        "restoring",
      );
    });
  });

  describe("behavioral verification case", () => {
    it("becomes destabilizing when cmAlphaPerRad changes from -0.8 to +0.8", () => {
      const negativeSlopeDeltaCm = calculateDeltaCm(
        -0.8,
        2.0,
      );
      const positiveSlopeDeltaCm = calculateDeltaCm(
        0.8,
        2.0,
      );

      expect(negativeSlopeDeltaCm).toBeLessThan(0);
      expect(
        classifyDisturbance(2.0, negativeSlopeDeltaCm),
      ).toBe("restoring");

      expect(positiveSlopeDeltaCm).toBeGreaterThan(0);
      expect(
        classifyDisturbance(2.0, positiveSlopeDeltaCm),
      ).toBe("destabilizing");
    });
  });

  describe("boundary and sanity verification case", () => {
    it("handles zero slope without dividing by zero", () => {
      const cm = calculateCm(0.04, 0, 2.86);
      const deltaCm = calculateDeltaCm(0, 2.0);
      const trimAngleRad = calculateTrimAngleRad(0.04, 0);
      const trimAngleDeg = calculateTrimAngleDeg(0.04, 0);

      expect(cm).toBeCloseTo(0.04, 12);
      expect(deltaCm).toBeCloseTo(0, 12);
      expect(trimAngleRad).toBeNull();
      expect(trimAngleDeg).toBeNull();
      expect(
        classifyDisturbance(2.0, deltaCm),
      ).toBe("neutral");
    });
  });

  describe("input validation", () => {
    it("rejects non-finite numeric inputs", () => {
      expect(() =>
        calculateCm(Number.NaN, -0.8, 2.86),
      ).toThrow();

      expect(() =>
        calculateDeltaCm(-0.8, Number.POSITIVE_INFINITY),
      ).toThrow();

      expect(() =>
        calculateTrimAngleDeg(0.04, Number.NaN),
      ).toThrow();
    });
  });
});