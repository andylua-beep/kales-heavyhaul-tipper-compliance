// Fixed-gooseneck lowboy and removable-gooseneck (RGN) frames.
import { LANDING_LEG } from "./equipment.js"
import { NECK_DEPTH_M, poly, rect, line, dot, bar, ram, grad, rearEnd, markers, landingLeg, couplingM } from "./render-parts.js"

const REAR_BEAM_M = 0.35
const RISE_M = 0.35 // run of the slope from the well up to the rear deck

/** Shared levels and stations of a drop-deck frame. */
function levels(r) {
  const g = r.geometry
  const fw = couplingM(r)
  return {
    g,
    fw,
    top: fw + NECK_DEPTH_M,
    deck: r.config.deckMm / 1000,
    beam: g.wellBeamMm / 1000, // already reduced for road clearance on low wells
    rear: g.rearDeckMm / 1000
  }
}

/** Well + rear deck: beam web details, lashing rings, marker lamps and the rear end. */
function deckDetails(s, { g, deck, beam, rear }) {
  const rings = []
  const stiffeners = []
  for (let x = g.deckStartX + 0.7; x < g.wellEndX - 0.3; x += 1.1) {
    rings.push(dot(s, x, deck - beam / 2, 0.07, "cad-lash"))
    if (x + 0.55 < g.wellEndX - 0.2) stiffeners.push(line(s, x + 0.55, deck - 0.09, x + 0.55, deck - beam + 0.06, "cad-stiffener"))
  }
  return `${line(s, g.deckStartX + 0.3, deck - beam + 0.035, g.wellEndX + 0.1, deck - beam + 0.035, "cad-flange")}
    ${line(s, g.wellEndX + 0.5, rear - REAR_BEAM_M + 0.035, g.rearX - 0.05, rear - REAR_BEAM_M + 0.035, "cad-flange")}
    ${line(s, g.deckStartX + 0.08, deck - 0.05, g.wellEndX - 0.05, deck - 0.05, "cad-deckline")}
    ${line(s, g.wellEndX + RISE_M + 0.05, rear - 0.05, g.rearX - 0.05, rear - 0.05, "cad-deckline")}
    ${stiffeners.join("")}${rings.join("")}
    ${markers(s, g.deckStartX + 0.5, g.wellEndX - 0.3, deck - 0.11)}
    ${markers(s, g.wellEndX + 0.9, g.rearX - 0.4, rear - 0.12, 1.3)}
    ${rearEnd(s, g.rearX, rear, REAR_BEAM_M)}`
}

/** Kingpin plate and pin under the gooseneck front. */
const kingpin = (s, fw) => `${rect(s, -0.5, fw - 0.035, 0.5, fw, "cad-saddle", 1)}${rect(s, -0.06, fw - 0.15, 0.06, fw, "cad-kingpin")}`

/** Ladder ramps folded up over the rear deck (deployed position is drawn as a dashed overlay). */
function stowedRamp(s, r, rear) {
  const ramp = r.parts.model.ramp
  if (ramp?.type !== "rear" || !ramp.stowDeg) return ""
  const a = (ramp.stowDeg * Math.PI) / 180
  const footX = r.geometry.rearX - 0.12
  const tip = [footX - ramp.lengthM * Math.cos(a), rear + ramp.lengthM * Math.sin(a)]
  const rungs = [0.2, 0.4, 0.6, 0.8].map((t) => dot(s, footX + (tip[0] - footX) * t, rear + (tip[1] - rear) * t, 0.035, "cad-rung"))
  return `${bar(s, footX, rear + 0.04, tip[0], tip[1], 0.17, "cad-ramp-stowed")}${rungs.join("")}${dot(s, footX, rear + 0.04, 0.08, "cad-pin")}`
}

function fixedNeckFrame(s, r, L) {
  const { g, fw, top, deck, beam, rear } = L
  const outline = [
    [g.frontX, fw + 0.04], [g.frontX, top], [g.neckEndX - 0.15, top],
    [g.deckStartX, deck], [g.wellEndX, deck], [g.wellEndX + RISE_M, rear], [g.rearX, rear],
    [g.rearX, rear - REAR_BEAM_M], [g.wellEndX + RISE_M + 0.1, rear - REAR_BEAM_M], [g.wellEndX + 0.1, deck - beam],
    [g.deckStartX + 0.1, deck - beam], [g.neckEndX - 0.4, fw], [g.frontX + 0.35, fw]
  ]
  const gusset = [[g.neckEndX - 0.95, fw + 0.05], [g.neckEndX - 0.3, fw + 0.05], [g.deckStartX - 0.1, deck + 0.12]]
  return `${poly(s, outline, "cad-trailer", grad("gTrailer"))}
    ${poly(s, gusset, "cad-gusset")}
    ${line(s, g.frontX + 0.1, top - 0.05, g.neckEndX - 0.2, top - 0.05, "cad-deckline")}
    ${line(s, g.frontX + 0.4, fw + 0.035, g.neckEndX - 0.45, fw + 0.035, "cad-flange")}
    ${rect(s, g.frontX, top, g.frontX + 0.07, top + 0.22, "cad-trailer-shade")}`
}

/**
 * RGN: the gooseneck is a separate unit that hooks onto the front of the deck and is
 * raised / released by a hydraulic ram; a power pack sits on top of the neck.
 */
function removableNeckFrame(s, r, L) {
  const { g, fw, top, deck, beam, rear } = L
  const jointX = g.deckStartX
  const toeH = deck - beam * 0.55
  const neck = [
    [g.frontX, fw + 0.04], [g.frontX, fw + 0.18], [g.frontX + 0.9, top], [g.neckEndX + 0.05, top],
    [jointX - 0.02, deck + 0.12], [jointX - 0.02, toeH], [jointX - 0.3, toeH], [g.neckEndX - 0.45, fw], [g.frontX + 0.35, fw]
  ]
  const deckFrame = [
    [jointX, deck], [g.wellEndX, deck], [g.wellEndX + RISE_M, rear], [g.rearX, rear],
    [g.rearX, rear - REAR_BEAM_M], [g.wellEndX + RISE_M + 0.1, rear - REAR_BEAM_M], [g.wellEndX + 0.1, deck - beam],
    [jointX + 0.3, deck - beam], [jointX, deck - beam + 0.2]
  ]
  const packX = g.neckEndX - 1.15
  return `${poly(s, deckFrame, "cad-trailer", grad("gTrailer"))}
    ${poly(s, neck, "cad-neck", grad("gNeck"))}
    ${line(s, g.frontX + 0.95, top - 0.05, g.neckEndX, top - 0.05, "cad-deckline")}
    ${line(s, g.frontX + 0.4, fw + 0.035, g.neckEndX - 0.5, fw + 0.035, "cad-flange")}
    ${ram(s, [g.neckEndX - 1.25, fw + 0.2], [jointX - 0.16, deck + 0.02], 0.13)}
    ${rect(s, packX, top, packX + 0.7, top + 0.3, "cad-box", 2)}${rect(s, packX + 0.08, top + 0.3, packX + 0.2, top + 0.4, "cad-exhaust")}
    ${line(s, jointX - 0.01, deck + 0.12, jointX - 0.01, deck - beam + 0.2, "cad-joint-gap")}
    ${dot(s, jointX - 0.05, deck - 0.05, 0.06, "cad-pin")}${dot(s, jointX - 0.12, toeH + 0.09, 0.06, "cad-pin")}`
}

export function lowbedFrame(s, r) {
  const L = levels(r)
  const { g, fw, deck, rear } = L
  const isRgn = r.config.model === "removable-gooseneck-lowboy-trailer"
  // On a dolly the legs belong to the semi-trailer (deck/gooseneck junction), even on an RGN.
  const leg = r.parts.model.hasLandingLegs || r.parts.dolly ? landingLeg(s, g.deckStartX + LANDING_LEG.lowbedOffsetM + (isRgn ? 0.25 : 0), deck - 0.02) : ""
  return `<g>
    ${leg}
    ${isRgn ? removableNeckFrame(s, r, L) : fixedNeckFrame(s, r, L)}
    ${deckDetails(s, L)}
    ${kingpin(s, fw)}
    ${stowedRamp(s, r, rear)}
  </g>`
}

/** Frame underside over the axles, for the suspension hangers. */
export const lowbedAxleFrameM = (r) => r.geometry.rearDeckMm / 1000 - REAR_BEAM_M
