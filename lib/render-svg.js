// True-scale side elevation: tractor (+ optional dolly) + semi-trailer, with dimension
// chains above, deck heights on the right and the load at every axle group below.
import { KINGPIN_SETBACK_M } from "./equipment.js"
import { STATUS_RANK } from "./engine.js"
import { wheel, runningGear, tractorParts, dollyParts, modularFrame, tipperParts, tipperAxleFrameM, machineryCargo, couplingM } from "./render-parts.js"
import { lowbedFrame, lowbedAxleFrameM } from "./render-lowbed.js"
import { carrierFrame, carrierSideFrame, carrierCars, carrierAxleFrameM } from "./render-carrier.js"

const VIEW_W = 1100
const VIEW_H = 540
const GROUND_Y = 420
const PAD_X = 34
const TOP_RESERVED = 112
const MAX_DRAW_HEIGHT_M = 5.0

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1)
const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2)

function worstOf(checks, ids) {
  return checks.filter((c) => ids.includes(c.id)).reduce((w, c) => (STATUS_RANK[c.status] > STATUS_RANK[w] ? c.status : w), "ok")
}

function layout(r) {
  const t = r.parts.tractor
  const fifthWheelX = r.parts.dolly ? r.parts.dolly.kingpinX : 0
  const xMin = fifthWheelX - (t.frontOverhangM + t.wheelbaseM - t.fifthWheelLeadM) - 0.35
  const rampRun = r.parts.model.ramp?.type === "rear" ? 3.3 : 0.4
  const xMax = r.geometry.rearX + rampRun + 0.6
  const k = Math.min((VIEW_W - 2 * PAD_X) / (xMax - xMin), (GROUND_Y - TOP_RESERVED) / MAX_DRAW_HEIGHT_M)
  const x0 = PAD_X + (VIEW_W - 2 * PAD_X - (xMax - xMin) * k) / 2
  return { fifthWheelX, s: { k, X: (x) => +(x0 + (x - xMin) * k).toFixed(1), Y: (h) => +(GROUND_Y - h * k).toFixed(1) } }
}

function hDim(s, x1, x2, y, text, cls = "") {
  const a = s.X(x1)
  const b = s.X(x2)
  return `<g class="cad-dim ${cls}"><line x1="${a}" y1="${y}" x2="${b}" y2="${y}" marker-start="url(#arr)" marker-end="url(#arr)" />
    <line x1="${a}" y1="${y - 5}" x2="${a}" y2="${y + 5}" /><line x1="${b}" y1="${y - 5}" x2="${b}" y2="${y + 5}" />
    <text x="${(a + b) / 2}" y="${y - 5}" text-anchor="middle">${esc(text)}</text></g>`
}

function extension(s, x, fromH, toY) {
  return `<line x1="${s.X(x)}" y1="${s.Y(fromH) - 4}" x2="${s.X(x)}" y2="${toY + 6}" class="cad-ext" />`
}

/** Height callout: short vertical dimension from ground to h at x, text to the side. */
function vDim(s, x, h, text, side = 1) {
  const X = s.X(x)
  return `<g class="cad-dim"><line x1="${X}" y1="${GROUND_Y}" x2="${X}" y2="${s.Y(h)}" marker-start="url(#arr)" marker-end="url(#arr)" />
    <text x="${X + side * 6}" y="${(GROUND_Y + s.Y(h)) / 2 + 4}" text-anchor="${side > 0 ? "start" : "end"}">${esc(text)}</text></g>`
}

function topDimensions(s, r) {
  const g = r.geometry
  const fam = r.parts.model.family
  const y1 = 62
  const y2 = 90
  const topH = Math.max(couplingM(r) + 0.45, g.rearDeckMm / 1000)
  const perDeck = (r.config.carPositions ?? 0) / 2
  const segs = fam === "carrier"
    ? [[g.frontX, g.rearX, `${perDeck} lower + ${perDeck} upper positions`]]
    : fam === "tipper"
    ? [[g.frontX, g.deckStartX, ""], [g.deckStartX, g.rearX, `body ${f1(g.rearX - g.deckStartX)} m`]]
    : fam === "modular"
      ? [[g.frontX, g.neckEndX, `gooseneck ${f1(r.parts.model.neckM)} m`], [g.neckEndX, g.rearX, `${r.config.axles} lines × ${r.config.spacingM} m`]]
      : [[g.frontX, g.neckEndX, `gooseneck ${f1(r.parts.model.neckM)} m`], [g.neckEndX, g.wellEndX, `well ${f1(g.wellEndX - g.neckEndX)} m`], [g.wellEndX, g.rearX, `rear deck ${f1(g.rearX - g.wellEndX)} m`]]
  const xs = [...new Set(segs.flatMap(([a, b]) => [a, b]))]
  return `${hDim(s, g.frontX, g.rearX, y1, `trailer ${f2(r.config.lengthM)} m`, "strong")}
    ${segs.filter(([, , t]) => t).map(([a, b, t]) => hDim(s, a, b, y2, t)).join("")}
    ${xs.map((x) => extension(s, x, topH, y1)).join("")}`
}

function heightCallouts(s, r) {
  const g = r.geometry
  const fam = r.parts.model.family
  const out = []
  if (fam === "lowbed" || fam === "carrier") {
    out.push(vDim(s, (g.deckStartX + g.wellEndX) / 2, r.config.deckMm / 1000, `${r.config.deckMm} mm`, 1))
    out.push(vDim(s, g.rearX + 0.25, g.rearDeckMm / 1000, `${g.rearDeckMm} mm`))
  } else {
    out.push(vDim(s, g.rearX + 0.25, r.config.deckMm / 1000, `${r.config.deckMm} mm`))
  }
  return out.join("")
}

function loadLabels(s, r, fifthWheelX) {
  const t = r.parts.tractor
  const steerX = fifthWheelX - (t.wheelbaseM - t.fifthWheelLeadM)
  const driveX = fifthWheelX + t.fifthWheelLeadM
  const L = r.loads
  const items = [
    [steerX, "Steer", `${f1(L.steerT)} t`, worstOf(r.checks, ["tractor-steer", "legal-steer"])],
    [driveX, "Drive", `${f1(L.driveT)} t`, worstOf(r.checks, ["tractor-drive", "legal-drive", "traction", "legal-drive-share"])],
    [r.geometry.groupX, `Trailer ${r.config.axles} × ${f1(L.perAxleT)} t`, `${f1(L.groupT)} t`, worstOf(r.checks, ["axle-rating", "tyre-rating", "legal-group"])]
  ]
  if (r.parts.dolly) {
    items.splice(2, 0, [r.parts.dolly.groupX, `Dolly ${r.parts.dolly.lines} × ${f1(L.dollyPerLineT)} t`, `${f1(L.dollyGroupT)} t`, worstOf(r.checks, ["dolly-rating", "dolly-tyre", "legal-dolly"])])
  }
  return items.map(([x, name, val, st]) => `<text x="${s.X(x)}" y="${GROUND_Y + 18}" class="cad-load-name" text-anchor="middle">${esc(name)}</text>
    <text x="${s.X(x)}" y="${GROUND_Y + 34}" class="cad-load st-${st}" text-anchor="middle">${esc(val)}</text>`).join("")
}

function kingpinMarks(s, r) {
  if (r.parts.model.family === "carrier") return "" // the decks are full of cars; the load row shows it
  const fw = couplingM(r)
  const tfw = r.parts.tractor.fifthWheelMm / 1000
  const topAtKingpin = r.tipper ? r.config.deckMm / 1000 + Math.max(0.7, r.tipper.sideHeightM + 0.15) : fw + 0.42
  const kp = `<text x="${s.X(0)}" y="${s.Y(topAtKingpin) - 8}" class="cad-small" text-anchor="middle">KP ${f1(r.loads.kingpinT)} t</text>`
  const dollyKp = r.parts.dolly
    ? `<text x="${s.X(r.parts.dolly.kingpinX)}" y="${s.Y(tfw + 0.38) - 8}" class="cad-small" text-anchor="middle">5th wheel ${f1(r.loads.tractorKingpinT)} t</text>`
    : ""
  return kp + dollyKp
}

function trailerRunningGear(s, r) {
  const g = r.geometry
  const st = worstOf(r.checks, ["axle-rating", "tyre-rating", "legal-group", "axle-fit"])
  const dia = g.tyreR * 2
  const xs = Array.from({ length: r.config.axles }, (_, i) => g.firstX + i * r.config.spacingM)
  const fam = r.parts.model.family
  const frameBottom = fam === "tipper" ? tipperAxleFrameM(r) : fam === "carrier" ? carrierAxleFrameM(r) : fam === "lowbed" ? lowbedAxleFrameM(r) : 0
  return runningGear(s, xs, g.tyreR, frameBottom, r.parts.suspension.kind) + xs.map((x) => wheel(s, x, dia, st)).join("")
}

function cargoLayer(s, r) {
  const fam = r.parts.model.family
  if (fam === "tipper") return ""
  if (fam === "carrier") return carrierCars(s, r) + carrierSideFrame(s, r)
  const g = r.geometry
  const end = r.config.cargo.posM + r.config.cargo.lengthM / 2
  const base = fam === "lowbed" && end > g.wellEndX ? g.rearDeckMm / 1000 : r.config.deckMm / 1000
  return machineryCargo(s, r, base)
}

function overlays(s, r) {
  const g = r.geometry
  const fw = r.parts.tractor.fifthWheelMm / 1000
  const rawMaxH = r.parts.region.maxHeight
  const limit = r.checks.find((c) => c.id === "legal-height")?.limit ?? (typeof rawMaxH === "function" ? rawMaxH({ isCarrier: r.parts.model.family === "carrier", isContainer: false }) : rawMaxH)
  const st = worstOf(r.checks, ["legal-height"])
  const heightLine = limit
    ? `<line x1="${PAD_X}" y1="${s.Y(limit)}" x2="${VIEW_W - PAD_X}" y2="${s.Y(limit)}" class="cad-limit st-${st}" />
       <text x="${VIEW_W - PAD_X}" y="${s.Y(limit) - 5}" class="cad-small st-${st}" text-anchor="end">Legal height ${limit} m · ${esc(r.parts.region.id)}</text>`
    : ""
  const ramp = r.parts.model.ramp?.type === "rear"
    ? (() => {
      const h = g.rearDeckMm / 1000
      const run = Math.sqrt(Math.max(0, r.parts.model.ramp.lengthM ** 2 - h ** 2))
      return `<line x1="${s.X(g.rearX)}" y1="${s.Y(h)}" x2="${s.X(g.rearX + run)}" y2="${GROUND_Y}" class="cad-ramp" />`
    })()
    : ""
  const cgTop = Math.max(fw + 1, (r.overallHeightM ?? 3) + 0.25)
  return `${heightLine}${ramp}
    <line x1="${s.X(r.cgX)}" y1="${s.Y(cgTop)}" x2="${s.X(r.cgX)}" y2="${GROUND_Y}" class="cad-cg" />
    <circle cx="${s.X(r.cgX)}" cy="${s.Y(cgTop)}" r="5" class="cad-cg-dot" />
    <text x="${s.X(r.cgX) + 8}" y="${s.Y(cgTop) + 4}" class="cad-small cg">CG ${f1(r.cgX)} m</text>`
}

function bottomDimensions(s, r, fifthWheelX) {
  const g = r.geometry
  const y = GROUND_Y + 62
  const parts = [hDim(s, 0, g.groupX, y, `kingpin → axle centre ${f2(g.groupX)} m`)]
  if (r.config.axles > 1) parts.push(hDim(s, g.firstX, g.lastX, y + 26, `${f2(g.groupSpanM)} m`))
  if (r.parts.dolly) parts.push(hDim(s, fifthWheelX, 0, y + 26, `dolly ${f2(r.parts.dolly.offsetM)} m`))
  return parts.join("")
}

/** Vertical 3-stop gradient: lit top edge, body colour, shaded underside. */
const gradient = (id, [top, mid, bottom]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}" /><stop offset="0.45" stop-color="${mid}" /><stop offset="1" stop-color="${bottom}" /></linearGradient>`

export function renderCad(r) {
  const { s, fifthWheelX } = layout(r)
  const fam = r.parts.model.family
  const frame = fam === "tipper" ? tipperParts(s, r) : fam === "modular" ? modularFrame(s, r) : fam === "carrier" ? carrierFrame(s, r) : lowbedFrame(s, r)
  const statuses = {
    steer: worstOf(r.checks, ["tractor-steer", "legal-steer"]),
    drive: worstOf(r.checks, ["tractor-drive", "legal-drive"])
  }
  const dollyText = r.parts.dolly ? ` + ${r.parts.dolly.lines}-LINE DOLLY` : ""
  const title = `KALES ${r.parts.model.label.toUpperCase()} · ${r.config.axles} ${fam === "modular" ? "AXLE LINES" : "AXLES"}${dollyText} · ${r.parts.suspension.kind.toUpperCase()}`
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}">
    <defs>
      <pattern id="grid" width="${s.k.toFixed(2)}" height="${s.k.toFixed(2)}" patternUnits="userSpaceOnUse" x="${s.X(0)}" y="${GROUND_Y}">
        <path d="M ${s.k.toFixed(2)} 0 L 0 0 0 ${s.k.toFixed(2)}" class="cad-grid" />
      </pattern>
      ${gradient("gTrailer", ["#fbd070", "#f2ad27", "#d28d10"])}
      ${gradient("gNeck", ["#eab245", "#d2931a", "#a87008"])}
      ${gradient("gDolly", ["#e0a738", "#c98a12", "#a06a06"])}
      ${gradient("gCab", ["#47606d", "#334651", "#25343d"])}
      <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" class="cad-arrow" /></marker>
    </defs>
    <rect width="${VIEW_W}" height="${VIEW_H}" class="cad-bg" />
    <rect x="0" y="${TOP_RESERVED - 6}" width="${VIEW_W}" height="${GROUND_Y - TOP_RESERVED + 6}" fill="url(#grid)" />
    <text x="${PAD_X}" y="24" class="cad-title">${esc(title)}</text>
    <text x="${PAD_X}" y="40" class="cad-small">${esc(r.parts.region.name)} · grid 1 m · to scale · kingpin setback ${KINGPIN_SETBACK_M} m</text>
    ${topDimensions(s, r)}
    <line x1="0" y1="${GROUND_Y}" x2="${VIEW_W}" y2="${GROUND_Y}" class="cad-ground" />
    ${tractorParts(s, r, fifthWheelX, statuses)}
    ${dollyParts(s, r, worstOf(r.checks, ["dolly-rating", "dolly-tyre", "legal-dolly"]))}
    ${frame}
    ${trailerRunningGear(s, r)}
    ${cargoLayer(s, r)}
    ${heightCallouts(s, r)}
    ${overlays(s, r)}
    ${kingpinMarks(s, r)}
    ${loadLabels(s, r, fifthWheelX)}
    ${bottomDimensions(s, r, fifthWheelX)}
  </svg>`
}

