// Statutory checks against the selected market's rules (lib/regulations.js).
import { tyreFit, round } from "./model.js"
import { CAR_CARRIER } from "./equipment.js"

const GROUP_NAMES = { 1: "single axle", 2: "tandem group", 3: "tri-axle group" }
const STD_BODY_WIDTH_M = 2.5
const resolveLimit = (val, args) => (typeof val === "function" ? val(args) : val)

function exemptionFlags(ctx) {
  const { parts, config } = ctx
  const fit = tyreFit(parts.tyre, config.suspension)
  return {
    isAir: parts.suspension.isAir,
    isWide: fit === "wide",
    tyreWidthMm: parts.tyre.widthMm,
    isCarrier: parts.model.family === "carrier",
    isContainer: false,
    is40PlusContainer: false,
    is45Container: false
  }
}

function check(id, label, value, limit, exceed, { unit = "t", note = "", isWeightBased = true } = {}) {
  if (limit === null || limit === undefined || !Number.isFinite(limit)) return null
  const status = value > limit + 1e-6 ? exceed : "ok"
  return { id, group: "legal", label, value: round(value, 2), limit: round(limit, 2), unit, status, note, isWeightBased }
}

function axleChecks(ctx, exceed) {
  const { parts, loads, config, geo } = ctx
  const { region, suspension, tyre, tractor } = parts
  const n = config.axles
  const groupName = GROUP_NAMES[n] ?? `${n}-axle group`
  const fit = tyreFit(tyre, config.suspension)
  const groupLimit = region.trailerGroup(n, config.spacingM, fit, { isAir: suspension.isAir, tyreWidthMm: tyre.widthMm })
  const checks = []
  if (groupLimit === null || groupLimit === undefined) {
    const note = region.verified
      ? `${region.name} sets no limit for a ${groupName} — needs an abnormal-load permit.`
      : "Axle-group limit not published in a verifiable official source — confirm locally."
    checks.push({ id: "legal-group", group: "legal", label: `Trailer ${groupName} load`, value: loads.groupT, limit: null, unit: "t", status: region.verified ? exceed : "info", note, isWeightBased: true })
  } else {
    checks.push(check("legal-group", `Trailer ${groupName} load`, loads.groupT, groupLimit, exceed, { note: `${n} × ${config.spacingM} m spacing, ${fit === "wide" ? "super-single" : "dual"} tyres` }))
  }
  checks.push(check("legal-steer", "Tractor steer axle", loads.steerT, region.steer, exceed))
  const driveLimit = tractor.driveAxles > 1 ? region.driveTandem(false) : region.driveSingle
  checks.push(check("legal-drive", `Tractor drive ${tractor.driveAxles > 1 ? "tandem" : "axle"}`, loads.driveT, driveLimit, exceed))

  const { dolly } = parts
  if (dolly) {
    const dollyLimit = region.trailerGroup(dolly.lines, dolly.spacingM, "line", { isAir: false, tyreWidthMm: dolly.tyre.widthMm })
    const dollyName = GROUP_NAMES[dolly.lines] ?? `${dolly.lines}-line group`
    checks.push(dollyLimit === null || dollyLimit === undefined
      ? { id: "legal-dolly", group: "legal", label: `Dolly ${dollyName} load`, value: loads.dollyGroupT, limit: null, unit: "t", status: region.verified ? exceed : "info", note: region.verified ? "No statutory limit for this group — permit required." : "Axle-group limit not verifiable — confirm locally.", isWeightBased: true }
      : check("legal-dolly", `Dolly ${dollyName} load`, loads.dollyGroupT, dollyLimit, exceed, { note: `${dolly.lines} line(s) × ${dolly.spacingM} m, 8 tyres per line` }))
  }
  const dollyLines = dolly?.lines ?? 0
  const totalAxles = 1 + tractor.driveAxles + n + dollyLines
  const outerSpanM = tractor.wheelbaseM - tractor.fifthWheelLeadM + (dolly?.offsetM ?? 0) + geo.lastX
  const kingpinToFirstAxleM = geo.lastX - (n - 1) * config.spacingM
  const flags = exemptionFlags(ctx)
  checks.push(check("legal-gcw", `Gross combination weight (${totalAxles} axles)`, loads.gcwT, region.gcw({ totalAxles, outerSpanM, kingpinToFirstAxleM, ...flags }), exceed))
  if (region.trailerGvw) {
    checks.push(check("legal-trailer-gvw", `Semi-trailer gross mass (${n} axles)`, loads.trailerGvwT, region.trailerGvw({ model: config.model, trailerAxles: n }), exceed))
  }
  if (region.minDriveShare) {
    const share = loads.driveT / loads.gcwT
    const isLow = share < region.minDriveShare
    checks.push({ id: "legal-drive-share", group: "legal", label: "Drive-axle share of GCW (min)", value: round(share * 100, 1), limit: region.minDriveShare * 100, unit: "%", status: isLow ? exceed : "ok", note: "GB 1589 §4.6.1: drive axle ≥ 25% of GCW", isWeightBased: true })
  }
  return checks
}

function dimensionChecks(ctx, exceed) {
  const { parts, config, geo, tipper } = ctx
  const { region, model, tractor } = parts
  const dims = { unit: "m", isWeightBased: false }
  const checks = []
  const isCargoDriven = model.family === "lowbed" || model.family === "modular"
  const isLowbedWidth = model.family === "lowbed" && model.isIndivisible && region.maxWidthLowbed
  const width = model.family === "carrier" ? null : isCargoDriven ? config.cargo.widthM : STD_BODY_WIDTH_M
  if (width !== null) {
    checks.push(check("legal-width", "Overall width", width, isLowbedWidth ? region.maxWidthLowbed : region.maxWidth, exceed, { ...dims, note: isLowbedWidth ? "Low-bed semi-trailer allowance (GB 1589 §4.7.1)" : "" }))
  }
  const flags = exemptionFlags(ctx)
  const height = overallHeightM(ctx)
  if (height !== null) checks.push(check("legal-height", "Overall loaded height", height, resolveLimit(region.maxHeight, flags), exceed, dims))

  const trailerLimit = region.trailerLength?.({ model: config.model, trailerAxles: config.axles, ...flags })
  checks.push(check("legal-trailer-length", "Semi-trailer length", config.lengthM, trailerLimit, exceed, dims))
  checks.push(check("legal-kingpin-rear", "Kingpin to trailer rear", geo.rearX, resolveLimit(region.maxKingpinToRear, flags), exceed, dims))
  const comboLength = tractor.frontOverhangM + tractor.wheelbaseM - tractor.fifthWheelLeadM + (parts.dolly?.offsetM ?? 0) + geo.rearX
  checks.push(check("legal-combo-length", "Combination length", comboLength, resolveLimit(region.maxCombinationLength, flags), exceed, { ...dims, note: "Estimated from tractor geometry" }))
  if (region.maxRearOverhang) {
    const overhang = geo.rearX - geo.lastX
    const limit = Math.min(region.maxRearOverhang, region.rearOverhangRatio * geo.lastX)
    checks.push(check("legal-rear-overhang", "Rear overhang behind last axle", overhang, limit, exceed, { ...dims, note: "GB 1589 §4.5: ≤ 55% of wheelbase and ≤ 3.5 m" }))
  }
  if (tipper && region.id === "CN") {
    checks.push({ id: "legal-cn-sideboard", group: "legal", label: "Body side height (GB 1589 §4.6.3)", value: tipper.sideHeightM, limit: null, unit: "m", status: "info", note: "§4.6.3 caps trailer side-boards at 600 mm; confirm how your registration authority applies it to tipper semi-trailers.", isWeightBased: true })
  }
  return checks
}

function overallHeightM({ parts, config, geo, tipper }) {
  const family = parts.model.family
  if (tipper) return config.deckMm / 1000 + tipper.sideHeightM
  if (family === "carrier") return geo.neckDeckMm / 1000 + CAR_CARRIER.upperDeckGapM + CAR_CARRIER.upperDeckThicknessM + CAR_CARRIER.carHeightM
  if (family !== "lowbed" && family !== "modular") return null
  const cargoEnd = config.cargo.posM + config.cargo.lengthM / 2
  const deckMm = family === "lowbed" && cargoEnd > geo.wellEndX ? geo.rearDeckMm : config.deckMm
  return deckMm / 1000 + config.cargo.heightM
}

export function legalChecks(ctx) {
  const exceed = ctx.parts.model.isIndivisible ? "permit" : "fail"
  return [...axleChecks(ctx, exceed), ...dimensionChecks(ctx, exceed)].filter(Boolean)
}

export { overallHeightM }
