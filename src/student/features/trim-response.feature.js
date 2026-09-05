import {
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const INPUT_KEYS = [
  "cm0",
  "cmAlphaPerRad",
  "angleOfAttackDeg",
  "disturbanceAlphaDeg",
];

function hasRequiredCapability(capabilityContext) {
  const capabilities =
    capabilityContext?.capabilities ??
    capabilityContext ??
    {};

  const required = capabilities["loads.pitch.component-sum"];

  if (Array.isArray(required)) {
    return required.some((entry) => {
      if (typeof entry === "number") {
        return entry >= 1;
      }

      return (
        entry &&
        typeof entry.version === "number" &&
        entry.version >= 1
      );
    });
  }

  if (typeof required === "number") {
    return required >= 1;
  }

  if (required && typeof required.version === "number") {
    return required.version >= 1;
  }

  return false;
}

function calculateValues(aircraft) {
  const cm = calculateCm(
    aircraft.cm0,
    aircraft.cmAlphaPerRad,
    aircraft.angleOfAttackDeg,
  );

  const trimAngleDeg = calculateTrimAngleDeg(
    aircraft.cm0,
    aircraft.cmAlphaPerRad,
  );

  const deltaCm = calculateDeltaCm(
    aircraft.cmAlphaPerRad,
    aircraft.disturbanceAlphaDeg,
  );

  const trimmed = isTrimmed(cm);
  const disturbanceTendency = classifyDisturbance(
    aircraft.disturbanceAlphaDeg,
    deltaCm,
  );

  return {
    cm,
    trimAngleDeg,
    deltaCm,
    trimmed,
    disturbanceTendency,
  };
}

function buildPlot(aircraft) {
  const points = [];

  for (let angleDeg = -10; angleDeg <= 10; angleDeg += 1) {
    points.push({
      x: angleDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        angleDeg,
      ),
    });
  }

  return {
    xKey: "angleOfAttackDeg",
    yKey: "cm",
    xUnit: "deg",
    yUnit: "",
    series: [
      {
        id: "cm-alpha",
        label: "Cm(alpha)",
        points,
      },
    ],
    regions: [],
    referenceLines: [
      {
        id: "trim-line",
        label: "Cm = 0",
        axis: "y",
        value: 0,
      },
    ],
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates the linear pitching-moment relationship, trim condition, and small-disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: INPUT_KEYS,
  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 },
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    if (!hasRequiredCapability(capabilityContext)) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required longitudinal moment-contribution capability is not available, so the Stage 4 analysis remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const values = calculateValues(aircraft);

    const results = [
      {
        id: "cm-alpha",
        label: "Cm(alpha)",
        value: values.cm,
        unit: "",
        precision: 6,
        emphasis: true,
      },
      {
        id: "trim-angle",
        label: "Trim angle",
        value:
          values.trimAngleDeg === null
            ? "not available"
            : values.trimAngleDeg,
        unit: values.trimAngleDeg === null ? "" : "deg",
        precision: 2,
      },
      {
        id: "delta-cm",
        label: "delta_Cm",
        value: values.deltaCm,
        unit: "",
        precision: 6,
      },
      {
        id: "trimmed",
        label: "Selected condition",
        value: values.trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
      },
      {
        id: "disturbance-tendency",
        label: "Disturbance tendency",
        value: values.disturbanceTendency,
        unit: "",
        precision: 0,
      },
    ];

    let status = "neutral";

    if (
      values.trimmed &&
      values.disturbanceTendency === "restoring"
    ) {
      status = "pass";
    } else if (
      values.disturbanceTendency === "destabilizing" ||
      !values.trimmed
    ) {
      status = "caution";
    }

    return {
      results,
      verificationCases: [
        {
          id: "numerical",
          description: "Section 8 reference calculation",
          passed:
            Math.abs(
              calculateCm(0.04, -0.8, 2.86) - 0,
            ) <= 1e-6 &&
            Math.abs(
              calculateDeltaCm(-0.8, 2.0) - -0.028,
            ) <= 1e-6 &&
            isTrimmed(calculateCm(0.04, -0.8, 2.86)) &&
            classifyDisturbance(
              2.0,
              calculateDeltaCm(-0.8, 2.0),
            ) === "restoring",
        },
        {
          id: "behavioral",
          description:
            "Change cmAlphaPerRad from -0.8 1/rad to +0.8 1/rad while other inputs remain fixed",
          passed:
            calculateDeltaCm(0.8, 2.0) > 0 &&
            classifyDisturbance(
              2.0,
              calculateDeltaCm(0.8, 2.0),
            ) === "destabilizing",
        },
        {
          id: "boundary",
          description:
            "Zero-slope case with cm0 = 0.04, angleOfAttackDeg = 2.86, and disturbanceAlphaDeg = +2.00",
          passed:
            Math.abs(calculateCm(0.04, 0, 2.86) - 0.04) <= 1e-12 &&
            Math.abs(calculateDeltaCm(0, 2.0)) <= 1e-12 &&
            calculateTrimAngleDeg(0.04, 0) === null &&
            classifyDisturbance(
              2.0,
              calculateDeltaCm(0, 2.0),
            ) === "neutral",
        },
      ],
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation:
          values.trimmed
            ? `The selected condition is trimmed under the specified tolerance. The disturbance has a ${values.disturbanceTendency} tendency according to the sign of delta_alpha_rad multiplied by delta_Cm.`
            : `The selected condition is not trimmed under the specified tolerance. The disturbance has a ${values.disturbanceTendency} tendency according to the sign of delta_alpha_rad multiplied by delta_Cm.`,
        status,
      },
      plots: [buildPlot(aircraft)],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? {};
    const values = calculateValues(aircraft);

    return {
      values: {
        cmAlpha: values.cm,
        trimAngleDeg: values.trimAngleDeg,
        deltaCm: values.deltaCm,
        trimmed: values.trimmed,
        disturbanceTendency: values.disturbanceTendency,
      },
    };
  },
};