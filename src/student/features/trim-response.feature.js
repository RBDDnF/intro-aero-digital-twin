import {
  isValidInput,
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  isTrimmed,
  classifyDisturbanceTendency,
  generateCmAlphaPlotData
} from '../physics/trim-response.js';

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description: "Evaluates pitching moment trim condition and small disturbance restoring tendencies using linear aerodynamics.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: ["cm0", "cmAlphaPerRad", "angleOfAttackDeg", "disturbanceAlphaDeg"],
  requiresCapabilities: [{ id: "loads.pitch.component-sum", version: 1 }],
  providesCapabilities: [{ id: "stability.pitch.cm-alpha", version: 1 }],
  assumptions: [
    "Linear Cm-alpha relationship over the investigated range",
    "Quasi-static model representing small disturbances about the selected condition",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition",
    "Positive sign convention for nose-up pitching moment and nose-up angle of attack"
  ],
  validityLimits: [
    "Do not use at stall, large angle of attack, or where coefficients are strongly nonlinear",
    "Does not calculate time history, damping, control motion, or handling qualities",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness",
    "Calculated trim angle is meaningful only when the linear model remains valid at that angle"
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

    if (!isValidInput(cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg)) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question: "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation: "Invalid or non-numeric aircraft inputs provided.",
          status: "caution"
        },
        plots: [],
        scene: null
      };
    }

    const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
    const trimmed = isTrimmed(cm);
    const tendency = classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm);

    const formattedTrimAngle = trimAngleDeg === null ? "not available" : trimAngleDeg;

    const results = [
      {
        name: "Pitching-moment coefficient",
        symbol: "Cm",
        value: cm,
        unit: "",
        precision: 6,
        emphasis: true
      },
      {
        name: "Trim angle",
        symbol: "alpha_trim",
        value: formattedTrimAngle,
        unit: typeof formattedTrimAngle === "number" ? "deg" : "",
        precision: 2
      },
      {
        name: "Disturbance moment change",
        symbol: "delta_Cm",
        value: deltaCm,
        unit: "",
        precision: 6
      },
      {
        name: "Trimmed state",
        symbol: "trimmed",
        value: trimmed ? "trimmed" : "not trimmed",
        unit: ""
      },
      {
        name: "Disturbance tendency",
        symbol: "tendency",
        value: tendency,
        unit: ""
      }
    ];

    // Verification Cases
    const c1Cm = calculateCm(0.04, -0.8, 2.86);
    const c1Trim = calculateTrimAngleDeg(0.04, -0.8);
    const c1DeltaCm = calculateDeltaCm(-0.8, 2.0);
    const c1Trimmed = isTrimmed(c1Cm);
    const c1Tendency = classifyDisturbanceTendency(2.0, c1DeltaCm);

    const case1Passed =
      Math.abs(c1Cm - 0.00006687) < 1e-5 &&
      c1Trim !== null && Math.abs(c1Trim - 2.86479) < 1e-4 &&
      Math.abs(c1DeltaCm - (-0.0279253)) < 1e-5 &&
      c1Trimmed === false &&
      c1Tendency === "restoring";

    const c2DeltaCm = calculateDeltaCm(0.8, 2.0);
    const c2Tendency = classifyDisturbanceTendency(2.0, c2DeltaCm);
    const case2Passed = c2DeltaCm > 0 && c2Tendency === "destabilizing";

    const c3Cm = calculateCm(0.04, 0.0, 2.86);
    const c3Trim = calculateTrimAngleDeg(0.04, 0.0);
    const c3DeltaCm = calculateDeltaCm(0.0, 2.0);
    const c3Tendency = classifyDisturbanceTendency(2.0, c3DeltaCm);
    const case3Passed =
      Math.abs(c3Cm - 0.04) < 1e-6 &&
      c3Trim === null &&
      c3DeltaCm === 0 &&
      c3Tendency === "neutral";

    const verificationCases = [
      {
        id: "num-case",
        name: "Numerical Reference Case",
        passed: case1Passed
      },
      {
        id: "beh-case",
        name: "Behavioral Case (Positive Slope)",
        passed: case2Passed
      },
      {
        id: "bnd-case",
        name: "Boundary Case (Zero Slope)",
        passed: case3Passed
      }
    ];

    const plotData = generateCmAlphaPlotData(cm0, cmAlphaPerRad, angleOfAttackDeg);

    const plots = [
      {
        id: "cm-alpha-plot",
        title: "Pitching Moment Coefficient vs Angle of Attack",
        xAxisLabel: "Angle of Attack (deg)",
        yAxisLabel: "Pitching Moment Coefficient Cm",
        series: [
          {
            name: "Cm(alpha)",
            data: plotData
          }
        ],
        regions: [],
        referenceLines: [
          {
            y: 0,
            label: "Cm = 0 (Trim line)"
          }
        ]
      }
    ];

    let interpretationText = "";
    if (trimmed) {
      interpretationText = `The aircraft is trimmed at alpha = ${angleOfAttackDeg.toFixed(2)} deg (Cm = ${cm.toFixed(6)}). `;
    } else {
      interpretationText = `The aircraft is not trimmed at alpha = ${angleOfAttackDeg.toFixed(2)} deg (Cm = ${cm.toFixed(6)}). `;
    }

    if (tendency === "restoring") {
      interpretationText += "A small positive angle-of-attack disturbance creates a restoring moment tendency (delta_Cm < 0).";
    } else if (tendency === "destabilizing") {
      interpretationText += "A small positive angle-of-attack disturbance creates a destabilizing moment tendency (delta_Cm > 0).";
    } else {
      interpretationText += "Angle-of-attack disturbances produce no change in pitching moment (neutral tendency).";
    }

    const decisionStatus = trimmed && tendency === "restoring" ? "pass" : "caution";

    return {
      results,
      verificationCases,
      decision: {
        question: "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: interpretationText,
        status: decisionStatus
      },
      plots,
      scene: null
    };
  }
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = runtimeContext.aircraft || {};
    const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

    if (!isValidInput(cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg)) {
      return { values: {} };
    }

    const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
    const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
    const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
    const trimmed = isTrimmed(cm);
    const tendency = classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm);

    return {
      values: {
        cm,
        trimAngleDeg: trimAngleDeg === null ? NaN : trimAngleDeg,
        deltaCm,
        isTrimmed: trimmed ? 1 : 0,
        tendencyCode: tendency === "restoring" ? -1 : tendency === "destabilizing" ? 1 : 0
      }
    };
  }
};