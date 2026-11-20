// Public entry point: evaluate(rawConfig) -> full engineering result.
import { normalizeConfig, maxAxlesForLength, minLengthForAxles, trailerTare, payloadCgX, solveLoads, tyreAxleCapT, tyreFit, round } from "./model.js"
import { mechanicalChecks, geometryChecks, tipperChecks, rampInfo } from "./checks.js"
import { legalChecks, overallHeightM } from "./legal.js"

export const STATUS_RANK = { ok: 0, info: 0, warn: 1, permit: 2, fail: 3 }

const VERDICTS = {
  ok: { status: "ok", title: "Compliant", text: "Within the selected market's statutory limits and the equipment ratings." },
  warn: { status: "warn", title: "Feasible — review warnings", text: "Legal and within ratings, but some items need attention." },
  permit: { status: "permit", title: "Feasible with abnormal-load permit", text: "Equipment can carry it, but statutory limits are exceeded — an oversize/overweight permit is required." },
  fail: { status: "fail", title: "Not feasible", text: "An equipment rating, geometry limit or (for divisible loads) a statutory limit is exceeded." }
}

const MAX_SEARCH_T = 600

function contextFor(norm, payloadT) {
  const config = { ...norm.config, cargo: { ...norm.config.cargo, weightT: payloadT } }
  const { parts, geometry: geo } = norm
  const tare = trailerTare(config, parts.model, parts.suspension)
  const cgX = payloadCgX(config, parts.model, geo)
  const loads = solveLoads({ payloadT, cgX, tare, geo, tractor: parts.tractor, axles: config.axles, dolly: parts.dolly })
  return { config, parts, geo, tare, cgX, loads }
}

function axleHint(norm, maxAxles) {
  const { config, parts } = norm
  const { model, tyre } = parts
  if (model.family === "modular" || maxAxles >= model.axles.max) return ""
  const need = minLengthForAxles(model, maxAxles + 1, config.rearOverhangM, config.spacingM, tyre.diaMm)
  return need <= model.length.max ? `${maxAxles + 1} axles need ≥ ${need} m length.` : `Max ${model.axles.max} axles needs a longer frame than this model offers.`
}

function runChecks(norm, ctx) {
  const { config, parts } = ctx
  const maxAxles = parts.model.family === "modular"
    ? parts.model.axles.max
    : maxAxlesForLength(parts.model, config.lengthM, config.rearOverhangM, config.spacingM, parts.tyre.diaMm)
  const full = { ...ctx, maxAxles, minLengthForMax: axleHint(norm, maxAxles) }
  const { checks: tipChecks, tipper } = tipperChecks(full)
  const withTipper = { ...full, tipper }
  const checks = [
    ...mechanicalChecks(withTipper),
    ...geometryChecks(withTipper),
    ...tipChecks,
    ...legalChecks(withTipper),
    rampInfo(withTipper)
  ].filter(Boolean)
  return { checks, tipper, maxAxles }
}

function worstStatus(checks) {
  return checks.reduce((worst, c) => (STATUS_RANK[c.status] > STATUS_RANK[worst] ? c.status : worst), "ok")
}

/** Largest payload (t) that keeps the chosen check groups free of the given statuses. */
function maxPayload(norm, isBlocking) {
  const passes = (w) => {
    const { checks } = runChecks(norm, contextFor(norm, w))
    return !checks.some((c) => c.isWeightBased && isBlocking(c))
  }
  if (!passes(0)) return 0
  let lo = 0
  let hi = MAX_SEARCH_T
  if (passes(hi)) return hi
  for (let i = 0; i < 40 && hi - lo > 0.05; i++) {
    const mid = (lo + hi) / 2
    if (passes(mid)) lo = mid
    else hi = mid
  }
  return round(lo, 1)
}

export function evaluate(raw) {
  const norm = normalizeConfig(raw)
  const ctx = contextFor(norm, norm.config.cargo.weightT)
  const { checks, tipper, maxAxles } = runChecks(norm, ctx)
  const status = worstStatus(checks)
  const fit = tyreFit(norm.parts.tyre, norm.config.suspension)
  return {
    config: norm.config,
    issues: norm.issues,
    bounds: norm.bounds,
    parts: norm.parts,
    geometry: norm.geometry,
    tare: ctx.tare,
    cgX: ctx.cgX,
    loads: ctx.loads,
    tipper,
    checks,
    maxAxles,
    tyreAxleCapT: tyreAxleCapT(norm.parts.tyre, fit, norm.parts.speedRating?.tyreFactor),
    overallHeightM: overallHeightM({ ...ctx, tipper }),
    verdict: VERDICTS[status],
    maxPayloadT: {
      technical: maxPayload(norm, (c) => c.group !== "legal" && c.status === "fail"),
      legal: maxPayload(norm, (c) => c.status === "fail" || c.status === "permit")
    }
  }
}

export { normalizeConfig }
