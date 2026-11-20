// Side-elevation parts drawn in metres through a scale `s` ({ k, X(x), Y(h) }).
// Pure string builders; every number comes from the engine, never from user text.
import { TRACTOR_TYRE_DIA_M, TRACTOR_BOGIE_HALF_SPACING_M, LANDING_LEG } from "./equipment.js"
import { excavator } from "./render-excavator.js"

export const NECK_DEPTH_M = 0.42
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1)

/** Inline gradient fill (inline styles resolve `url(#id)` against the SVG document). */
export const grad = (id) => ` style="fill:url(#${id})"`

export const poly = (s, pts, cls, extra = "") => `<polygon points="${pts.map(([x, h]) => `${s.X(x)},${s.Y(h)}`).join(" ")}" class="${cls}"${extra} />`
export const rect = (s, x1, h1, x2, h2, cls, rx = 0, extra = "") =>
  `<rect x="${s.X(Math.min(x1, x2))}" y="${s.Y(Math.max(h1, h2))}" width="${(Math.abs(x2 - x1) * s.k).toFixed(1)}" height="${(Math.abs(h2 - h1) * s.k).toFixed(1)}" rx="${rx}" class="${cls}"${extra} />`
export const line = (s, x1, h1, x2, h2, cls) => `<line x1="${s.X(x1)}" y1="${s.Y(h1)}" x2="${s.X(x2)}" y2="${s.Y(h2)}" class="${cls}" />`
export const dot = (s, x, h, rM, cls) => `<circle cx="${s.X(x)}" cy="${s.Y(h)}" r="${(rM * s.k).toFixed(1)}" class="${cls}" />`
/** Stroked segment with a width given in metres (hydraulic rams, ramps). */
export const bar = (s, x1, h1, x2, h2, widthM, cls) =>
  `<line x1="${s.X(x1)}" y1="${s.Y(h1)}" x2="${s.X(x2)}" y2="${s.Y(h2)}" class="${cls}" style="stroke-width:${(widthM * s.k).toFixed(1)}px" />`

/** Hydraulic ram: barrel on the first 58% of the stroke, polished rod on the rest. */
export function ram(s, [x1, h1], [x2, h2], widthM = 0.11) {
  const mx = x1 + (x2 - x1) * 0.58
  const mh = h1 + (h2 - h1) * 0.58
  return `${bar(s, mx, mh, x2, h2, widthM * 0.5, "cad-ram-rod")}${bar(s, x1, h1, mx, mh, widthM, "cad-ram")}
    ${dot(s, x1, h1, widthM * 0.5, "cad-pin")}${dot(s, x2, h2, widthM * 0.5, "cad-pin")}`
}

/** Rear end: red tail lamp and under-run bar. */
export function rearEnd(s, rearX, deckH, beamM) {
  return `${rect(s, rearX - 0.05, deckH - 0.22, rearX + 0.02, deckH - 0.06, "cad-lamp-red", 1)}
    ${rect(s, rearX - 0.16, 0.52, rearX - 0.08, deckH - beamM, "cad-leg")}
    ${rect(s, rearX - 0.26, 0.44, rearX + 0.02, 0.54, "cad-leg", 1)}`
}

/** Amber side marker lamps along a beam. */
export function markers(s, fromX, toX, h, stepM = 1.6) {
  const out = []
  for (let x = fromX; x <= toX + 1e-6; x += stepM) out.push(rect(s, x - 0.06, h - 0.025, x + 0.06, h + 0.025, "cad-marker", 1))
  return out.join("")
}

/**
 * Suspension between the wheels: hangers from the frame (all types) and leaf packs
 * (mechanical). Drawn before the wheels so only the visible parts show.
 */
export function runningGear(s, xs, tyreR, frameBottomH, kind) {
  if (kind === "multiline" || frameBottomH < tyreR + 0.18 || !xs.length) return ""
  const pitch = xs.length > 1 ? xs[1] - xs[0] : 1.31
  const hangerXs = [xs[0] - pitch / 2, ...xs.slice(1).map((x) => x - pitch / 2), xs[xs.length - 1] + pitch / 2]
  const hangers = hangerXs.map((x) => poly(s, [[x - 0.1, frameBottomH], [x + 0.1, frameBottomH], [x + 0.05, tyreR + 0.1], [x - 0.05, tyreR + 0.1]], "cad-hanger"))
  const springs = kind === "mechanical"
    ? xs.map((x) => `<path d="M ${s.X(x - pitch / 2)} ${s.Y(tyreR + 0.16)} Q ${s.X(x)} ${s.Y(tyreR - 0.06)} ${s.X(x + pitch / 2)} ${s.Y(tyreR + 0.16)}" class="cad-spring" />`)
    : xs.map((x) => rect(s, x + 0.14, tyreR + 0.06, x + 0.4, frameBottomH, "cad-airbag", 4))
  return `${springs.join("")}${hangers.join("")}`
}

/** Landing leg (stowed): outer tube with crank gearbox, telescopic inner leg and foot plate. */
export function landingLeg(s, x, topH, footH = LANDING_LEG.stowedFootM) {
  const tubeBottom = Math.min(topH - 0.1, footH + 0.22)
  return `<g class="cad-landing-leg">
    ${rect(s, x - 0.05, footH + 0.04, x + 0.05, tubeBottom + 0.02, "cad-leg-inner")}
    ${rect(s, x - 0.08, tubeBottom, x + 0.08, topH, "cad-leg", 1)}
    ${rect(s, x + 0.08, topH - 0.26, x + 0.21, topH - 0.08, "cad-leg", 1)}
    ${rect(s, x - 0.17, footH, x + 0.17, footH + 0.05, "cad-leg", 1)}
  </g>`
}

export function wheel(s, xM, diaM, status = "ok") {
  const r = (diaM / 2) * s.k
  const cx = s.X(xM)
  const cy = s.Y(diaM / 2)
  const holes = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const a = (deg * Math.PI) / 180
    return `<circle cx="${(cx + Math.cos(a) * r * 0.4).toFixed(1)}" cy="${(cy + Math.sin(a) * r * 0.4).toFixed(1)}" r="${Math.max(0.9, r * 0.055).toFixed(1)}" class="cad-rim-hole" />`
  }).join("")
  const ring = status === "ok" || status === "info" ? "" : `<circle cx="${cx}" cy="${cy}" r="${(r + 2.5).toFixed(1)}" class="cad-alert st-${status}" />`
  return `<g>${ring}<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" class="cad-tyre" />
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.8).toFixed(1)}" class="cad-tyre-wall" />
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.58).toFixed(1)}" class="cad-rim" />
    ${holes}<circle cx="${cx}" cy="${cy}" r="${(r * 0.2).toFixed(1)}" class="cad-hub" />
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.08).toFixed(1)}" class="cad-rim-hole" /></g>`
}

export function tractorParts(s, r, fifthWheelX, statuses) {
  const t = r.parts.tractor
  const fw = t.fifthWheelMm / 1000
  const chassisTop = Math.min(1.2, fw - 0.16) // frame drops with a low fifth wheel
  const steerX = fifthWheelX - (t.wheelbaseM - t.fifthWheelLeadM)
  const driveX = fifthWheelX + t.fifthWheelLeadM
  const driveXs = t.driveAxles > 1 ? [driveX - TRACTOR_BOGIE_HALF_SPACING_M, driveX + TRACTOR_BOGIE_HALF_SPACING_M] : [driveX]
  const front = steerX - t.frontOverhangM
  const cabRear = front + 2.35
  const tyreR = TRACTOR_TYRE_DIA_M / 2
  const tankStart = cabRear + 0.12
  const tankEnd = Math.min(front + 3.45, driveXs[0] - tyreR - 0.25)
  const tank = tankEnd - tankStart > 0.5
    ? `${rect(s, tankStart, 0.55, tankEnd, 1.0, "cad-tank", 6)}${[0.3, 0.7].map((p) => line(s, tankStart + (tankEnd - tankStart) * p, 0.55, tankStart + (tankEnd - tankStart) * p, 1.0, "cad-tank-strap")).join("")}`
    : ""
  return `<g class="cad-tractor">
    ${rect(s, front + 0.15, chassisTop - 0.25, driveXs[driveXs.length - 1] + 0.75, chassisTop, "cad-chassis")}
    ${tank}
    ${rect(s, cabRear + 0.02, 1.2, cabRear + 0.12, 3.95, "cad-exhaust", 2)}
    ${poly(s, [[front + 0.9, 3.55], [cabRear - 0.05, 3.58], [cabRear - 0.05, 3.9], [front + 1.25, 3.72]], "cad-deflector")}
    <path d="M ${s.X(front)} ${s.Y(1.0)} L ${s.X(front)} ${s.Y(2.35)} L ${s.X(front + 0.16)} ${s.Y(3.12)} Q ${s.X(front + 0.3)} ${s.Y(3.5)} ${s.X(front + 0.75)} ${s.Y(3.52)} L ${s.X(cabRear)} ${s.Y(3.58)} L ${s.X(cabRear)} ${s.Y(1.0)} Z" class="cad-cab"${grad("gCab")} />
    ${poly(s, [[front + 0.07, 2.42], [front + 0.2, 3.08], [front + 0.95, 3.14], [front + 0.95, 2.42]], "cad-glass")}
    ${rect(s, front + 1.02, 1.12, front + 1.72, 2.45, "cad-door", 3)}
    ${rect(s, front + 1.08, 2.5, front + 1.66, 3.1, "cad-glass", 3)}
    ${rect(s, front + 1.56, 2.2, front + 1.68, 2.25, "cad-grille")}
    ${rect(s, front + 1.85, 2.55, front + 2.2, 2.9, "cad-glass", 3)}
    ${rect(s, front - 0.14, 2.45, front - 0.04, 2.95, "cad-mirror", 2)}
    ${[1.35, 1.6, 1.85, 2.1].map((h) => line(s, front + 0.02, h, front + 0.22, h, "cad-grille")).join("")}
    ${rect(s, front - 0.02, 1.02, front + 0.1, 1.22, "cad-headlamp", 2)}
    ${rect(s, front - 0.06, 0.48, front + 0.28, 0.98, "cad-bumper", 3)}
    ${rect(s, front + 1.1, 0.62, front + 1.62, 0.7, "cad-bumper", 1)}${rect(s, front + 1.1, 0.86, front + 1.62, 0.94, "cad-bumper", 1)}
    ${rect(s, fifthWheelX - 0.55, fw - 0.16, fifthWheelX + 0.55, fw, "cad-saddle", 2)}
    ${wheel(s, steerX, TRACTOR_TYRE_DIA_M, statuses.steer)}
    ${driveXs.map((x) => wheel(s, x, TRACTOR_TYRE_DIA_M, statuses.drive)).join("")}
  </g>`
}

/** Height the trailer kingpin plate sits at: the dolly's fifth wheel, else the tractor's. */
export const couplingM = (r) => (r.parts.dolly ? r.parts.dolly.fifthWheelM : r.parts.tractor.fifthWheelMm / 1000)

/**
 * Jeep dolly (狼狈式牵引座): high front gooseneck on the tractor fifth wheel sloping down to a
 * low main frame, landing legs, 1–3 axle lines at the rear and a turntable under the trailer kingpin.
 */
export function dollyParts(s, r, status) {
  const d = r.parts.dolly
  if (!d) return ""
  const t = r.parts.tractor
  const tfw = t.fifthWheelMm / 1000
  const dia = d.tyre.diaMm / 1000
  const frameTop = d.fifthWheelM - 0.16
  const frameBottom = Math.max(dia - 0.02, frameTop - 0.18)
  const neckTop = tfw + 0.36
  const tractorRear = d.kingpinX + t.fifthWheelLeadM + (t.driveAxles > 1 ? TRACTOR_BOGIE_HALF_SPACING_M : 0) + 0.75
  const slopeEnd = Math.min(d.lineXs[0] - dia / 2 - 0.18, r.geometry.frontX - 0.25)
  const underEnd = Math.min(slopeEnd - 0.18, Math.max(d.kingpinX + 1.25, tractorRear + 0.04))
  const neckEnd = Math.min(slopeEnd - 0.42, underEnd - 0.12)
  return `<g class="cad-dolly">
    ${runningGear(s, d.lineXs, dia / 2, frameBottom, "air")}
    ${poly(s, [
      [d.kingpinX - 0.55, tfw], [d.kingpinX - 0.55, tfw + 0.34], [neckEnd, neckTop], [slopeEnd, frameTop],
      [d.rearX, frameTop], [d.rearX, frameBottom], [slopeEnd - 0.14, frameBottom], [underEnd, tfw]
    ], "cad-dolly-steel", grad("gDolly"))}
    ${line(s, slopeEnd + 0.05, frameTop - 0.035, d.rearX - 0.05, frameTop - 0.035, "cad-deckline")}
    ${line(s, slopeEnd - 0.12, frameBottom + 0.03, d.rearX - 0.05, frameBottom + 0.03, "cad-flange")}
    ${rect(s, -0.52, frameTop, 0.52, d.fifthWheelM, "cad-saddle", 2)}
    ${rect(s, d.rearX - 0.05, frameBottom - 0.16, d.rearX, frameBottom, "cad-leg")}
    ${rect(s, d.rearX - 0.05, frameTop - 0.12, d.rearX + 0.01, frameTop - 0.03, "cad-lamp-red", 1)}
    ${d.lineXs.map((x) => wheel(s, x, dia, status)).join("")}
  </g>`
}

export function modularFrame(s, r) {
  const g = r.geometry
  const fw = couplingM(r)
  const deck = r.config.deckMm / 1000
  const depth = Math.min(0.6, Math.max(0.3, deck - g.tyreR * 2 - 0.05))
  const top = fw + NECK_DEPTH_M
  const s0 = r.config.spacingM
  const joints = Array.from({ length: r.config.axles + 1 }, (_, i) => g.deckStartX + i * s0).filter((x) => x <= g.rearX + 1e-6)
  const pendulums = Array.from({ length: r.config.axles }, (_, i) => g.firstX + i * s0)
    .map((x) => `${poly(s, [[x - 0.32, deck - depth], [x + 0.32, deck - depth], [x + 0.12, g.tyreR], [x - 0.12, g.tyreR]], "cad-hanger")}${rect(s, x + 0.2, g.tyreR + 0.1, x + 0.3, deck - depth, "cad-cylinder", 1)}`)
  const leg = r.parts.dolly ? landingLeg(s, g.deckStartX + LANDING_LEG.lowbedOffsetM, deck - depth) : ""
  return `<g>
    ${poly(s, [[g.frontX, fw + 0.04], [g.frontX, top], [g.neckEndX - 0.15, top], [g.deckStartX, deck], [g.deckStartX, deck - depth], [g.neckEndX - 0.4, fw], [g.frontX + 0.35, fw]], "cad-neck", grad("gNeck"))}
    ${rect(s, g.deckStartX, deck - depth, g.rearX, deck, "cad-trailer", 0, grad("gTrailer"))}
    ${line(s, g.deckStartX + 0.05, deck - 0.05, g.rearX - 0.05, deck - 0.05, "cad-deckline")}
    ${markers(s, g.deckStartX + 0.5, g.rearX - 0.3, deck - depth / 2, 1.83)}
    ${rect(s, g.rearX - 0.05, deck - 0.22, g.rearX + 0.02, deck - 0.06, "cad-lamp-red", 1)}
    ${joints.map((x) => line(s, x, deck - depth + 0.04, x, deck - 0.04, "cad-joint-line")).join("")}
    ${pendulums.join("")}
    ${leg}
    ${rect(s, -0.12, fw - 0.12, 0.12, fw, "cad-kingpin")}
  </g>`
}

/** Tipper chassis underside (also the top of the suspension hangers). */
export const tipperAxleFrameM = (r) => Math.min(r.config.deckMm / 1000 - 0.3, r.parts.tractor.fifthWheelMm / 1000 + 0.02)

export function tipperParts(s, r) {
  const g = r.geometry
  const deck = r.config.deckMm / 1000
  const tip = r.parts.model.tipping
  const fill = Math.max(0, r.tipper?.sideHeightM ?? 0)
  const sideH = Math.min(tip.maxSideM + 0.3, Math.max(0.7, fill + 0.15))
  const x1 = g.deckStartX
  const x2 = g.rearX
  const ribs = []
  for (let x = x1 + 0.7; x < x2 - 0.3; x += 0.8) ribs.push(line(s, x, deck + 0.05, x, deck + sideH - 0.08, "cad-rib"))
  const heapTop = Math.min(sideH, fill + 0.25)
  const bulk = fill > 0
    ? poly(s, [[x1 + 0.05, deck + 0.05], [x1 + 0.05, deck + fill], [(x1 + x2) / 2, deck + heapTop], [x2 - 0.05, deck + fill], [x2 - 0.05, deck + 0.05]], "cad-bulk")
    : ""
  const cyl = tip.type === "rear"
    ? [0, 1, 2].map((i) => rect(s, x1 - 0.32 + i * 0.03, deck - 0.1 + (i * sideH) / 3, x1 - 0.12 - i * 0.03, deck + ((i + 1) * sideH) / 3, "cad-cylinder", 2)).join("")
    : [0.3, 0.7].map((p) => { const x = x1 + (x2 - x1) * p; return rect(s, x - 0.09, deck - 0.25, x + 0.09, deck + 0.02, "cad-cylinder", 2) }).join("")
  const fw = r.parts.tractor.fifthWheelMm / 1000
  const chassisBottom = tipperAxleFrameM(r)
  return `<g>
    ${r.parts.model.hasLandingLegs ? landingLeg(s, LANDING_LEG.tipperFromKingpinM, chassisBottom) : ""}
    ${rect(s, g.frontX, chassisBottom, x2, deck, "cad-trailer-shade", 0, grad("gDolly"))}
    ${line(s, g.frontX + 0.05, chassisBottom + 0.035, x2 - 0.05, chassisBottom + 0.035, "cad-flange")}
    ${markers(s, g.frontX + 1.2, x2 - 0.4, (chassisBottom + deck) / 2)}
    ${rearEnd(s, x2, deck, deck - chassisBottom)}
    ${rect(s, -0.12, fw - 0.1, 0.12, fw + 0.02, "cad-kingpin")}
    ${bulk}
    <path d="M ${s.X(x1)} ${s.Y(deck + sideH)} L ${s.X(x1)} ${s.Y(deck + 0.12)} Q ${s.X(x1)} ${s.Y(deck)} ${s.X(x1 + 0.15)} ${s.Y(deck)} L ${s.X(x2 - 0.15)} ${s.Y(deck)} Q ${s.X(x2)} ${s.Y(deck)} ${s.X(x2)} ${s.Y(deck + 0.12)} L ${s.X(x2)} ${s.Y(deck + sideH)}" class="cad-body" />
    ${line(s, x1 - 0.05, deck + sideH, x2 + 0.05, deck + sideH, "cad-toprail")}
    ${ribs.join("")}
    ${tip.type === "rear" ? `<circle cx="${s.X(x2 - 0.1)}" cy="${s.Y(deck - 0.1)}" r="${(0.09 * s.k).toFixed(1)}" class="cad-hinge" />` : line(s, x1, deck + sideH - 0.15, x2, deck + sideH - 0.15, "cad-joint")}
    ${cyl}
  </g>`
}

/** Tracked machine silhouette (lowbed) or industrial block (modular) for the cargo footprint. */
export function machineryCargo(s, r, base) {
  const { cargo } = r.config
  const x1 = cargo.posM - cargo.lengthM / 2
  const x2 = cargo.posM + cargo.lengthM / 2
  const h = cargo.heightM
  const label = `<text x="${s.X(cargo.posM)}" y="${s.Y(base + h * 0.55)}" class="cad-cargo-label" text-anchor="middle">${f1(cargo.weightT)} t</text>`
  if (r.parts.model.family === "modular" || h < 2.2 || cargo.lengthM < 3) {
    const ribs = []
    for (let x = x1 + 0.6; x < x2 - 0.3; x += 0.6) ribs.push(line(s, x, base + 0.15, x, base + h - 0.15, "cad-cargo-rib"))
    return `${rect(s, x1, base, x2, base + h, "cad-cargo", 4)}${ribs.join("")}${label}`
  }
  return excavator(s, x1, x2, base, h, `${f1(cargo.weightT)} t`, r.geometry.deckStartX)
}
