// Input normalisation, geometry, tare build-up and static load solution.
import { MODELS, SUSPENSIONS, TRACTORS, TYRES, TYRES_PER_AXLE, BULK_MATERIALS, KINGPIN_SETBACK_M, DOLLY, GOOSENECK, FIFTH_WHEEL_MM, MIN_ROAD_CLEARANCE_MM, CAR_CARRIER, tyresFor, tyreFit } from "./equipment.js"
import { REGIONS } from "./regulations.js"
import { buildDolly, solveDolly } from "./dolly.js"
import { carLayout } from "./carrier.js"

const DROP_M = 0.4 // gooseneck drop / well transition length
const WELL_END_GAP_M = 0.3 // gap between well end and first tyre
const REAR_TIPPER_CYLINDER_GAP_M = 0.5 // front telescopic cylinder space ahead of a rear-tipper body
const MODULAR_CG_LEAD_M = 1.5 // default cargo CG ahead of line centre so the tractor keeps traction
const CARGO_LIMITS = { lengthM: [0.5, 30], widthM: [0.5, 6], heightM: [0.3, 6] }
const MIN_CARGO_LENGTH_M = 1

const round = (v, d = 2) => +v.toFixed(d)
const isNum = (v) => typeof v === "number" && Number.isFinite(v)

/** Clamp a value, recording its allowed range and an issue when the request was outside it. */
function bounded(issues, field, raw, min, max, fallback, bounds) {
  if (bounds) bounds[field] = { min, max }
  const value = isNum(raw) ? raw : fallback
  if (!isNum(raw)) return value
  if (raw < min || raw > max) {
    const used = Math.min(max, Math.max(min, raw))
    issues.push({ field, requested: raw, used, min, max })
    return used
  }
  return value
}

/** Highest axle count whose group + tyres still fits behind the minimum front clearance. */
export function maxAxlesForLength(model, lengthM, rearOverhangM, spacingM, tyreDiaMm) {
  if (model.family === "modular") return model.axles.max
  const lastX = lengthM - KINGPIN_SETBACK_M - rearOverhangM
  const available = lastX - tyreDiaMm / 2000 - model.minFrontClearM
  if (available < 0) return 0
  return Math.min(model.axles.max, Math.floor(available / spacingM + 1e-9) + 1)
}

/** Shortest trailer length that fits `axles` (for hints). */
export function minLengthForAxles(model, axles, rearOverhangM, spacingM, tyreDiaMm) {
  const exact = model.minFrontClearM + tyreDiaMm / 2000 + (axles - 1) * spacingM + rearOverhangM + KINGPIN_SETBACK_M
  return Math.ceil(exact * 10 - 1e-9) / 10
}

export function normalizeConfig(raw = {}) {
  const issues = []
  const bounds = {}
  const regionId = Object.hasOwn(REGIONS, raw.region) ? raw.region : "CN"
  const modelId = Object.hasOwn(MODELS, raw.model) ? raw.model : "lowboy-trailer"
  const baseModel = MODELS[modelId]
  const dollyLines = baseModel.allowsDolly
    ? Math.round(bounded(issues, "dollyLines", raw.dollyLines, 0, DOLLY.maxLines, 0, bounds))
    : 0
  // Car carrier: 6 / 8 / 10 positions set the usual length, axles, rear overhang, tractor and payload.
  const carPositions = baseModel.positions ? (Object.hasOwn(baseModel.positions, raw.carPositions) ? Number(raw.carPositions) : baseModel.defaultPositions) : null
  const positionPreset = carPositions ? baseModel.positions[carPositions] : null
  const tractorId = Object.hasOwn(TRACTORS, raw.tractor) ? raw.tractor : positionPreset?.tractor ?? baseModel.defaultTractor
  // Fifth-wheel height 1.0–1.4 m, defaulting to the tractor's standard height (immutable tractor copy).
  const fifthWheelMm = Math.round(bounded(issues, "fifthWheelMm", raw.fifthWheelMm, FIFTH_WHEEL_MM.min, FIFTH_WHEEL_MM.max, baseModel.fifthWheelMm ?? TRACTORS[tractorId].fifthWheelMm, bounds))
  const tractor = { ...TRACTORS[tractorId], fifthWheelMm }
  // Gooseneck 3.6–3.8 m (default 3.8); it also sets how far back the well can start (immutable copy).
  const neckM = baseModel.hasGooseneck
    ? bounded(issues, "neckM", raw.neckM, GOOSENECK.minM, GOOSENECK.maxM, GOOSENECK.defaultM, bounds)
    : 0
  const model = baseModel.hasGooseneck
    ? { ...baseModel, neckM, minFrontClearM: neckM + baseModel.minWellM }
    : baseModel
  const dolly = buildDolly(dollyLines, tractor, neckM)

  const suspensionId = model.suspensions.includes(raw.suspension) ? raw.suspension : model.suspensions[0]
  const suspension = SUSPENSIONS[suspensionId]
  const tyreChoices = tyresFor(suspensionId)
  const tyre = tyreChoices.find((t) => t.id === raw.tyre) ?? tyreChoices.find((t) => t.id === model.defaultTyre) ?? tyreChoices[0]
  const speedRating = suspension.speedRatings?.find((s) => s.id === raw.speedRating) ?? suspension.speedRatings?.[0] ?? null

  const spacingM = bounded(issues, "spacingM", raw.spacingM, suspension.spacing.min, suspension.spacing.max, suspension.spacing.default, bounds)
  // Well can rise to the rear deck over the axles (flat deck); a tipper frame cannot sit lower
  // than tyre + suspension + main beam.
  const overAxleMm = rearDeckHeightMm(model, suspension, tyre)
  const deckMaxMm = model.deckUpToRearDeck ? overAxleMm : model.deckMm.max
  const deckMinMm = model.family === "tipper"
    ? Math.min(deckMaxMm, Math.max(model.deckMm.min, overAxleMm))
    : model.deckMm.min
  const deckMm = bounded(issues, "deckMm", raw.deckMm, deckMinMm, deckMaxMm, Math.min(deckMaxMm, Math.max(deckMinMm, model.deckMm.default)), bounds)

  let lengthM
  let axles
  let rearOverhangM
  if (model.family === "modular") {
    axles = bounded(issues, "axles", raw.axles, model.axles.min, model.axles.max, model.axles.default, bounds)
    // Platform = n modules of one line pitch each; every line sits mid-module.
    rearOverhangM = round(spacingM / 2, 3)
    lengthM = round(model.neckM + DROP_M + axles * spacingM, 2)
  } else {
    lengthM = bounded(issues, "lengthM", raw.lengthM, model.length.min, model.length.max, positionPreset?.lengthM ?? model.length.default, bounds)
    // The rear overhang may not squeeze out the minimum axle group or the minimum well.
    const overhangRoom = lengthM - KINGPIN_SETBACK_M - model.minFrontClearM - tyre.diaMm / 2000 - (model.axles.min - 1) * spacingM
    const overhangMax = Math.max(model.rearOverhang.min, Math.min(model.rearOverhang.max, Math.floor(overhangRoom * 20 + 1e-9) / 20))
    rearOverhangM = bounded(issues, "rearOverhangM", raw.rearOverhangM, model.rearOverhang.min, overhangMax, Math.min(positionPreset?.rearOverhangM ?? model.rearOverhang.default, overhangMax), bounds)
    const maxAxles = Math.max(model.axles.min, maxAxlesForLength(model, lengthM, rearOverhangM, spacingM, tyre.diaMm))
    axles = bounded(issues, "axles", raw.axles, model.axles.min, maxAxles, Math.min(positionPreset?.axles ?? model.axles.default, maxAxles), bounds)
  }
  axles = Math.round(axles)

  const cargoIn = raw.cargo ?? {}
  const cargo = {}
  const isDeckCargo = model.family === "lowbed" || model.family === "modular"
  const material = BULK_MATERIALS.find((m) => m.id === raw.material) ?? BULK_MATERIALS[1]
  let volumeM3 = null
  const defaultPayloadT = carPositions ? round(carPositions * CAR_CARRIER.carMassT, 1) : model.cargo.weightT
  if (model.family === "tipper") {
    const rawVol = isNum(raw.volumeM3) ? raw.volumeM3 : isNum(cargoIn.volumeM3) ? cargoIn.volumeM3 : null
    if (rawVol !== null && !isNum(cargoIn.weightT)) {
      volumeM3 = round(bounded(issues, "volumeM3", rawVol, model.volumeM3.min, model.volumeM3.max, model.volumeM3.default, bounds), 1)
      cargo.weightT = bounded(issues, "cargo.weightT", round(volumeM3 * material.densityT, 1), model.payloadT.min, model.payloadT.max, defaultPayloadT, bounds)
    } else {
      cargo.weightT = bounded(issues, "cargo.weightT", cargoIn.weightT, model.payloadT.min, model.payloadT.max, defaultPayloadT, bounds)
      const derivedVol = round(cargo.weightT / material.densityT, 1)
      volumeM3 = rawVol !== null
        ? round(bounded(issues, "volumeM3", rawVol, model.volumeM3.min, model.volumeM3.max, derivedVol, bounds), 1)
        : derivedVol
      if (bounds) bounds.volumeM3 = { min: model.volumeM3.min, max: model.volumeM3.max }
    }
  } else {
    cargo.weightT = bounded(issues, "cargo.weightT", cargoIn.weightT, model.payloadT.min, model.payloadT.max, defaultPayloadT, bounds)
  }
  for (const [key, [min, max]] of Object.entries(CARGO_LIMITS)) {
    if (key === "lengthM" && isDeckCargo) continue // bounded by the usable deck below
    cargo[key] = bounded(issues, `cargo.${key}`, cargoIn[key], min, max, model.cargo[key] ?? min, bounds)
  }

  const config = {
    region: regionId, model: modelId, tractor: tractorId, suspension: suspensionId, tyre: tyre.id,
    speedRating: speedRating?.id ?? null, axles, spacingM, lengthM, rearOverhangM, deckMm,
    cargo, volumeM3, material: material.id, dollyLines, neckM, fifthWheelMm, carPositions
  }
  const geo = buildGeometry({ config, model, suspension, tyre })
  if (isDeckCargo) {
    const deckLenM = Math.floor((geo.rearX - geo.deckStartX) * 10 + 1e-9) / 10
    cargo.lengthM = bounded(issues, "cargo.lengthM", cargoIn.lengthM, MIN_CARGO_LENGTH_M, deckLenM, Math.min(model.cargo.lengthM, deckLenM), bounds)
    const minPos = round(geo.deckStartX + cargo.lengthM / 2, 2)
    const maxPos = round(Math.max(minPos, geo.rearX - cargo.lengthM / 2), 2)
    // Default CG: centre of the loading well (lowbed) or just ahead of the line centre (modular).
    const preferred = round(model.family === "lowbed" ? (geo.deckStartX + geo.wellEndX) / 2 : geo.groupX - MODULAR_CG_LEAD_M, 1)
    const fallback = Math.min(maxPos, Math.max(minPos, model.cargo.posM ?? preferred))
    config.cargo.posM = bounded(issues, "cargo.posM", cargoIn.posM, minPos, maxPos, fallback, bounds)
  }
  return {
    config,
    issues,
    parts: { region: REGIONS[regionId], model, suspension, tyre, tractor, speedRating, material, dolly },
    geometry: geo,
    bounds
  }
}

/** Rear deck over the axles: tyre radius + suspension stack + rear beam. */
export function rearDeckHeightMm(model, suspension, tyre) {
  return Math.round(tyre.diaMm / 2 + suspension.stackMm + (model.rearBeamMm ?? model.beamDepthMm))
}

export function buildGeometry({ config, model, suspension, tyre }) {
  const { axles: n, spacingM: s, lengthM: L, rearOverhangM } = config
  const tyreR = tyre.diaMm / 2000
  const rearX = L - KINGPIN_SETBACK_M
  const lastX = rearX - rearOverhangM
  const firstX = lastX - (n - 1) * s
  const neckEndX = model.neckM - KINGPIN_SETBACK_M
  // Rear tippers keep 0.5 m at the front for the telescopic cylinder; side tippers run the body full length.
  const tipperFrontGapM = model.tipping?.type === "rear" ? REAR_TIPPER_CYLINDER_GAP_M : 0
  if (model.family === "carrier") return carrierGeometry({ config, model, tyreR, rearX, firstX, lastX, n, s })
  const deckStartX = model.family === "tipper"
    ? -KINGPIN_SETBACK_M + tipperFrontGapM
    : Math.max(0.5, neckEndX + DROP_M)
  const wellEndX = model.family === "modular" ? rearX : firstX - tyreR - WELL_END_GAP_M
  const isFlatDeck = model.family === "modular" || model.family === "tipper"
  const rearDeckMm = isFlatDeck
    ? config.deckMm
    : rearDeckHeightMm(model, suspension, tyre)
  // Low wells use a shallower beam so the underside keeps road clearance.
  const wellBeamMm = Math.max(0, Math.min(model.beamDepthMm, config.deckMm - MIN_ROAD_CLEARANCE_MM))
  return {
    frontX: -KINGPIN_SETBACK_M,
    rearX,
    firstX,
    lastX,
    groupX: (firstX + lastX) / 2,
    groupSpanM: (n - 1) * s,
    frontTyreEdgeX: firstX - tyreR,
    tyreR,
    neckEndX,
    deckStartX,
    wellEndX,
    rearDeckMm,
    wellBeamMm,
    roadClearanceMm: config.deckMm - wellBeamMm,
    minDeckOverAxleMm: Math.round(tyre.diaMm / 2 + suspension.stackMm + model.beamDepthMm)
  }
}

/**
 * Car carrier lower deck (KALES 17.1 m drawing): gooseneck over the fifth wheel, sloping down to a
 * low well (`deckMm`), rising again to the fixed deck over the axles (`rearDeckMm`).
 */
function carrierGeometry({ config, model, tyreR, rearX, firstX, lastX, n, s }) {
  const frontX = -KINGPIN_SETBACK_M
  const deckStartX = frontX + CAR_CARRIER.neckDropEndM
  const rearDeckStartX = Math.max(deckStartX + CAR_CARRIER.riseRunM, firstX - tyreR - CAR_CARRIER.riseLeadM)
  const wellBeamMm = Math.max(0, Math.min(model.beamDepthMm, config.deckMm - MIN_ROAD_CLEARANCE_MM))
  return {
    frontX,
    rearX,
    firstX,
    lastX,
    groupX: (firstX + lastX) / 2,
    groupSpanM: (n - 1) * s,
    frontTyreEdgeX: firstX - tyreR,
    tyreR,
    neckEndX: frontX + CAR_CARRIER.neckFlatM, // end of the flat gooseneck
    deckStartX, // start of the well
    wellEndX: rearDeckStartX - CAR_CARRIER.riseRunM,
    rearDeckStartX,
    neckDeckMm: config.fifthWheelMm + model.neckOverFifthWheelMm,
    rearDeckMm: Math.max(config.deckMm, model.rearDeckMm),
    wellBeamMm,
    roadClearanceMm: config.deckMm - wellBeamMm,
    minDeckOverAxleMm: model.rearDeckMm
  }
}

export function trailerTare(config, model, suspension) {
  const frameT = model.tare.baseT + model.tare.perMetreT * config.lengthM
  const frameX = model.tare.cgFrac * config.lengthM - KINGPIN_SETBACK_M
  const axlesT = config.axles * suspension.massPerAxleT
  return { frameT: round(frameT), frameX, axlesT: round(axlesT), totalT: round(frameT + axlesT, 1) }
}

/**
 * Payload centre of gravity: bulk is level-struck over the body; cars sit in the positions that
 * fit on the two decks; machinery uses the input.
 */
export function payloadCgX(config, model, geo) {
  if (model.family === "tipper") return (geo.deckStartX + geo.rearX) / 2
  if (model.family === "carrier") return carLayout(config, geo).cgX
  return config.cargo.posM
}

/**
 * Static two-support solution (kingpin + equalised axle group). With a dolly the
 * trailer kingpin load is split again between the dolly lines and the tractor.
 */
export function solveLoads({ payloadT, cgX, tare, geo, tractor, axles, dolly = null }) {
  const total = tare.frameT + tare.axlesT + payloadT
  const moment = tare.frameT * tare.frameX + tare.axlesT * geo.groupX + payloadT * cgX
  const groupT = moment / geo.groupX
  const kingpinT = total - groupT
  const dollyLoads = dolly ? solveDolly(dolly, kingpinT) : null
  const tractorKingpinT = dollyLoads ? dollyLoads.tractorKingpinT : kingpinT
  const leadRatio = tractor.fifthWheelLeadM / tractor.wheelbaseM
  const steerT = tractor.frontTareT + tractorKingpinT * leadRatio
  const driveT = tractor.tareT - tractor.frontTareT + tractorKingpinT * (1 - leadRatio)
  return {
    trailerGvwT: round(total, 2),
    groupT: round(groupT, 2),
    perAxleT: round(groupT / axles, 2),
    kingpinT: round(kingpinT, 2),
    tractorKingpinT: round(tractorKingpinT, 2),
    dollyGroupT: dollyLoads?.dollyGroupT ?? 0,
    dollyPerLineT: dollyLoads?.dollyPerLineT ?? 0,
    steerT: round(steerT, 2),
    driveT: round(driveT, 2),
    gcwT: round(total + tractor.tareT + (dolly?.tareT ?? 0), 2)
  }
}

/** Tyre capacity per axle / line; `speedFactor` is the low-speed load bonus of multi-line running gear. */
export function tyreAxleCapT(tyre, fit, speedFactor = 1) {
  const perTyre = fit === "wide" ? tyre.singleT : tyre.dualT
  return round(perTyre * TYRES_PER_AXLE[fit] * speedFactor, 2)
}

export { TYRES, tyreFit, round }
