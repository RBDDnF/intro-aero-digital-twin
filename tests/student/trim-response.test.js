import { describe, it, expect } from 'vitest';
import {
  isValidInput,
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  isTrimmed,
  classifyDisturbanceTendency,
  generateCmAlphaPlotData
} from '../../src/student/physics/trim-response.js';

describe('Trim Response Physics (Stage 4)', () => {
  const TOLERANCE = 1e-5;

  describe('Input Validation', () => {
    it('accepts valid finite numbers', () => {
      expect(isValidInput(0.04, -0.8, 2.86, 2.0)).toBe(true);
    });

    it('rejects invalid inputs (NaN, Infinity, undefined, string)', () => {
      expect(isValidInput(NaN, -0.8, 2.86, 2.0)).toBe(false);
      expect(isValidInput(0.04, Infinity, 2.86, 2.0)).toBe(false);
      expect(isValidInput(0.04, -0.8, undefined, 2.0)).toBe(false);
      expect(isValidInput("0.04", -0.8, 2.86, 2.0)).toBe(false);
    });
  });

  describe('Section 9.1 Numerical Case', () => {
    const cm0 = 0.04;
    const cmAlphaPerRad = -0.8;
    const alphaDeg = 2.86;
    const disturbanceDeg = 2.0;

    it('calculates pitching-moment coefficient correctly', () => {
      const cm = calculateCm(cm0, cmAlphaPerRad, alphaDeg);
      expect(cm).toBeCloseTo(0.00006687, 5);
    });

    it('calculates trim angle in degrees correctly', () => {
      const trimDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
      expect(trimDeg).not.toBeNull();
      expect(trimDeg).toBeCloseTo(2.86479, 4);
    });

    it('calculates disturbance delta_Cm correctly', () => {
      const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceDeg);
      expect(deltaCm).toBeCloseTo(-0.0279253, 5);
    });

    it('classifies trim status correctly', () => {
      const cm = calculateCm(cm0, cmAlphaPerRad, alphaDeg);
      expect(isTrimmed(cm)).toBe(false);
    });

    it('classifies disturbance tendency correctly', () => {
      const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceDeg);
      const tendency = classifyDisturbanceTendency(disturbanceDeg, deltaCm);
      expect(tendency).toBe('restoring');
    });
  });

  describe('Section 9.2 Behavioral Case', () => {
    const cm0 = 0.04;
    const cmAlphaPerRad = 0.8; // Positive slope
    const alphaDeg = 2.86;
    const disturbanceDeg = 2.0;

    it('produces positive delta_Cm and destabilizing tendency when Cm_alpha > 0', () => {
      const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceDeg);
      const tendency = classifyDisturbanceTendency(disturbanceDeg, deltaCm);

      expect(deltaCm).toBeGreaterThan(0);
      expect(deltaCm).toBeCloseTo(0.0279253, 5);
      expect(tendency).toBe('destabilizing');
    });
  });

  describe('Section 9.3 Boundary / Sanity Case', () => {
    const cm0 = 0.04;
    const cmAlphaPerRad = 0.0; // Zero slope
    const alphaDeg = 2.86;
    const disturbanceDeg = 2.0;

    it('handles zero Cm_alpha without division by zero', () => {
      const cm = calculateCm(cm0, cmAlphaPerRad, alphaDeg);
      const trimDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
      const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceDeg);
      const tendency = classifyDisturbanceTendency(disturbanceDeg, deltaCm);

      expect(cm).toBeCloseTo(0.04, 6);
      expect(trimDeg).toBeNull(); // Trim angle is not available
      expect(deltaCm).toBe(0);
      expect(tendency).toBe('neutral');
    });
  });

  describe('Plot Data Generation', () => {
    it('generates points from -10 to +10 degrees including selected angle', () => {
      const points = generateCmAlphaPlotData(0.04, -0.8, 2.86, 21);
      expect(points.length).toBeGreaterThanOrEqual(21);
      expect(points[0].x).toBe(-10);
      expect(points[points.length - 1].x).toBe(10);
      
      const containsSelected = points.some((p) => Math.abs(p.x - 2.86) < 1e-4);
      expect(containsSelected).toBe(true);
    });
  });
});