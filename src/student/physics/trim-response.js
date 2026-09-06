/**
 * Stage 4 Physics Model: Live Cm–Alpha Relationship and Trim
 *
 * Sign Conventions:
 * - Positive pitching moment (Cm) is nose-up.
 * - Positive angle of attack (alpha) is nose-up.
 *
 * Units:
 * - Angle inputs/outputs: degrees (converted to radians internally for calculations).
 * - Moment coefficients (Cm0, Cm, delta_Cm): dimensionless.
 * - Slope (Cm_alpha): 1/rad.
 *
 * Important Assumptions:
 * - Linear quasi-static model over the investigated angle-of-attack range.
 * - Representing small disturbances about the selected condition.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TRIM_TOLERANCE = 1e-6;

/**
 * Validates that all inputs are finite numbers.
 * @param {number[]} inputs
 * @returns {boolean}
 */
export function isValidInput(...inputs) {
  return inputs.every((val) => typeof val === 'number' && Number.isFinite(val));
}

/**
 * Converts degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
export function degToRad(deg) {
  return deg * DEG_TO_RAD;
}

/**
 * Converts radians to degrees.
 * @param {number} rad
 * @returns {number}
 */
export function radToDeg(rad) {
  return rad * RAD_TO_DEG;
}

/**
 * Calculates pitching moment coefficient at a given angle of attack (in degrees).
 * Cm(alpha) = Cm0 + Cm_alpha * alpha_rad
 * @param {number} cm0 - Dimensionless
 * @param {number} cmAlphaPerRad - 1/rad
 * @param {number} angleOfAttackDeg - deg
 * @returns {number} Dimensionless pitching moment coefficient
 */
export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  if (!isValidInput(cm0, cmAlphaPerRad, angleOfAttackDeg)) {
    return NaN;
  }
  const alphaRad = degToRad(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Calculates trim angle in degrees, or returns null if Cm_alpha is zero.
 * alpha_trim_rad = -Cm0 / Cm_alpha
 * @param {number} cm0 - Dimensionless
 * @param {number} cmAlphaPerRad - 1/rad
 * @returns {number|null} Trim angle in degrees, or null if no unique trim exists
 */
export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  if (!isValidInput(cm0, cmAlphaPerRad)) {
    return null;
  }
  if (cmAlphaPerRad === 0) {
    return null;
  }
  const alphaTrimRad = -cm0 / cmAlphaPerRad;
  return radToDeg(alphaTrimRad);
}

/**
 * Calculates disturbance moment coefficient change.
 * delta_Cm = Cm_alpha * delta_alpha_rad
 * @param {number} cmAlphaPerRad - 1/rad
 * @param {number} disturbanceAlphaDeg - deg
 * @returns {number} Dimensionless change in Cm
 */
export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  if (!isValidInput(cmAlphaPerRad, disturbanceAlphaDeg)) {
    return NaN;
  }
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Checks whether the selected condition is trimmed (|Cm(alpha)| <= 1e-6).
 * @param {number} cm
 * @returns {boolean}
 */
export function isTrimmed(cm) {
  if (!isValidInput(cm)) {
    return false;
  }
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

/**
 * Classifies the disturbance tendency based on sign of delta_alpha_rad * delta_Cm.
 * @param {number} disturbanceAlphaDeg - deg
 * @param {number} deltaCm - dimensionless
 * @returns {string} "restoring", "destabilizing", or "neutral"
 */
export function classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm) {
  if (!isValidInput(disturbanceAlphaDeg, deltaCm)) {
    return 'unknown';
  }
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  const product = deltaAlphaRad * deltaCm;

  if (product < 0) {
    return 'restoring';
  }
  if (product > 0) {
    return 'destabilizing';
  }
  return 'neutral';
}

/**
 * Generates data points for the Cm vs Alpha plot from -10 deg to +10 deg.
 * @param {number} cm0
 * @param {number} cmAlphaPerRad
 * @param {number} selectedAlphaDeg
 * @param {number} numPoints
 * @returns {Array<{x: number, y: number}>}
 */
export function generateCmAlphaPlotData(cm0, cmAlphaPerRad, selectedAlphaDeg, numPoints = 21) {
  if (!isValidInput(cm0, cmAlphaPerRad)) {
    return [];
  }

  const minDeg = -10;
  const maxDeg = 10;
  const step = (maxDeg - minDeg) / (numPoints - 1);
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const alphaDeg = minDeg + i * step;
    const cm = calculateCm(cm0, cmAlphaPerRad, alphaDeg);
    points.push({ x: alphaDeg, y: cm });
  }

  // Ensure selected angle of attack is included if outside normal sample points
  if (
    selectedAlphaDeg !== undefined &&
    isValidInput(selectedAlphaDeg) &&
    !points.some((p) => Math.abs(p.x - selectedAlphaDeg) < 1e-5)
  ) {
    const cmSelected = calculateCm(cm0, cmAlphaPerRad, selectedAlphaDeg);
    points.push({ x: selectedAlphaDeg, y: cmSelected });
    points.sort((a, b) => a.x - b.x);
  }

  return points;
}