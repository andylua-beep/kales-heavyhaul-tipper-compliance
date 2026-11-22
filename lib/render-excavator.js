// Crawler excavator in transport pose (side view, boom toward the tractor).
// x1/x2 = front/rear of the track footprint, base = deck height, h = transport height (m).
// Self-contained helpers so this module has no import cycle with render-parts.js.

const SLEW_RING_M = 0.12

const pt = (s, [x, h]) => `${s.X(x)},${s.Y(h)}`
const poly = (s, pts, cls) => `<polygon points="${pts.map((p) => pt(s, p)).join(" ")}" class="${cls}" />`
const rect = (s, x1, h1, x2, h2, cls, rxM = 0) =>
  `<rect x="${s.X(Math.min(x1, x2))}" y="${s.Y(Math.max(h1, h2))}" width="${(Math.abs(x2 - x1) * s.k).toFixed(1)}" height="${(Math.abs(h2 - h1) * s.k).toFixed(1)}" rx="${(rxM * s.k).toFixed(1)}" class="${cls}" />`
const circle = (s, [x, h], rM, cls) => `<circle cx="${s.X(x)}" cy="${s.Y(h)}" r="${(rM * s.k).toFixed(1)}" class="${cls}" />`
const stroke = (s, pts, widthM, cls) =>
  `<polyline points="${pts.map((p) => pt(s, p)).join(" ")}" class="${cls}" style="stroke-width:${(widthM * s.k).toFixed(1)}px" />`
const lerp = ([ax, ay], [bx, by], t) => [ax + (bx - ax) * t, ay + (by - ay) * t]

function undercarriage(s, x1, x2, base, trackH) {
  const r = trackH / 2
  const L = x2 - x1
  const rollerCount = Math.max(3, Math.floor((L - 4 * r) / 0.55))
  const rollers = Array.from({ length: rollerCount }, (_, i) => {
    const x = x1 + 2 * r + ((L - 4 * r) * (i + 0.5)) / rollerCount
    return circle(s, [x, base + trackH * 0.27], trackH * 0.15, "excav-roller")
  })
  return `${rect(s, x1, base, x2, base + trackH, "excav-track", r)}
    ${rect(s, x1, base, x2, base + trackH, "excav-shoes", r)}
    ${rect(s, x1 + r * 0.9, base + trackH * 0.42, x2 - r * 0.9, base + trackH * 0.72, "excav-track-frame", 0.05)}
    ${circle(s, [x1 + r, base + r], r * 0.72, "excav-wheel")}${circle(s, [x1 + r, base + r], r * 0.25, "excav-hub")}
    ${circle(s, [x2 - r, base + r], r * 0.76, "excav-wheel")}${circle(s, [x2 - r, base + r], r * 0.3, "excav-hub")}
    ${rollers.join("")}`
}

const BUCKET_REACH_M = 0.6 // bucket extends this far ahead of the arm end

/**
 * Bucket rests on the flat deck ahead of the tracks; if the well has no room in front
 * (gooseneck drop), it is pulled back and rests on the front of the tracks instead.
 */
function frontAttachment(s, x1, L, base, h, houseBottom, trackH, frontLimitX) {
  const armEndX = Math.max(x1 - 0.06 * L, frontLimitX + BUCKET_REACH_M)
  const restH = armEndX + 0.34 > x1 + 0.1 ? base + trackH : base
  const foot = [x1 + 0.3 * L, houseBottom + 0.18 * h]
  const knee = [armEndX + 0.04 * L, base + h]
  const tip = [armEndX - 0.16 * L, base + 0.58 * h]
  const armEnd = [armEndX, restH + 0.42]
  const bucket = [
    [armEndX + 0.12, restH + 0.55], [armEndX - 0.42, restH + 0.5], [armEndX - 0.58, restH + 0.18],
    [armEndX - 0.36, restH + 0.02], [armEndX + 0.26, restH + 0.02], [armEndX + 0.34, restH + 0.22]
  ]
  const boomCylinder = [[x1 + 0.17 * L, houseBottom + 0.04 * h], lerp(foot, knee, 0.5)]
  const armCylinder = [lerp(foot, knee, 0.62).map((v, i) => (i ? v + 0.18 : v)), lerp(knee, tip, 0.35).map((v, i) => (i ? v + 0.12 : v))]
  const bucketCylinder = [lerp(tip, armEnd, 0.18).map((v, i) => (i ? v : v + 0.14)), lerp(tip, armEnd, 0.86).map((v, i) => (i ? v : v + 0.16))]
  return `${stroke(s, [foot, knee, tip], 0.36, "excav-boom")}
    ${stroke(s, [foot, knee, tip], 0.12, "excav-boom-web")}
    ${stroke(s, [tip, armEnd], 0.26, "excav-boom")}
    ${stroke(s, boomCylinder, 0.12, "excav-cylinder")}
    ${stroke(s, armCylinder, 0.1, "excav-cylinder")}
    ${stroke(s, bucketCylinder, 0.09, "excav-cylinder")}
    ${poly(s, bucket, "excav-bucket")}
    ${[foot, knee, tip, armEnd].map((p) => circle(s, p, 0.07, "excav-pin")).join("")}`
}

function upperStructure(s, x1, x2, L, base, h, houseBottom) {
  const houseTop = houseBottom + 0.3 * h
  const cwStart = x2 - 0.2 * L
  const counterweight = `<path d="M ${pt(s, [cwStart, houseBottom + 0.04])} L ${pt(s, [x2 + 0.02 * L, houseBottom + 0.04])} Q ${pt(s, [x2 + 0.06 * L, (houseBottom + houseTop) / 2])} ${pt(s, [x2 + 0.02 * L, houseTop + 0.05])} L ${pt(s, [cwStart, houseTop + 0.05])} Z" class="excav-counterweight" />`
  const cabFront = x1 + 0.12 * L
  const cabRear = x1 + 0.4 * L
  const cabTop = base + 0.9 * h
  const cab = [[cabFront, houseBottom], [cabFront, base + 0.6 * h], [cabFront + 0.05 * L, cabTop], [cabRear, cabTop], [cabRear, houseBottom]]
  const frontGlass = [[cabFront + 0.04, base + 0.62 * h], [cabFront + 0.05 * L + 0.02, cabTop - 0.08], [cabFront + 0.12 * L, cabTop - 0.08], [cabFront + 0.12 * L, base + 0.62 * h]]
  return `${rect(s, x1 + 0.3 * L, houseBottom - SLEW_RING_M, x1 + 0.66 * L, houseBottom, "excav-ring")}
    ${rect(s, x1 + 0.14 * L, houseBottom, cwStart + 0.05, houseTop, "excav-house", 0.06)}
    ${rect(s, x1 + 0.44 * L, houseTop, cwStart, houseTop + 0.13, "excav-hood", 0.04)}
    ${rect(s, cwStart - 0.16, houseTop + 0.1, cwStart - 0.08, houseTop + 0.45, "excav-exhaust")}
    ${counterweight}
    ${poly(s, cab, "excav-cab")}
    ${poly(s, frontGlass, "excav-glass")}
    ${rect(s, cabFront + 0.14 * L, base + 0.62 * h, cabRear - 0.06, cabTop - 0.08, "excav-glass", 0.03)}
    ${rect(s, cabFront + 0.13 * L, houseBottom + 0.06, cabRear - 0.05, base + 0.58 * h, "excav-door", 0.03)}`
}

/** @returns {string} SVG markup; `label` is placed on the house side; `frontLimitX` = where the flat deck starts. */
export function excavator(s, x1, x2, base, h, label, frontLimitX = -Infinity) {
  const L = x2 - x1
  const trackH = Math.min(0.95, h * 0.28)
  const houseBottom = base + trackH + SLEW_RING_M
  return `<g class="excavator">
    ${undercarriage(s, x1, x2, base, trackH)}
    ${frontAttachment(s, x1, L, base, h, houseBottom, trackH, frontLimitX)}
    ${upperStructure(s, x1, x2, L, base, h, houseBottom)}
    <text x="${s.X(x1 + 0.66 * L)}" y="${s.Y(houseBottom + 0.15 * h)}" class="cad-cargo-label" text-anchor="middle">${label}</text>
  </g>`
}
