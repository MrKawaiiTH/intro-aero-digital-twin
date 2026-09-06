import {
  calculateCm,
  calculateTrimAngleRad,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  isTrimmed,
  classifyDisturbance,
} from "../physics/trim-response.js";

const NUMERICAL_TOLERANCE = 0.0001;

function approximatelyEqual(actual, expected, tolerance = NUMERICAL_TOLERANCE) {
  return Math.abs(actual - expected) <= tolerance;
}

function capabilityAvailable(capabilityContext, requiredId, minimumVersion) {
  if (!capabilityContext) {
    return false;
  }

  const capabilities = Array.isArray(capabilityContext)
    ? capabilityContext
    : Array.isArray(capabilityContext.capabilities)
      ? capabilityContext.capabilities
      : [];

  return capabilities.some(
    (capability) =>
      capability &&
      capability.id === requiredId &&
      Number(capability.version) >= minimumVersion,
  );
}

function getCapabilities(context) {
  if (!context || !context.capabilities) {
    return [];
  }

  return Array.isArray(context.capabilities)
    ? context.capabilities
    : [];
}

function finiteValues(values) {
  return Object.values(values).every(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
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
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 },
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],
  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
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
    if (
      !capabilityAvailable(
        capabilityContext,
        "loads.pitch.component-sum",
        1,
      )
    ) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required loads.pitch.component-sum capability is unavailable, so the Stage 4 analysis remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const cm = calculateCm(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
      aircraft.angleOfAttackDeg,
    );

    const trimAngleRad = calculateTrimAngleRad(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
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
    const tendency = classifyDisturbance(
      aircraft.disturbanceAlphaDeg,
      deltaCm,
    );

    const plotPoints = [];

    for (let angleDeg = -10; angleDeg <= 10; angleDeg += 1) {
      plotPoints.push({
        x: angleDeg,
        y: calculateCm(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          angleDeg,
        ),
      });
    }

    if (!plotPoints.some((point) => point.x === aircraft.angleOfAttackDeg)) {
      plotPoints.push({
        x: aircraft.angleOfAttackDeg,
        y: cm,
      });
      plotPoints.sort((a, b) => a.x - b.x);
    }

    const verificationCases = [
      {
        id: "numerical",
        name: "Numerical case",
        inputs: {
          cm0: 0.04,
          cmAlphaPerRad: 0.8,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 2.0,
        },
        expected: {
          cm: 0.0799,
          trimAngleRad: -0.05,
          trimAngleDeg: -2.8648,
          deltaCm: 0.02793,
          trimmed: false,
          tendency: "destabilizing",
          tolerance: 0.0001,
        },
        passed: (() => {
          const testCm = calculateCm(0.04, 0.8, 2.86);
          const testTrimRad = calculateTrimAngleRad(0.04, 0.8);
          const testTrimDeg = calculateTrimAngleDeg(0.04, 0.8);
          const testDeltaCm = calculateDeltaCm(0.8, 2.0);

          return (
            approximatelyEqual(testCm, 0.0799) &&
            approximatelyEqual(testTrimRad, -0.05) &&
            approximatelyEqual(testTrimDeg, -2.8648) &&
            approximatelyEqual(testDeltaCm, 0.02793) &&
            isTrimmed(testCm) === false &&
            classifyDisturbance(2.0, testDeltaCm) === "destabilizing"
          );
        })(),
      },
      {
        id: "behavioral",
        name: "Behavioral case",
        inputs: {
          cmAlphaPerRad: "negative value increasing toward zero",
          disturbanceAlphaDeg: "positive",
        },
        expected: {
          relationship:
            "delta_Cm must increase toward zero",
        },
        passed: (() => {
          const lower = calculateDeltaCm(-0.8, 2.0);
          const higher = calculateDeltaCm(-0.2, 2.0);

          return higher > lower && higher < 0;
        })(),
      },
      {
        id: "boundary-sanity",
        name: "Zero-slope boundary case",
        inputs: {
          cm0: 0.04,
          cmAlphaPerRad: 0,
          angleOfAttackDeg: 2.86,
          disturbanceAlphaDeg: 2.0,
        },
        expected: {
          deltaCm: 0,
          trimAngle: "not available",
        },
        passed: (() => {
          const testDeltaCm = calculateDeltaCm(0, 2.0);
          const testTrimRad = calculateTrimAngleRad(0.04, 0);

          return testDeltaCm === 0 && testTrimRad === null;
        })(),
      },
    ];

    return {
      results: [
        {
          id: "cm-alpha",
          label: "Pitching-moment coefficient",
          value: cm,
          unit: "",
          precision: 4,
          emphasis: true,
        },
        {
          id: "trim-angle",
          label: "Trim angle",
          value: trimAngleDeg === null ? "not available" : trimAngleDeg,
          unit: trimAngleDeg === null ? "" : "deg",
          precision: 4,
        },
        {
          id: "delta-cm",
          label: "Disturbance moment-coefficient change",
          value: deltaCm,
          unit: "",
          precision: 5,
        },
        {
          id: "trimmed",
          label: "Selected condition trimmed",
          value: trimmed,
          unit: "",
          precision: 0,
        },
        {
          id: "disturbance-tendency",
          label: "Disturbance tendency",
          value: tendency,
          unit: "",
          precision: 0,
        },
      ],
      verificationCases,
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: trimmed
          ? `The selected condition satisfies the Cm trim tolerance. The disturbance has a ${tendency} tendency under the specified linear quasi-static model.`
          : `The selected condition is not trimmed because Cm(alpha) is outside the specified trim tolerance. The disturbance has a ${tendency} tendency under the specified linear quasi-static model.`,
        status: trimmed ? "pass" : "caution",
      },
      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xAxis: {
            label: "Angle of attack",
            unit: "deg",
          },
          yAxis: {
            label: "Pitching-moment coefficient",
            unit: "",
          },
          series: [
            {
              id: "cm-alpha-series",
              label: "Cm(alpha)",
              points: plotPoints,
            },
          ],
          regions: [],
          referenceLines: [
            {
              y: 0,
              label: "Cm = 0",
            },
          ],
        },
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;
    const capabilities = getCapabilities(runtimeContext);

    if (
      !aircraft ||
      !capabilityAvailable(
        capabilities,
        "loads.pitch.component-sum",
        1,
      )
    ) {
      return {
        values: {},
      };
    }

    const cm = calculateCm(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
      aircraft.angleOfAttackDeg,
    );

    const trimAngleRad = calculateTrimAngleRad(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
    );

    const deltaCm = calculateDeltaCm(
      aircraft.cmAlphaPerRad,
      aircraft.disturbanceAlphaDeg,
    );

    const values = {
      cm,
      trimAngleRad,
      deltaCm,
      trimmed: isTrimmed(cm),
    };

    if (
      !finiteValues({
        cm,
        deltaCm,
        ...(trimAngleRad === null ? {} : { trimAngleRad }),
      })
    ) {
      return {
        values: {},
      };
    }

    return { values };
  },
};