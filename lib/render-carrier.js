// Double-deck car carrier (KALES 17.1 m type): gooseneck lower deck over the fifth wheel that
// slopes down to a low well and rises again to the deck over the axles (tyres in wheel arches),
// hydraulic upper deck, side posts and cars. Half the positions sit on each deck.
import { CAR_CARRIER } from "./equipment.js"
import { carLayout, deckHeightAt } from "./carrier.js"
import { poly, rect, line, dot, ram, grad, rearEnd, markers, landingLeg } from "./render-parts.js"

const POST_W_M = 0.09
const REAR_BEAM_M = 0.16 // frame depth over the axles (the tyres run up into wheel arches)
const NECK_TAIL_M = 0.25 // flat gooseneck underside ends this far ahead of the slope
const LEG_BEHIND_NECK_M = 0.9 // landing legs under the gooseneck slope
const ARCH_GAP_M = 0.07
const CAR_TINTS = ["cad-car-a", "cad-car-b", "cad-car-c"]
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1)

function levels(r) {
  const g = r.geometry
  const layout = carLayout(r.config, g)
  const deck = r.config.deckMm / 1000
  return {
    g, layout, deck,
    fw: r.config.fifthWheelMm / 1000,
    neck: g.neckDeckMm / 1000,
    rear: g.rearDeckMm / 1000,
    beamBottom: deck - g.wellBeamMm / 1000,
    at: (x) => deckHeightAt(layout.profile, x)
  }
}

/** Gooseneck underside: flat on the fifth wheel, then down to the well beam bottom. */
function neckUnderside({ g, fw, beamBottom }, x) {
  const x0 = g.neckEndX - NECK_TAIL_M
  const x1 = g.deckStartX + 0.15
  if (x <= x0) return fw
  return fw + ((beamBottom - fw) * Math.min(1, (x - x0) / (x1 - x0)))
}

/** Wheel arch rising through the deck over a tyre (nothing when the tyre stays under the deck). */
function wheelArch(s, x, tyreR, deckH) {
  const R = tyreR + ARCH_GAP_M
  const dh = deckH - tyreR
  if (R <= dh + 0.01) return ""
  const dx = Math.sqrt(R * R - dh * dh)
  const r = (R * s.k).toFixed(1)
  return `<path d="M ${s.X(x - dx)} ${s.Y(deckH)} A ${r} ${r} 0 0 1 ${s.X(x + dx)} ${s.Y(deckH)} Z" class="cad-trailer-shade" />`
}

/** Chassis and the two decks (drawn behind the cars). */
export function carrierFrame(s, r) {
  const L = levels(r)
  const { g, fw, deck, neck, rear, beamBottom, layout } = L
  const upper = layout.upperDeckH
  const upperFront = g.frontX - CAR_CARRIER.upperDeckOverhangM
  const upperTop = upper + CAR_CARRIER.upperDeckThicknessM
  const archX = g.frontX + 2.1
  const archRise = 0.07
  const upperPoly = [
    [upperFront, upper], [archX, upper + archRise], [g.deckStartX + 0.5, upper], [g.rearX, upper],
    [g.rearX, upperTop], [g.deckStartX + 0.5, upperTop], [archX, upperTop + archRise], [upperFront, upperTop]
  ]
  const axleXs = Array.from({ length: r.config.axles }, (_, i) => g.firstX + i * r.config.spacingM)
  const overAxleBottom = rear - REAR_BEAM_M
  const chassis = [
    ...layout.profile,
    [g.rearX, overAxleBottom], [g.rearDeckStartX + 0.1, overAxleBottom], [g.wellEndX + 0.1, beamBottom],
    [g.deckStartX + 0.15, beamBottom], [g.neckEndX - NECK_TAIL_M, fw], [g.frontX + 0.35, fw], [g.frontX, fw + 0.04]
  ]
  const holes = []
  for (let x = g.deckStartX + 0.5; x < g.wellEndX - 0.3; x += 0.8) {
    if (deck - beamBottom > 0.22) holes.push(rect(s, x - 0.22, beamBottom + 0.07, x + 0.22, deck - 0.08, "cad-truss-hole", 5))
  }
  const deckLine = layout.profile.slice(1).map(([x, h], i) => {
    const [x0, h0] = layout.profile[i]
    return line(s, x0 + 0.08, h0 - 0.04, x - 0.08, h - 0.04, "cad-perf")
  })
  const legX = g.neckEndX + LEG_BEHIND_NECK_M
  return `<g>
    ${landingLeg(s, legX, neckUnderside(L, legX))}
    ${axleXs.map((x) => wheelArch(s, x, g.tyreR, rear)).join("")}
    ${poly(s, chassis, "cad-trailer", grad("gTrailer"))}
    ${holes.join("")}
    ${deckLine.join("")}
    ${markers(s, g.frontX + 0.5, g.neckEndX - 0.2, (neck + fw) / 2, 1.2)}
    ${markers(s, g.rearDeckStartX + 0.3, g.rearX - 0.4, rear - REAR_BEAM_M / 2, 1.3)}
    ${rearEnd(s, g.rearX, rear, REAR_BEAM_M)}
    ${rect(s, -0.5, fw - 0.035, 0.5, fw, "cad-saddle", 1)}${rect(s, -0.06, fw - 0.15, 0.06, fw, "cad-kingpin")}
    ${poly(s, upperPoly, "cad-trailer", grad("gTrailer"))}
    ${line(s, upperFront + 0.1, upperTop - 0.03, archX, upperTop + archRise - 0.03, "cad-perf")}
    ${line(s, archX, upperTop + archRise - 0.03, g.deckStartX + 0.5, upperTop - 0.03, "cad-perf")}
    ${line(s, g.deckStartX + 0.5, upperTop - 0.03, g.rearX - 0.1, upperTop - 0.03, "cad-perf")}
    ${rect(s, upperFront, upperTop, upperFront + 0.06, upperTop + 0.2, "cad-trailer-shade")}
    ${rect(s, g.rearX - 0.06, upperTop, g.rearX, upperTop + 0.14, "cad-trailer-shade")}
  </g>`
}

/**
 * Side frame in front of the cars: end posts plus a hydraulic lift column in every gap
 * between two lower cars, so no column crosses a car. Columns stand on the stepped lower deck.
 */
export function carrierSideFrame(s, r) {
  const { g, layout, at } = levels(r)
  const upper = layout.upperDeckH
  const gaps = layout.lower.slice(1).map((c, i) => (layout.lower[i].x + layout.lower[i].lengthM + c.x) / 2)
  return `<g>
    ${[g.frontX + 0.02, g.rearX - 0.11].map((x) => rect(s, x, at(x + POST_W_M / 2), x + POST_W_M, upper, "cad-post", 1)).join("")}
    ${gaps.map((x) => ram(s, [x, at(x) + 0.03], [x, upper - 0.02], 0.09)).join("")}
  </g>`
}

/**
 * Passenger car, nose toward the tractor. `x` = front bumper, `baseH` = deck under the front
 * wheel, `tilt` = deck slope to the rear wheel (radians, + = rear higher).
 */
function car(s, { x, baseH, lengthM, tilt = 0 }, tint) {
  const k = lengthM / CAR_CARRIER.carLengthM // shorter positions carry shorter cars
  const kh = CAR_CARRIER.carHeightM / 1.45
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const fx = x + 0.85 * k // front wheel contact: the pivot of the tilt
  const at = (dx, dh) => {
    const u = (dx - 0.85) * k
    const v = dh * kh
    return [fx + u * cos - v * sin, baseH + u * sin + v * cos]
  }
  const P = (dx, dh) => { const [px, ph] = at(dx, dh); return `${s.X(px)} ${s.Y(ph)}` }
  const box = (dx1, dh1, dx2, dh2, cls) => poly(s, [at(dx1, dh1), at(dx2, dh1), at(dx2, dh2), at(dx1, dh2)], cls)
  const arch = (0.37 * s.k * k).toFixed(1)
  const body = `M ${P(0.03, 0.3)} L ${P(0, 0.56)} Q ${P(0.12, 0.76)} ${P(0.95, 0.82)} L ${P(1.72, 1.36)}
    Q ${P(2.4, 1.48)} ${P(3.05, 1.38)} L ${P(3.78, 0.98)} L ${P(4.3, 0.92)} Q ${P(4.4, 0.86)} ${P(4.38, 0.34)}
    L ${P(3.92, 0.3)} A ${arch} ${arch} 0 0 0 ${P(3.18, 0.3)} L ${P(1.22, 0.3)} A ${arch} ${arch} 0 0 0 ${P(0.48, 0.3)} Z`
  const wheel = (dx) => {
    const [cx, ch] = at(dx, 0.31)
    return `${dot(s, cx, ch, 0.31 * k, "cad-tyre")}${dot(s, cx, ch, 0.19 * k, "cad-rim")}${dot(s, cx, ch, 0.06, "cad-hub")}`
  }
  return `<g>
    <path d="${body}" class="cad-car ${tint}" />
    ${poly(s, [at(1.12, 0.88), at(1.78, 1.3), at(2.38, 1.36), at(2.38, 0.88)], "cad-car-glass")}
    ${poly(s, [at(2.48, 0.88), at(2.48, 1.36), at(3.0, 1.31), at(3.6, 0.98), at(3.6, 0.88)], "cad-car-glass")}
    ${line(s, ...at(0.95, 0.8), ...at(3.9, 0.84), "cad-car-line")}
    ${box(0.02, 0.58, 0.2, 0.68, "cad-headlamp")}
    ${box(4.24, 0.66, 4.38, 0.8, "cad-lamp-red")}
    ${wheel(0.85)}${wheel(3.55)}
  </g>`
}

/** Cars on both decks plus the load label. */
export function carrierCars(s, r) {
  const { g, layout } = levels(r)
  const cars = [...layout.lower, ...layout.upper].map((c, i) => car(s, c, CAR_TINTS[i % CAR_TINTS.length]))
  const labelH = layout.upperDeckH + CAR_CARRIER.upperDeckThicknessM + CAR_CARRIER.carHeightM + 0.22
  return `${cars.join("")}
    <text x="${s.X(g.frontX)}" y="${s.Y(labelH)}" class="cad-cargo-label" text-anchor="start">${layout.count} cars · ${f1(r.config.cargo.weightT)} t</text>`
}

/** Frame underside over the axles, for the suspension hangers. */
export const carrierAxleFrameM = (r) => r.geometry.rearDeckMm / 1000 - REAR_BEAM_M
