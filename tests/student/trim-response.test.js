import { describe, expect, it } from "vitest";

import {
  degreesToRadians,
  calculateCm,
  calculateTrimAngleRad,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  isTrimmed,
  classifyDisturbance,
} from "../../src/student/physics/trim-response.js";

const TOLERANCE = 0.0001;

describe("trim-response physics", () => {
  describe("numerical case", () => {
    it("matches the Section 8 reference calculation", () => {
      const cm0 = 0.04;
      const cmAlphaPerRad = 0.8;
      const angleOfAttackDeg = 2.86;
      const disturbanceAlphaDeg = 2.0;

      const cm = calculateCm(
        cm0,
        cmAlphaPerRad,
        angleOfAttackDeg,
      );
      const trimAngleRad = calculateTrimAngleRad(
        cm0,
        cmAlphaPerRad,
      );
      const trimAngleDeg = calculateTrimAngleDeg(
        cm0,
        cmAlphaPerRad,
      );
      const deltaCm = calculateDeltaCm(
        cmAlphaPerRad,
        disturbanceAlphaDeg,
      );

      expect(cm).toBeCloseTo(0.0799, 4);
      expect(trimAngleRad).toBeCloseTo(-0.05, 4);
      expect(trimAngleDeg).toBeCloseTo(-2.8648, 4);
      expect(deltaCm).toBeCloseTo(0.02793, 4);
      expect(isTrimmed(cm)).toBe(false);
      expect(
        classifyDisturbance(disturbanceAlphaDeg, deltaCm),
      ).toBe("destabilizing");
    });
  });

  describe("behavioral case", () => {
    it("makes delta_Cm increase toward zero as a negative slope increases toward zero", () => {
      const disturbanceAlphaDeg = 2.0;

      const deltaCmAtNegativeSlope = calculateDeltaCm(
        -0.8,
        disturbanceAlphaDeg,
      );
      const deltaCmNearZero = calculateDeltaCm(
        -0.2,
        disturbanceAlphaDeg,
      );

      expect(deltaCmNearZero).toBeGreaterThan(
        deltaCmAtNegativeSlope,
      );
      expect(deltaCmNearZero).toBeLessThan(0);
    });
  });

  describe("boundary and sanity case", () => {
    it("returns zero disturbance change and no trim angle for zero slope", () => {
      const deltaCm = calculateDeltaCm(0, 2.0);
      const trimAngleRad = calculateTrimAngleRad(0.04, 0);

      expect(deltaCm).toBe(0);
      expect(trimAngleRad).toBeNull();
    });
  });

  describe("unit conversion", () => {
    it("converts degrees to radians before applying the per-radian slope", () => {
      expect(degreesToRadians(2.0)).toBeCloseTo(
        0.034906585,
        4,
      );
    });
  });

  describe("trim tolerance", () => {
    it("treats Cm within 1e-6 of zero as trimmed", () => {
      expect(isTrimmed(1e-6)).toBe(true);
      expect(isTrimmed(-1e-6)).toBe(true);
      expect(isTrimmed(1.0001e-6)).toBe(false);
    });
  });

  describe("disturbance classification", () => {
    it("classifies a negative product as restoring", () => {
      expect(classifyDisturbance(2.0, -0.1)).toBe("restoring");
    });

    it("classifies a positive product as destabilizing", () => {
      expect(classifyDisturbance(2.0, 0.1)).toBe("destabilizing");
    });

    it("classifies a zero product as neutral", () => {
      expect(classifyDisturbance(0, 0)).toBe("neutral");
    });
  });

  describe("input validation", () => {
    it("rejects non-finite numeric inputs", () => {
      expect(() => degreesToRadians(Number.NaN)).toThrow();
      expect(() => calculateCm(0.04, 0.8, Infinity)).toThrow();
      expect(() => calculateDeltaCm(0.8, Number.NaN)).toThrow();
    });
  });
});