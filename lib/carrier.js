// Double-deck car carrier loading layout, shared by the engine (payload CG, plausibility
// check) and the drawing. Half the car positions sit on each full-length deck. The lower deck
// follows the gooseneck / well / over-axle profile, so lower cars tilt where they straddle a slope.
import { CAR_CARRIER } from "./equipment.js"

const CAR_GAP_M = 0.1 // cars are packed bumper to bumper
const DECK_END_MARGIN_M = 0.05
// Wheel stations of a car, as fractions of its length (front wheel / rear wheel contact).
export const CAR_WHEEL_FRAC = [0.85 / 4.4, 3.55 / 4.4]

/** Lower-deck surface stations [x from kingpin, height m], front to rear. */
export function lowerDeckProfile(config, geo) {
  const neck = geo.neckDeckMm / 1000
  const well = config.deckMm / 1000
  const rear = geo.rearDeckMm / 1000
  return [
    [geo.frontX, neck], [geo.neckEndX, neck], [geo.deckStartX, well],
    [geo.wellEndX, well], [geo.rearDeckStartX, rear], [geo.rearX, rear]
  ]
}

/** Deck surface height at `x` (linear between stations, clamped at the ends). */
export function deckHeightAt(profile, x) {
  if (x <= profile[0][0]) return profile[0][1]
  for (let i = 1; i < profile.length; i++) {
    const [x0, h0] = profile[i - 1]
    const [x1, h1] = profile[i]
    if (x <= x1) return x1 - x0 < 1e-9 ? h1 : h0 + ((h1 - h0) * (x - x0)) / (x1 - x0)
  }
  return profile[profile.length - 1][1]
}

/** Evenly pitched positions; `lengthM` is the car length that fits one position. */
function deckRow(count, fromX, toX, heightAt) {
  const pitch = (toX - fromX) / count
  const lengthM = Math.min(CAR_CARRIER.carLengthM, pitch - CAR_GAP_M)
  const cars = Array.from({ length: count }, (_, i) => {
    const x = fromX + i * pitch + (pitch - lengthM) / 2
    const [fx, rx] = CAR_WHEEL_FRAC.map((f) => x + f * lengthM)
    const frontH = heightAt(fx)
    const rearH = heightAt(rx)
    // `baseH` = deck under the front wheel; `tilt` = slope to the rear wheel (+ = rear higher).
    return { x, baseH: frontH, lengthM, tilt: Math.atan2(rearH - frontH, rx - fx) }
  })
  return { cars, pitch }
}

export function carLayout(config, geo) {
  const perDeck = Math.max(1, Math.round((config.carPositions ?? 6) / 2))
  const profile = lowerDeckProfile(config, geo)
  const upperDeckH = geo.neckDeckMm / 1000 + CAR_CARRIER.upperDeckGapM
  const upperBase = upperDeckH + CAR_CARRIER.upperDeckThicknessM
  const lowerRow = deckRow(perDeck, geo.frontX + DECK_END_MARGIN_M, geo.rearX - DECK_END_MARGIN_M, (x) => deckHeightAt(profile, x))
  const upperRow = deckRow(perDeck, geo.frontX - CAR_CARRIER.upperDeckOverhangM + DECK_END_MARGIN_M, geo.rearX - DECK_END_MARGIN_M, () => upperBase)
  const cars = [...lowerRow.cars, ...upperRow.cars]
  const cgX = cars.reduce((sum, c) => sum + c.x + c.lengthM / 2, 0) / cars.length
  return {
    upperDeckH,
    profile,
    lower: lowerRow.cars,
    upper: upperRow.cars,
    count: cars.length,
    cgX,
    // Longest car that fits every position (the lower deck is the shorter one).
    positionLengthM: Math.floor((Math.min(lowerRow.pitch, upperRow.pitch) - CAR_GAP_M) * 100 + 1e-9) / 100
  }
}
