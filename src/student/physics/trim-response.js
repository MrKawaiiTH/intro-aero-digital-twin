// Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad,
// angleOfAttackDeg and disturbanceAlphaDeg in degrees.
// Outputs: Cm and delta_Cm dimensionless; trim angle in radians/degrees.
// Sign convention: positive angle of attack and pitching moment are nose-up.
// Assumption: linear, quasi-static Cm-alpha model over the investigated range.

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

export function degreesToRadians(degrees) {
  requireFiniteNumber(degrees, "degrees");
  return degrees * DEG_TO_RAD;
}

export function radiansToDegrees(radians) {
  requireFiniteNumber(radians, "radians");
  return radians * RAD_TO_DEG;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  const trimRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  if (trimRad === null) {
    return null;
  }

  return radiansToDegrees(trimRad);
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * deltaAlphaRad;
}

export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export function classifyDisturbance(disturbanceAlphaDeg, deltaCm) {
  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  requireFiniteNumber(deltaCm, "deltaCm");

  const product = deltaAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}