// Jeep dolly (狼狈式牵引座) between the tractor and the trailer gooseneck.
// Coordinates are trailer coordinates: x = 0 is the trailer kingpin, which sits on the
// dolly's own fifth wheel at the rear of the dolly. The dolly's long front gooseneck
// couples to the tractor fifth wheel at `kingpinX` (< 0).
import { DOLLY, TYRES, KINGPIN_SETBACK_M, TRACTOR_TYRE_DIA_M, TRACTOR_BOGIE_HALF_SPACING_M, GOOSENECK } from "./equipment.js"

const round = (v, d = 2) => +v.toFixed(d)
const ceil20 = (v) => Math.ceil(v * 20 - 1e-9) / 20

/** Rear-most permissible bogie centre (trailer coords) whose last tyre still clears the trailer's neck drop. */
function maxBogieCentreX(lines, tyreR, neckM) {
  const dropStartX = neckM - KINGPIN_SETBACK_M - GOOSENECK.dropLeadM
  const halfSpan = ((lines - 1) * DOLLY.lineSpacingM) / 2
  return Math.max(0.3, dropStartX - DOLLY.neckDropClearanceM - tyreR - halfSpan)
}

/**
 * @param {number} lines 1–3 steerable axle lines (each line = 2 axles / 8 tyres, 18 t)
 * @param {object} tractor the tractor the dolly couples to
 * @param {number} neckM trailer gooseneck length (3.6–3.8 m)
 */
export function buildDolly(lines, tractor, neckM) {
  if (!lines) return null
  const s = DOLLY.lineSpacingM
  const tyre = TYRES.find((t) => t.id === DOLLY.tyreId)
  const tyreR = tyre.diaMm / 2000
  const halfSpan = ((lines - 1) * s) / 2
  const maxBogieX = maxBogieCentreX(lines, tyreR, neckM)

  // Steerable dolly axles track closely behind the tractor; lengthen the front gooseneck enough
  // to clear the tractor's rear chassis & trailer nose swing, then place the bogie as far forward
  // as tractor clearance and static load sharing allow so the rear bed stays compact.
  const bogieOffset = tractor.driveAxles > 1 ? TRACTOR_BOGIE_HALF_SPACING_M : 0
  const rearDriveFromKp = tractor.fifthWheelLeadM + bogieOffset + TRACTOR_TYRE_DIA_M / 2
  const tractorRearFromKp = tractor.fifthWheelLeadM + bogieOffset + 0.75
  const minOffsetByNeck = ceil20(Math.max(DOLLY.minGooseneckOffsetM, tractorRearFromKp + 0.45 + KINGPIN_SETBACK_M))

  const minBogieFromTractor = (offsetM) => -offsetM + rearDriveFromKp + DOLLY.tractorTyreClearanceM + tyreR + halfSpan
  const minBogieFromShare = (offsetM) => (offsetM * (1 - DOLLY.maxBogieShare)) / DOLLY.maxBogieShare
  const desiredBogieX = (offsetM) => ceil20(Math.max(0.3, minBogieFromTractor(offsetM), minBogieFromShare(offsetM)))

  const minOffsetForBogieCap = ceil20(rearDriveFromKp + DOLLY.tractorTyreClearanceM + tyreR + halfSpan - maxBogieX)
  const offsetM = Math.max(minOffsetByNeck, minOffsetForBogieCap)
  const bogieX = Math.min(maxBogieX, desiredBogieX(offsetM))
  const kingpinX = -offsetM
  const groupFromKingpin = bogieX - kingpinX
  const lineXs = Array.from({ length: lines }, (_, i) => bogieX - halfSpan + i * s)
  const tareT = round(DOLLY.baseTareT + DOLLY.tarePerLineT * lines)
  const capacityT = round(lines * DOLLY.lineRatingT + tractor.fifthWheelRatingT - tareT, 1)
  return {
    lines,
    axles: lines * DOLLY.axlesPerLine,
    spacingM: s,
    kingpinX,
    groupX: bogieX,
    lineXs,
    frontX: kingpinX - DOLLY.frontOverhangM,
    rearX: lineXs[lines - 1] + DOLLY.rearOverhangM,
    offsetM: -kingpinX,
    lengthM: round(groupFromKingpin),
    fifthWheelM: DOLLY.fifthWheelMm / 1000,
    tareT,
    cgX: kingpinX + groupFromKingpin * DOLLY.tareCgFrac,
    ratingPerLineT: DOLLY.lineRatingT,
    capacityT,
    tyre,
    tyreCapPerLineT: round(tyre.dualT * DOLLY.tyresPerLine)
  }
}

/** Splits the trailer kingpin load between the dolly lines and the tractor fifth wheel. */
export function solveDolly(dolly, trailerKingpinT) {
  const arm = (x) => x - dolly.kingpinX
  const groupT = (trailerKingpinT * arm(0) + dolly.tareT * arm(dolly.cgX)) / arm(dolly.groupX)
  return {
    dollyGroupT: round(groupT),
    dollyPerLineT: round(groupT / dolly.lines),
    tractorKingpinT: round(trailerKingpinT + dolly.tareT - groupT)
  }
}

export const DOLLY_LINE_OPTIONS = [0, 1, 2, 3]
