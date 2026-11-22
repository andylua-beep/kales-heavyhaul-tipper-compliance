// Running-gear, tyre, tractor and trailer-model data. Weights in tonnes,
// lengths in metres, heights in millimetres where the field name says Mm.
// Ratings are typical KALES / industry figures for quoting; confirm against the
// final spec sheet before contract.

/**
 * Suspension = axle + suspension assembly. `ratingT` is the technical rating per
 * axle (per axle line for multi-line). `stackMm` is axle centre to frame underside.
 */
export const SUSPENSIONS = {
  "mechanical-13": {
    label: "Mechanical leaf spring · 13 t axle",
    kind: "mechanical",
    ratingT: 13,
    massPerAxleT: 0.95,
    spacing: { min: 1.31, max: 1.36, default: 1.31 },
    stackMm: 220,
    isAir: false
  },
  "mechanical-16": {
    label: "Mechanical leaf spring · 16 t heavy axle",
    kind: "mechanical",
    ratingT: 16,
    massPerAxleT: 1.1,
    spacing: { min: 1.36, max: 1.42, default: 1.36 },
    stackMm: 240,
    isAir: false
  },
  "air-10": {
    label: "Air suspension · 10 t axle",
    kind: "air",
    ratingT: 10,
    massPerAxleT: 1.0,
    spacing: { min: 1.31, max: 1.36, default: 1.31 },
    stackMm: 300,
    isAir: true
  },
  hydraulic: {
    label: "Hydraulic suspension (interlinked) · 13 t axle",
    kind: "hydraulic",
    ratingT: 13,
    massPerAxleT: 1.15,
    spacing: { min: 1.36, max: 1.5, default: 1.4 },
    stackMm: 260,
    isAir: false
  },
  multiline: {
    label: "Hydraulic multi-line (pendular axle lines)",
    kind: "multiline",
    // Technical rating per axle line depends on travel speed.
    speedRatings: [
      // tyreFactor: ETRTO-type load bonus for reduced speed (≈ +10% at 60, +35% at 25, +110% at 5 km/h).
      { id: "road", label: "Road speed ≤ 60 km/h", ratingT: 18, tyreFactor: 1.1 },
      { id: "reduced", label: "Reduced ≤ 25 km/h", ratingT: 24, tyreFactor: 1.35 },
      { id: "crawl", label: "Crawl ≤ 5 km/h", ratingT: 32, tyreFactor: 2.1 }
    ],
    ratingT: 18,
    massPerAxleT: 5.0, // KALES 16-line unit: 80–96 t incl. gooseneck
    spacing: { min: 1.5, max: 1.83, default: 1.83 }, // KALES standard pitch 1,830 mm
    stackMm: 0,
    isAir: false
  }
}

/**
 * Tyres with ETRTO load index (single / dual) converted to tonnes.
 * `fit`: "dual" = 4 tyres per axle, "wide" = 2 super-singles per axle,
 * "line" = 8 tyres per multi-line axle line.
 */
export const TYRES = [
  { id: "12R22.5-152", label: "12R22.5 18PR · LI 152/149", singleT: 3.55, dualT: 3.25, diaMm: 1085, widthMm: 300, fits: ["dual"] },
  { id: "12R22.5-150", label: "12R22.5 16PR · LI 150/147", singleT: 3.35, dualT: 3.075, diaMm: 1085, widthMm: 300, fits: ["dual"] },
  { id: "11R22.5-146", label: "11R22.5 16PR · LI 146/143", singleT: 3.0, dualT: 2.725, diaMm: 1054, widthMm: 279, fits: ["dual"] },
  { id: "11.00R20-152", label: "11.00R20 18PR · LI 152/149", singleT: 3.55, dualT: 3.25, diaMm: 1085, widthMm: 293, fits: ["dual"] },
  { id: "12.00R20-154", label: "12.00R20 18PR · LI 154/151", singleT: 3.75, dualT: 3.45, diaMm: 1125, widthMm: 315, fits: ["dual"] },
  { id: "12.00R20-156", label: "12.00R20 20PR · LI 156/153 (mining)", singleT: 4.0, dualT: 3.65, diaMm: 1125, widthMm: 315, fits: ["dual"] },
  { id: "315/80R22.5-156", label: "315/80R22.5 · LI 156/150", singleT: 4.0, dualT: 3.35, diaMm: 1076, widthMm: 312, fits: ["dual"] },
  { id: "295/80R22.5-152", label: "295/80R22.5 · LI 152/148", singleT: 3.55, dualT: 3.15, diaMm: 1044, widthMm: 298, fits: ["dual"] },
  { id: "385/65R22.5-160", label: "385/65R22.5 super single · LI 160", singleT: 4.5, dualT: null, diaMm: 1072, widthMm: 389, fits: ["wide"] },
  { id: "10.00R20-149", label: "10.00R20 18PR · LI 149/146", singleT: 3.25, dualT: 3.0, diaMm: 1054, widthMm: 278, fits: ["dual"] },
  { id: "8.25R20-139", label: "8.25R20 16PR · LI 139/137 (lowbed)", singleT: 2.43, dualT: 2.3, diaMm: 974, widthMm: 236, fits: ["dual"] },
  { id: "265/70R19.5-143", label: "265/70R19.5 · LI 143/141 (lowbed)", singleT: 2.725, dualT: 2.575, diaMm: 867, widthMm: 262, fits: ["dual"] },
  { id: "245/70R17.5-143", label: "245/70R17.5 · LI 143/141 (low-profile)", singleT: 2.725, dualT: 2.575, diaMm: 789, widthMm: 248, fits: ["dual"] },
  { id: "235/75R17.5-143", label: "235/75R17.5 low-profile · LI 143/141", singleT: 2.725, dualT: 2.575, diaMm: 797, widthMm: 233, fits: ["dual", "line"] },
  { id: "215/75R17.5-135", label: "215/75R17.5 · LI 135/133", singleT: 2.18, dualT: 2.06, diaMm: 767, widthMm: 211, fits: ["line"] }
]

export const TYRES_PER_AXLE = { dual: 4, wide: 2, line: 8 }

export const TRACTOR_TYRE_DIA_M = 1.05
/** Tractor fifth-wheel height range (mm); the gooseneck underside sits at this height. */
export const FIFTH_WHEEL_MM = { min: 1000, max: 1400 }
/** Gap the gooseneck underside needs above standard tractor drive tyres (m). */
export const NECK_TYRE_CLEARANCE_M = 0.1
export const TRACTOR_BOGIE_HALF_SPACING_M = 0.675

/** Tractor units. Loads in t, geometry in m (wheelbase = steer axle to drive axle/bogie centre). */
export const TRACTORS = {
  "4x2": {
    label: "4×2 tractor",
    tareT: 7.2,
    frontTareT: 4.7,
    wheelbaseM: 3.6,
    fifthWheelLeadM: 0.5,
    frontOverhangM: 1.45,
    steerRatingT: 7.5,
    driveRatingT: 13,
    fifthWheelRatingT: 16,
    rearOverhangM: 0.9,
    driveAxles: 1,
    fifthWheelMm: 1300
  },
  "6x4": {
    label: "6×4 tractor",
    tareT: 8.8,
    frontTareT: 5.4,
    wheelbaseM: 3.875,
    fifthWheelLeadM: 0.45,
    frontOverhangM: 1.5,
    steerRatingT: 7.5,
    driveRatingT: 26,
    fifthWheelRatingT: 20,
    rearOverhangM: 0.8,
    driveAxles: 2,
    fifthWheelMm: 1300
  },
  "6x4-heavy": {
    label: "6×4 heavy-haul tractor (9 t front / 32 t bogie)",
    tareT: 10.5,
    frontTareT: 6.2,
    wheelbaseM: 4.0,
    fifthWheelLeadM: 0.4,
    frontOverhangM: 1.55,
    steerRatingT: 9,
    driveRatingT: 32,
    fifthWheelRatingT: 25,
    rearOverhangM: 0.85,
    driveAxles: 2,
    fifthWheelMm: 1350
  }
}

const KINGPIN_SETBACK_M = 0.9

/**
 * Gooseneck length (front of trailer → end of neck). 3.6–3.8 m depending on the tractor:
 * the tractor's rear corners must clear the neck drop when turning.
 */
export const GOOSENECK = { minM: 3.6, maxM: 3.8, defaultM: 3.8, dropLeadM: 0.4, swingClearanceM: 0.15, tractorHalfWidthM: 1.25 }
/** Minimum road clearance under the loading well (mm). */
export const MIN_ROAD_CLEARANCE_MM = 150
/** Landing legs: lowbeds at the deck/gooseneck junction; tippers under the front frame, clear of the tractor. */
export const LANDING_LEG = { lowbedOffsetM: 0.2, tipperFromKingpinM: 2.3, stowedFootM: 0.2 }

/**
 * Jeep dolly (狼狈式牵引座): long front gooseneck on the tractor fifth wheel, 1–3 axle lines at
 * the rear (each line = 2 axles × 4 tyres, 18 t) and its own fifth wheel over the rear part.
 * A 2-line dolly: 36 t lines + 20–25 t tractor fifth wheel − 4–6 t tare ≈ 50–55 t gooseneck load.
 */
export const DOLLY = {
  lineRatingT: 18,
  axlesPerLine: 2,
  tyresPerLine: 8,
  tyreId: "235/75R17.5-143", // low-profile so the tyres clear a 1.1 m gooseneck underside
  lineSpacingM: 1.4,
  neckDropClearanceM: 0.1,
  minKingpinToBogieM: 3.5,
  minGooseneckOffsetM: 2.95,
  tractorTyreClearanceM: 0.6,
  // Steerable dolly axles sit right behind the tractor with a short rear bed (~82–85% share).
  maxBogieShare: 0.84,
  fifthWheelMm: 1100,
  tareCgFrac: 0.6,
  frontOverhangM: 0.55,
  rearOverhangM: 0.52,
  baseTareT: 2.0,
  tarePerLineT: 1.5,
  maxLines: 3
}

/**
 * Trailer model geometry & tare build-up.
 * - `minFrontClearM`: kingpin to front edge of the first tyre (neck + minimum well).
 * - `tare`: baseT + perMetreT × length, frame CG at cgFrac × length from kingpin.
 * - `isIndivisible`: overweight/oversize may go under a permit (machinery), otherwise it is a hard fail.
 */
export const MODELS = {
  "lowboy-trailer": {
    label: "Lowboy (gooseneck)",
    family: "lowbed",
    hasLandingLegs: true,
    allowsDolly: true,
    length: { min: 11, max: 18, default: 13.5 },
    deckMm: { min: 450, max: 1123, default: 900 }, // max = rear deck over the axles (flat deck)
    deckUpToRearDeck: true,
    axles: { min: 2, max: 6, default: 3 },
    rearOverhang: { min: 1.0, max: 3.0, default: 1.6 },
    hasGooseneck: true,
    minWellM: 3.0,
    beamDepthMm: 450, // well main beam (reduced automatically to keep road clearance on low decks)
    rearBeamMm: 360, // beam over the axles: 235/75R17.5 + 220 mm stack + 360 ≈ 980 mm rear deck
    suspensions: ["mechanical-13", "mechanical-16", "hydraulic", "air-10"],
    defaultTractor: "6x4",
    tare: { baseT: 4.5, perMetreT: 0.32, cgFrac: 0.42 }, // KALES 50 t 3-axle 13 m: 11.5 t
    ramp: { type: "rear", lengthM: 2.8, stowDeg: 45 }, // ladder ramps; stowed top ≈ 3.0 m (KALES 2,950 mm)
    isIndivisible: true,
    isLowbed: true,
    payloadT: { min: 1, max: 150 },
    cargo: { weightT: 30, lengthM: 4.2, widthM: 3.0, heightM: 3.1, posM: null }
  },
  "removable-gooseneck-lowboy-trailer": {
    label: "RGN detachable gooseneck",
    family: "lowbed",
    hasLandingLegs: false,
    allowsDolly: true,
    length: { min: 12, max: 19, default: 14.5 },
    deckMm: { min: 450, max: 1123, default: 650 }, // max = rear deck over the axles (flat deck)
    deckUpToRearDeck: true,
    axles: { min: 2, max: 6, default: 3 },
    rearOverhang: { min: 0.8, max: 2.0, default: 1.0 },
    hasGooseneck: true,
    minWellM: 3.5,
    beamDepthMm: 500,
    rearBeamMm: 360,
    suspensions: ["mechanical-13", "mechanical-16", "hydraulic"],
    defaultTractor: "6x4-heavy",
    tare: { baseT: 5.0, perMetreT: 0.3, cgFrac: 0.45 },
    ramp: { type: "front", lengthM: 3.5 },
    isIndivisible: true,
    isLowbed: true,
    payloadT: { min: 1, max: 200 },
    cargo: { weightT: 40, lengthM: 5.5, widthM: 3.2, heightM: 3.4, posM: null }
  },
  "hydraulic-modular-trailer": {
    label: "Hydraulic modular (axle lines)",
    family: "modular",
    hasLandingLegs: false,
    allowsDolly: true,
    length: null, // derived from axle lines
    deckMm: { min: 980, max: 1450, default: 1175 }, // KALES: 980 lowered – 1,450 raised (470 mm stroke)
    axles: { min: 4, max: 24, default: 8 },
    rearOverhang: { min: 0.75, max: 0.92, default: 0.92 }, // derived: half a line pitch
    hasGooseneck: true,
    minWellM: 0,
    beamDepthMm: 0,
    suspensions: ["multiline"],
    defaultTractor: "6x4-heavy",
    tare: { baseT: 6.0, perMetreT: 0, cgFrac: 0.05 },
    ramp: null,
    isIndivisible: true,
    isLowbed: false,
    payloadT: { min: 5, max: 1000 },
    cargo: { weightT: 80, lengthM: 8, widthM: 3.5, heightM: 3.5, posM: null },
    defaultTyre: "215/75R17.5-135"
  },
  "car-carrier-trailer": {
    label: "Car carrier (double deck)",
    family: "carrier",
    hasLandingLegs: true,
    // Car positions → usual trailer length and axle count (half the cars on each full-length deck).
    // Longer carriers set the axles further forward (long rear overhang) and need a 6×4 tractor.
    positions: {
      6: { lengthM: 12.9, axles: 2, rearOverhangM: 2.5, tractor: "4x2" },
      8: { lengthM: 17.1, axles: 2, rearOverhangM: 4.0, tractor: "6x4" },
      10: { lengthM: 22, axles: 3, rearOverhangM: 5.0, tractor: "6x4" }
    },
    defaultPositions: 6,
    length: { min: 12, max: 22, default: 12.9 },
    // Lower deck = gooseneck over the fifth wheel, a low well (default 450 mm) and a 750 mm
    // deck over the axles (KALES 17.1 m drawing). deckMm is the well; the other two are derived.
    deckMm: { min: 400, max: 750, default: 450 },
    rearDeckMm: 750, // lower deck over the axles; the tyres run in wheel arches through it
    axles: { min: 2, max: 4, default: 2 },
    rearOverhang: { min: 1.0, max: 5.5, default: 2.5 },
    neckM: 0,
    minFrontClearM: 5.0,
    fifthWheelMm: 1150, // low-profile tractor coupling under the gooseneck
    neckOverFifthWheelMm: 100, // gooseneck deck surface above the fifth wheel
    beamDepthMm: 420, // KALES longitudinal I-beam 420 mm
    suspensions: ["air-10", "mechanical-13"],
    defaultTractor: "4x2",
    tare: { baseT: 3.0, perMetreT: 0.45, cgFrac: 0.5 }, // KALES 4-axle 17 m: 14.5 t
    ramp: { type: "rear", lengthM: 3.5 },
    isIndivisible: false,
    isLowbed: true,
    payloadT: { min: 0.5, max: 30 },
    defaultTyre: "235/75R17.5-143", // KALES car carriers run 17.5-inch tyres
    cargo: { weightT: 9.6, lengthM: null, widthM: 2.0, heightM: null, posM: null }
  },
  "tipper-semi-trailer": {
    label: "U-type rear dump / tipper",
    family: "tipper",
    hasLandingLegs: true,
    length: { min: 8.6, max: 13.5, default: 11 },
    deckMm: { min: 1300, max: 1650, default: 1450 },
    axles: { min: 2, max: 5, default: 3 },
    rearOverhang: { min: 0.8, max: 2.0, default: 1.0 },
    neckM: 0,
    minFrontClearM: 4.0,
    beamDepthMm: 500,
    suspensions: ["mechanical-13", "mechanical-16", "air-10"],
    defaultTractor: "6x4",
    tare: { baseT: 3.5, perMetreT: 0.4, cgFrac: 0.5 }, // KALES 3-axle U body (air): 11.2 t
    ramp: null,
    isIndivisible: false,
    isLowbed: false,
    tipping: { type: "rear", bodyWidthM: 2.3, maxSideM: 2.0 },
    volumeM3: { min: 10, max: 65, default: 17 },
    payloadT: { min: 1, max: 100 },
    cargo: { weightT: 26, lengthM: null, widthM: 2.5, heightM: null, posM: null }
  },
  "side-tipper-trailer": {
    label: "Side dump / tipper",
    family: "tipper",
    hasLandingLegs: true,
    length: { min: 8.6, max: 13.5, default: 12 },
    deckMm: { min: 1300, max: 1650, default: 1450 },
    axles: { min: 2, max: 3, default: 3 },
    rearOverhang: { min: 0.8, max: 2.0, default: 1.0 },
    neckM: 0,
    minFrontClearM: 4.0,
    beamDepthMm: 500,
    suspensions: ["mechanical-13", "mechanical-16", "air-10"],
    defaultTractor: "6x4",
    tare: { baseT: 1.5, perMetreT: 0.28, cgFrac: 0.5 }, // KALES 13.5 m Q345: 8.2–8.5 t
    ramp: null,
    isIndivisible: false,
    isLowbed: false,
    tipping: { type: "side", bodyWidthM: 2.48, maxSideM: 1.2 }, // KALES walls 600–1,200 mm
    volumeM3: { min: 10, max: 65, default: 17 },
    payloadT: { min: 1, max: 80 },
    cargo: { weightT: 26, lengthM: null, widthM: 2.5, heightM: null, posM: null }
  }
}

/**
 * Double-deck car carrier: because the front lower car slopes down from the gooseneck into the
 * 450 mm well and the rear lower cars sit on the 450 mm well / 750 mm over-axle deck, the upper
 * deck sits `upperDeckGapM` above the gooseneck (`neckDeckMm`) while keeping the loaded roof height
 * under the 4.0 m statutory limit (≈ 3.92 m over a 1,150 mm fifth wheel). Lower-deck stations
 * follow the KALES 17.1 m drawing: flat gooseneck for `neckFlatM` from the trailer front, sloping
 * down to the well at `neckDropEndM`; the well rises over `riseRunM` to the deck over the axles,
 * which starts `riseLeadM` ahead of the first tyre and runs to the rear end.
 */
export const CAR_CARRIER = {
  upperDeckGapM: 1.15, upperDeckThicknessM: 0.09, carHeightM: 1.43, carLengthM: 4.4, upperDeckOverhangM: 0.6, carMassT: 1.6, minPositionM: 4.0,
  neckFlatM: 2.35, neckDropEndM: 4.2, riseRunM: 1.5, riseLeadM: 0.5
}

export const MODEL_ORDER = Object.keys(MODELS)
export { KINGPIN_SETBACK_M }

export const BULK_MATERIALS = [
  { id: "coal", label: "Washed coal", densityT: 0.95 },
  { id: "sand-dry", label: "Dry sand & gravel", densityT: 1.55 },
  { id: "sand-wet", label: "Wet sand / crushed stone", densityT: 1.85 },
  { id: "ore", label: "Iron ore / mining rock", densityT: 2.2 }
]

/** Tyres that fit a suspension (multi-line uses 8-tyre lines). */
export function tyresFor(suspensionId) {
  const fit = suspensionId === "multiline" ? "line" : null
  return TYRES.filter((t) => (fit ? t.fits.includes("line") : t.fits.some((f) => f !== "line")))
}

export function tyreFit(tyre, suspensionId) {
  if (suspensionId === "multiline") return "line"
  return tyre.fits.includes("wide") ? "wide" : "dual"
}
