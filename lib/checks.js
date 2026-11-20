// Engineering, geometry and statutory checks. Each check returns
// { id, group, label, value, limit, unit, status, note, isWeightBased }.
// status: ok | warn | permit | fail | info
import { tyreAxleCapT, tyreFit, round } from "./model.js"
import { carLayout } from "./carrier.js"
import { CAR_CARRIER, GOOSENECK, KINGPIN_SETBACK_M, TRACTOR_BOGIE_HALF_SPACING_M, TRACTOR_TYRE_DIA_M, NECK_TYRE_CLEARANCE_M } from "./equipment.js"

/** Shortest gooseneck whose drop clears the tractor's rear corners when it turns. */
export function requiredNeckM(tractor) {
  const rearEnd = tractor.fifthWheelLeadM + (tractor.driveAxles > 1 ? TRACTOR_BOGIE_HALF_SPACING_M : 0) + tractor.rearOverhangM
  const swingRadius = Math.hypot(rearEnd, GOOSENECK.tractorHalfWidthM)
  return round(swingRadius + GOOSENECK.swingClearanceM + GOOSENECK.dropLeadM + KINGPIN_SETBACK_M, 2)
}

const MAX_RAMP_DEG = 25
const LOW_KINGPIN_SHARE = 0.1
const LOW_TRACTION_SHARE = 0.2
const LIFT_SAFETY_FACTOR = 1.5
const BODY_MASS_T_PER_M = 0.28

function limitCheck({ id, group, label, value, limit, unit = "t", exceed = "fail", note = "", isWeightBased = true }) {
  if (limit === null || limit === undefined) return null
  const isOver = value > limit + 1e-6
  return { id, group, label, value: round(value, 2), limit: round(limit, 2), unit, status: isOver ? exceed : "ok", note, isWeightBased }
}

function infoCheck({ id, group, label, value = null, unit = "", status = "info", note = "", isWeightBased = false }) {
  return { id, group, label, value, limit: null, unit, status, note, isWeightBased }
}

export function mechanicalChecks(ctx) {
  const { loads, parts, config, geo } = ctx
  const { suspension, tyre, tractor, speedRating } = parts
  const fit = tyreFit(tyre, config.suspension)
  const unitWord = suspension.kind === "multiline" ? "axle line" : "axle"
  const axleRating = speedRating?.ratingT ?? suspension.ratingT
  const checks = [
    limitCheck({ id: "axle-rating", group: "mechanical", label: `Load per ${unitWord} vs ${suspension.kind} rating`, value: loads.perAxleT, limit: axleRating, note: speedRating ? speedRating.label : suspension.label }),
    limitCheck({ id: "tyre-rating", group: "mechanical", label: `Load per ${unitWord} vs tyre capacity`, value: loads.perAxleT, limit: tyreAxleCapT(tyre, fit, speedRating?.tyreFactor), note: `${tyre.label} × ${fit === "wide" ? 2 : fit === "line" ? 8 : 4}${speedRating?.tyreFactor ? ` · +${Math.round((speedRating.tyreFactor - 1) * 100)}% low-speed bonus` : ""}` }),
    limitCheck({ id: "tractor-steer", group: "mechanical", label: "Tractor steer axle vs rating", value: loads.steerT, limit: tractor.steerRatingT, note: tractor.label }),
    limitCheck({ id: "tractor-drive", group: "mechanical", label: `Tractor drive ${tractor.driveAxles > 1 ? "bogie" : "axle"} vs rating`, value: loads.driveT, limit: tractor.driveRatingT, note: tractor.label })
  ]
  const { dolly } = parts
  checks.push(limitCheck({ id: "tractor-fifth-wheel", group: "mechanical", label: "Tractor fifth-wheel load vs rating", value: loads.tractorKingpinT, limit: tractor.fifthWheelRatingT, note: tractor.label }))
  if (dolly) {
    checks.push(
      limitCheck({ id: "dolly-system", group: "mechanical", label: "Gooseneck load vs jeep-dolly system capacity", value: loads.kingpinT, limit: dolly.capacityT, note: `${dolly.lines} × ${dolly.ratingPerLineT} t lines + ${tractor.fifthWheelRatingT} t tractor fifth wheel − ${dolly.tareT} t dolly tare` }),
      limitCheck({ id: "dolly-rating", group: "mechanical", label: `Dolly load per axle line vs rating (${dolly.lines} line${dolly.lines > 1 ? "s" : ""} · ${dolly.axles} axles)`, value: loads.dollyPerLineT, limit: dolly.ratingPerLineT, note: `Dolly ${dolly.lengthM} m kingpin → bogie; trailer gooseneck ${parts.model.neckM} m` }),
      limitCheck({ id: "dolly-tyre", group: "mechanical", label: "Dolly load per axle line vs tyre capacity", value: loads.dollyPerLineT, limit: dolly.tyreCapPerLineT, note: `${dolly.tyre.label} × 8 per line` })
    )
  }
  if (loads.kingpinT <= 0) {
    checks.unshift(infoCheck({ id: "kingpin", group: "mechanical", label: "Kingpin load", value: loads.kingpinT, unit: "t", status: "fail", note: "Load CG is behind the axle group — the trailer will lift the tractor. Move cargo forward.", isWeightBased: true }))
  } else if (loads.kingpinT < loads.trailerGvwT * LOW_KINGPIN_SHARE) {
    checks.unshift(infoCheck({ id: "kingpin", group: "mechanical", label: "Kingpin load", value: loads.kingpinT, unit: "t", status: "warn", note: "Very light kingpin load — poor tractor traction and steering. Move cargo forward.", isWeightBased: true }))
  }
  const driveShare = loads.driveT / loads.gcwT
  if (driveShare < LOW_TRACTION_SHARE) {
    checks.push(infoCheck({ id: "traction", group: "mechanical", label: "Drive-axle share of GCW", value: round(driveShare * 100, 1), unit: "%", status: "warn", note: "Below 20% — wheel-spin risk on grades.", isWeightBased: true }))
  }
  if (geo.groupX <= 0) checks.push(infoCheck({ id: "group-pos", group: "geometry", label: "Axle group position", status: "fail", note: "Axle group must be behind the kingpin." }))
  return checks.filter(Boolean)
}

export function geometryChecks(ctx) {
  const { geo, parts, config, maxAxles, minLengthForMax } = ctx
  const { model } = parts
  const checks = []
  if (model.family !== "modular") {
    checks.push(limitCheck({
      id: "axle-fit", group: "geometry", label: "Axle group fits trailer length", unit: "axles",
      value: config.axles, limit: maxAxles, isWeightBased: false,
      note: `Group ${round(geo.groupSpanM, 2)} m on ${config.spacingM} m spacing; front tyre ${round(geo.frontTyreEdgeX, 2)} m from kingpin (min ${model.minFrontClearM} m). ${minLengthForMax}`
    }))
  }
  if (model.hasGooseneck && !parts.dolly) {
    checks.push(limitCheck({
      id: "neck-swing", group: "geometry", label: "Gooseneck length clears tractor swing", unit: "m",
      value: requiredNeckM(parts.tractor), limit: model.neckM, isWeightBased: false,
      note: `${parts.tractor.label} rear corners need a ≥ ${requiredNeckM(parts.tractor)} m neck; set ${model.neckM} m`
    }))
  }
  if (!parts.dolly) {
    const clearanceM = round(parts.tractor.fifthWheelMm / 1000 - TRACTOR_TYRE_DIA_M, 2)
    const isTight = clearanceM < NECK_TYRE_CLEARANCE_M
    checks.push(infoCheck({ id: "fifth-wheel-height", group: "geometry", label: "Trailer underside over tractor drive tyres", value: clearanceM, unit: "m", status: isTight ? "warn" : "info", note: isTight ? `Fifth wheel ${parts.tractor.fifthWheelMm} mm is below standard ${TRACTOR_TYRE_DIA_M * 1000} mm tyres + ${NECK_TYRE_CLEARANCE_M * 1000} mm — needs a low-profile tractor (smaller drive tyres).` : `Fifth wheel ${parts.tractor.fifthWheelMm} mm` }))
  }
  if (model.family === "lowbed" || model.family === "carrier") {
    checks.push(infoCheck({ id: "road-clearance", group: "geometry", label: "Road clearance under the well", value: geo.roadClearanceMm, unit: "mm", status: geo.roadClearanceMm < 150 ? "warn" : "info", note: `Well beam ${geo.wellBeamMm} mm at ${config.deckMm} mm deck; rear deck over axles ${geo.rearDeckMm} mm` }))
  }
  if (model.family === "tipper") {
    checks.push(limitCheck({
      id: "deck-stack", group: "geometry", label: "Min. frame height over tyres vs. set height", unit: "mm",
      value: geo.minDeckOverAxleMm, limit: config.deckMm, isWeightBased: false,
      note: `Tyre radius + ${parts.suspension.kind} stack + ${model.beamDepthMm} mm main beam`
    }))
  }
  if (model.family === "lowbed" || model.family === "modular") checks.push(...cargoFitChecks(ctx))
  if (model.family === "carrier") checks.push(carPositionsCheck(ctx))
  return checks.filter(Boolean)
}

const MAX_CAR_MASS_T = 2.5 // heavy SUV / EV

function carPositionsCheck({ config, geo }) {
  const layout = carLayout(config, geo)
  const typicalT = round(layout.count * CAR_CARRIER.carMassT, 1)
  const isTooHeavy = config.cargo.weightT > layout.count * MAX_CAR_MASS_T
  const isTooShort = layout.positionLengthM < CAR_CARRIER.minPositionM
  const note = isTooShort
    ? `Each position is only ${layout.positionLengthM} m — too short for ${layout.count} cars; lengthen the trailer or choose fewer positions.`
    : isTooHeavy
      ? `${config.cargo.weightT} t is more than ${layout.count} cars can weigh (≤ ${MAX_CAR_MASS_T} t each).`
      : `${layout.lower.length} lower + ${layout.upper.length} upper, cars up to ${layout.positionLengthM} m ≈ ${typicalT} t at ${CAR_CARRIER.carMassT} t per car`
  return infoCheck({ id: "car-positions", group: "geometry", label: "Car positions", value: layout.count, unit: "cars", status: isTooShort ? "fail" : isTooHeavy ? "warn" : "info", note })
}

function cargoFitChecks({ geo, config, parts }) {
  const { cargo } = config
  const start = cargo.posM - cargo.lengthM / 2
  const end = cargo.posM + cargo.lengthM / 2
  const wellLen = round(geo.wellEndX - geo.deckStartX, 2)
  if (start < geo.deckStartX - 1e-6 || end > geo.rearX + 1e-6) {
    return [infoCheck({ id: "cargo-fit", group: "geometry", label: "Cargo footprint on deck", status: "fail", note: `Cargo spans ${round(start, 2)}–${round(end, 2)} m; usable deck is ${round(geo.deckStartX, 2)}–${round(geo.rearX, 2)} m from kingpin.` })]
  }
  const isFlatDeck = config.deckMm >= geo.rearDeckMm
  if (parts.model.family === "lowbed" && !isFlatDeck && end > geo.wellEndX + 1e-6) {
    return [infoCheck({ id: "cargo-fit", group: "geometry", label: "Cargo footprint on deck", status: "warn", note: `Cargo runs onto the raised rear deck (${geo.rearDeckMm} mm). Well length is ${wellLen} m.` })]
  }
  return [infoCheck({ id: "cargo-fit", group: "geometry", label: "Cargo footprint on deck", status: "ok", note: `Fits the ${wellLen} m loading well.` })]
}

export function tipperChecks(ctx) {
  const { config, parts, loads, geo } = ctx
  const tip = parts.model.tipping
  if (!tip) return { checks: [], tipper: null }
  const bodyLen = geo.rearX - geo.deckStartX
  const loadVolume = config.cargo.weightT / parts.material.densityT
  const volume = config.volumeM3 ? Math.max(config.volumeM3, loadVolume) : loadVolume
  const sideHeight = volume / (bodyLen * tip.bodyWidthM)
  const bodyMass = BODY_MASS_T_PER_M * bodyLen
  const liftLoad = config.cargo.weightT + bodyMass
  // Front cylinder: hinge at rear, load CG at mid-body. Side tipper: hinge at the side edge.
  const leverRatio = tip.type === "rear" ? bodyLen / 2 / Math.max(1, bodyLen - 0.2) : 0.5
  const liftT = liftLoad * leverRatio * LIFT_SAFETY_FACTOR
  const tipper = { bodyLenM: round(bodyLen), volumeM3: round(volume, 1), sideHeightM: round(sideHeight, 2), liftT: round(liftT, 1), cylinders: tip.type === "side" ? 2 : 1 }
  const checks = [
    limitCheck({ id: "body-height", group: "geometry", label: "Body side height needed (level load)", unit: "m", value: sideHeight, limit: tip.maxSideM, note: `${tipper.volumeM3} m³ of ${parts.material.label} in a ${round(bodyLen, 1)} × ${tip.bodyWidthM} m body` }),
    infoCheck({ id: "lift", group: "mechanical", label: `Hydraulic lift capacity needed (${tip.type === "rear" ? "front telescopic cylinder" : "2 side cylinders"})`, value: tipper.liftT, unit: "t", note: `Incl. ×${LIFT_SAFETY_FACTOR} breakaway factor; body ≈ ${round(bodyMass, 1)} t`, isWeightBased: true })
  ]
  return { checks: checks.filter(Boolean), tipper, loads }
}

export function rampInfo({ parts, geo, config }) {
  const ramp = parts.model.ramp
  if (!ramp) return null
  const heightM = (ramp.type === "rear" ? geo.rearDeckMm : config.deckMm) / 1000
  const angle = round((Math.asin(Math.min(1, heightM / ramp.lengthM)) * 180) / Math.PI, 1)
  return infoCheck({ id: "ramp", group: "geometry", label: `${ramp.type === "rear" ? "Rear" : "Front (neck removed)"} loading angle`, value: angle, unit: "°", status: angle > MAX_RAMP_DEG && parts.model.isIndivisible ? "warn" : "info", note: `${ramp.lengthM} m ramp from ${Math.round(heightM * 1000)} mm deck${angle > MAX_RAMP_DEG && parts.model.isIndivisible ? ` — steeper than ${MAX_RAMP_DEG}°, hard for tracked machinery` : ""}` })
}
