import { evaluate } from "./lib/engine.js"
import { renderCad } from "./lib/render-svg.js"
import { REGIONS, REGION_ORDER } from "./lib/regulations.js"
import { MODELS, MODEL_ORDER, SUSPENSIONS, TRACTORS, BULK_MATERIALS, GOOSENECK, tyresFor } from "./lib/equipment.js"
import { requiredNeckM } from "./lib/checks.js"
import { minLengthForAxles } from "./lib/model.js"
import { DOLLY_LINE_OPTIONS } from "./lib/dolly.js"
import { renderResults } from "./lib/ui-results.js"
import { loadPresets, savePreset, deletePreset } from "./lib/presets.js"

const KALES_MODELS = {
  "lowboy-trailer": {
    title: "KALES Lowboy Semi-Trailer (Gooseneck)",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/machinery-equipment-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/lowboy-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "Drop-deck gooseneck lowboy with folding rear ramps for excavators and construction machinery."
  },
  "removable-gooseneck-lowboy-trailer": {
    title: "KALES Removable Gooseneck Lowboy Trailer (RGN)",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/machinery-equipment-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/removable-gooseneck-lowboy-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "Front-loading hydraulic detachable gooseneck for heavy crawlers that cannot climb a rear ramp."
  },
  "hydraulic-modular-trailer": {
    title: "KALES Hydraulic Modular Trailer (Axle Lines)",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/machinery-equipment-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/hydraulic-modular-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "Hydraulic steering, pendular axle lines for transformers and oversized industrial cargo."
  },
  "car-carrier-trailer": {
    title: "KALES Double-Deck Car Carrier Semi-Trailer",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/machinery-equipment-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/car-carrier-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "Hydraulic double-deck car hauler for 6–8 passenger cars or SUVs."
  },
  "tipper-semi-trailer": {
    title: "KALES U-Type Rear Tipper Semi-Trailer",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/sand-coal-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/tipper-semi-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "U-shape rear dump semi-trailer with front telescopic cylinder for sand, coal and ore."
  },
  "side-tipper-trailer": {
    title: "KALES Side Tipper Semi-Trailer",
    categoryUrl: "https://www.kalestruck.com/product-category/trailers/sand-coal-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    url: "https://www.kalestruck.com/product-category/trailers/side-tipper-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
    desc: "Twin-cylinder lateral side-dumping trailer for fast unloading of coal, aggregate and ore."
  }
}

const CATEGORIES = [
  {
    id: "machinery-equipment-transport",
    label: "Machinery & Equipment",
    models: ["lowboy-trailer", "removable-gooseneck-lowboy-trailer", "hydraulic-modular-trailer", "car-carrier-trailer"],
    url: "https://www.kalestruck.com/product-category/trailers/machinery-equipment-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul"
  },
  {
    id: "sand-coal-transport",
    label: "Sand & Coal Transport",
    models: ["tipper-semi-trailer", "side-tipper-trailer"],
    url: "https://www.kalestruck.com/product-category/trailers/sand-coal-transport/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul"
  }
]

function categoryForModel(modelId) {
  return CATEGORIES.find((c) => c.models.includes(modelId)) ?? CATEGORIES[0]
}

const NUMERIC_FIELDS = ["fifthWheelMm", "lengthM", "neckM", "rearOverhangM", "deckMm", "axles", "spacingM", "cargo.weightT", "volumeM3", "cargo.posM", "cargo.lengthM", "cargo.widthM", "cargo.heightM"]
const SELECT_FIELDS = ["region", "tractor", "suspension", "speedRating", "tyre", "material"]
const UNITS = { fifthWheelMm: "mm", lengthM: "m", neckM: "m", rearOverhangM: "m", deckMm: "mm", axles: "", spacingM: "m", "cargo.weightT": "t", volumeM3: "m³", "cargo.posM": "m", "cargo.lengthM": "m", "cargo.widthM": "m", "cargo.heightM": "m" }

const $ = (id) => document.getElementById(id)
const getPath = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj)
const setPath = (obj, path, value) => {
  const [head, ...rest] = path.split(".")
  return rest.length ? { ...obj, [head]: setPath(obj[head] ?? {}, rest.join("."), value) } : { ...obj, [head]: value }
}

function defaultsFor(modelId, region) {
  const model = MODELS[modelId]
  const suspension = model.suspensions[0]
  return {
    region,
    model: modelId,
    tractor: model.defaultTractor,
    suspension,
    speedRating: null,
    tyre: null,
    axles: model.axles.default,
    spacingM: SUSPENSIONS[suspension].spacing.default,
    lengthM: model.length?.default ?? null,
    rearOverhangM: model.rearOverhang.default,
    deckMm: model.deckMm.default,
    cargo: { ...model.cargo },
    volumeM3: null,
    material: "sand-dry",
    dollyLines: 0,
    neckM: model.hasGooseneck ? GOOSENECK.defaultM : null,
    fifthWheelMm: null, // tractor default
    carPositions: model.defaultPositions ?? null
  }
}

function dollyLabel(n) {
  return n === 0 ? "None — gooseneck on tractor" : `${n} line${n > 1 ? "s" : ""} · ${n * 2} axles (${n * 18} t)`
}

let raw = defaultsFor("lowboy-trailer", "CN")
let lastResult = null

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map(([id, label]) => new Option(label, id, false, id === value)))
  select.value = value ?? options[0]?.[0] ?? ""
}

function buildStaticControls() {
  fillSelect($("region"), REGION_ORDER.map((id) => [id, REGIONS[id].name]), raw.region)
  fillSelect($("tractor"), Object.entries(TRACTORS).map(([id, t]) => [id, t.label]), raw.tractor)
  fillSelect($("material"), BULK_MATERIALS.map((m) => [m.id, `${m.label} (${m.densityT} t/m³)`]), raw.material)
  fillSelect($("dollyLines"), DOLLY_LINE_OPTIONS.map((n) => [String(n), dollyLabel(n)]), String(raw.dollyLines))
  $("categoryGroup").replaceChildren(...CATEGORIES.map((cat) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "cat-tab-btn"
    btn.dataset.category = cat.id
    btn.textContent = `${cat.label} (${cat.models.length})`
    btn.addEventListener("click", () => {
      raw = defaultsFor(cat.models[0], raw.region)
      recompute({ syncAll: true })
    })
    return btn
  }))
  $("modelGroup").replaceChildren(...MODEL_ORDER.map((id) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "chip-btn"
    btn.dataset.model = id
    btn.dataset.category = categoryForModel(id).id
    btn.textContent = MODELS[id].label
    btn.addEventListener("click", () => {
      raw = defaultsFor(id, raw.region)
      recompute({ syncAll: true })
    })
    return btn
  }))
}

/** Reflect the evaluated config back into the controls (selects always, numbers only when empty or forced). */
function syncControls(r, { syncAll }) {
  const { config, parts } = r
  const model = parts.model
  const activeCat = categoryForModel(config.model)
  for (const btn of $("categoryGroup").children) btn.setAttribute("aria-pressed", String(btn.dataset.category === activeCat.id))
  for (const btn of $("modelGroup").children) {
    btn.setAttribute("aria-pressed", String(btn.dataset.model === config.model))
    btn.classList.toggle("is-hidden", btn.dataset.category !== activeCat.id)
  }
  const cta = $("headerPrimaryCta")
  if (cta) {
    cta.href = activeCat.url
    cta.textContent = `${activeCat.label} specs ↗`
  }
  fillSelect($("suspension"), model.suspensions.map((id) => [id, SUSPENSIONS[id].label]), config.suspension)
  fillSelect($("tyre"), tyresFor(config.suspension).map((t) => [t.id, t.label]), config.tyre)
  const speeds = parts.suspension.speedRatings ?? []
  fillSelect($("speedRating"), speeds.map((s) => [s.id, `${s.label} — ${s.ratingT} t/line`]), config.speedRating)
  $("speedField").classList.toggle("is-hidden", speeds.length === 0)
  $("region").value = config.region
  $("tractor").value = config.tractor
  $("material").value = config.material
  $("dollyLines").value = String(config.dollyLines)
  $("dollyField").classList.toggle("is-hidden", !model.allowsDolly)

  const isTipper = model.family === "tipper"
  const isModular = model.family === "modular"
  $("machineryCargo").classList.toggle("is-hidden", isTipper || model.family === "carrier")
  $("materialField").classList.toggle("is-hidden", !isTipper)
  $("overhangField").classList.toggle("is-hidden", isModular)
  $("neckField").classList.toggle("is-hidden", !model.hasGooseneck)
  $("positionsField").classList.toggle("is-hidden", !model.positions)
  if (model.positions) {
    fillSelect($("carPositions"), Object.entries(model.positions).map(([n, p]) => [n, `${n} cars · ${p.lengthM} m`]), String(config.carPositions))
  }
  $("lengthM").readOnly = isModular
  $("axlesLabel").textContent = isModular ? "Axle lines" : "Axles"
  $("deckLabel").firstChild.textContent = isTipper ? "Frame / body floor height " : isModular ? "Platform height " : model.family === "carrier" ? "Lower deck well height " : "Loading well height "

  for (const field of NUMERIC_FIELDS) {
    const input = $(field)
    const value = getPath(config, field)
    if (syncAll || input.value === "" || (isModular && field === "lengthM")) input.value = value ?? ""
    const bounds = r.bounds[field]
    if (bounds) {
      input.min = bounds.min
      input.max = bounds.max
    }
  }
}

function boundsHint(r, field) {
  const b = r.bounds[field]
  const unit = UNITS[field]
  const { model, tyre } = r.parts
  if (field === "lengthM" && model.family === "modular") return `Derived: gooseneck + ${r.config.axles} lines × ${r.config.spacingM} m`
  if (!b) return ""
  const range = `${b.min}–${b.max}${unit ? ` ${unit}` : ""}`
  if (field === "axles" && model.family !== "modular") {
    const more = r.maxAxles < model.axles.max
      ? ` · ${r.maxAxles + 1} need ≥ ${minLengthForAxles(model, r.maxAxles + 1, r.config.rearOverhangM, r.config.spacingM, tyre.diaMm)} m`
      : ""
    return `${range} fit ${r.config.lengthM} m${more}`
  }
  if (field === "fifthWheelMm") return `${range} · ${r.parts.tractor.label} standard ${TRACTORS[r.config.tractor].fifthWheelMm} mm`
  if (field === "neckM") return `${range} · ${r.parts.tractor.label} needs ≥ ${requiredNeckM(r.parts.tractor)} m to swing clear`
  if (field === "deckMm" && model.family === "tipper") return `${range} · min ${r.geometry.minDeckOverAxleMm} mm over tyres`
  if (field === "volumeM3" && r.tipper) return `${range} · body wall ${r.tipper.sideHeightM} m (max ${model.tipping.maxSideM} m)`
  if (field === "deckMm" && model.deckUpToRearDeck) return `${range} · top = rear deck over the axles (flat deck)`
  if (field === "deckMm" && model.family === "carrier") return `${range} · over axles ${r.geometry.rearDeckMm} mm · gooseneck ${r.geometry.neckDeckMm} mm`
  if (field === "deckMm" && model.family === "lowbed") return `${range} · rear deck over axles ${r.geometry.rearDeckMm} mm`
  return range
}

function issueHint(r, field, issue) {
  if (field === "axles" && r.parts.model.family !== "modular" && issue.requested > issue.max) {
    return `Only ${issue.max} axles fit a ${r.config.lengthM} m trailer — calculated with ${issue.used}. ${boundsHint(r, field).split(" · ")[1] ?? ""}`.trim()
  }
  return `Outside ${issue.min}–${issue.max}${UNITS[field] ? ` ${UNITS[field]}` : ""} — calculated with ${issue.used}`
}

function renderHints(r) {
  for (const field of NUMERIC_FIELDS) {
    const hint = $(`hint-${field}`)
    const input = $(field)
    const issue = r.issues.find((i) => i.field === field)
    input.setAttribute("aria-invalid", String(Boolean(issue)))
    hint.classList.toggle("error", Boolean(issue))
    hint.textContent = issue ? issueHint(r, field, issue) : boundsHint(r, field)
  }
  $("tyreHint").textContent = `${r.parts.tyre.diaMm} mm Ø · ${r.tyreAxleCapT} t per ${r.parts.suspension.kind === "multiline" ? "line" : "axle"}`
}

function readForm() {
  let next = raw
  for (const field of SELECT_FIELDS) next = setPath(next, field, $(field).value || null)
  next = setPath(next, "dollyLines", Number($("dollyLines").value) || 0)
  next = setPath(next, "carPositions", Number($("carPositions").value) || null)
  for (const field of NUMERIC_FIELDS) {
    const text = $(field).value.trim()
    next = setPath(next, field, text === "" ? null : Number(text))
  }
  return next
}

function recompute({ syncAll = false } = {}) {
  const r = evaluate(raw)
  lastResult = r
  syncControls(r, { syncAll })
  renderHints(r)
  $("cadStage").innerHTML = renderCad(r)
  renderResults(r, KALES_MODELS)
}

function onFormChange(event) {
  const prevSuspension = raw.suspension
  const prevTractor = raw.tractor
  raw = readForm()
  if (event.target.id === "carPositions") {
    // New position count: take its preset length, axles, overhang, tractor and payload.
    raw = { ...defaultsFor(raw.model, raw.region), carPositions: raw.carPositions, lengthM: null, axles: null, rearOverhangM: null, tractor: null, cargo: {} }
    recompute({ syncAll: true })
    return
  }
  if (event.target.id === "tractor" && raw.tractor !== prevTractor) {
    raw = { ...raw, fifthWheelMm: null } // back to the new tractor's standard height
    $("fifthWheelMm").value = ""
  }
  if (event.target.id === "suspension" && raw.suspension !== prevSuspension) {
    raw = { ...raw, spacingM: SUSPENSIONS[raw.suspension].spacing.default, tyre: null }
    $("spacingM").value = ""
  }
  const mat = BULK_MATERIALS.find((m) => m.id === raw.material)
  if ((event.target.id === "volumeM3" || event.target.id === "material") && MODELS[raw.model]?.family === "tipper" && mat && raw.volumeM3 > 0) {
    raw = { ...raw, cargo: { ...raw.cargo, weightT: Math.round(raw.volumeM3 * mat.densityT * 10) / 10 } }
    $("cargo.weightT").value = raw.cargo.weightT
  }
  if (event.target.id === "cargo.weightT" && MODELS[raw.model]?.family === "tipper" && mat && raw.cargo?.weightT > 0) {
    raw = { ...raw, volumeM3: Math.round((raw.cargo.weightT / mat.densityT) * 10) / 10 }
    $("volumeM3").value = raw.volumeM3
  }
  recompute()
}

async function renderPresets() {
  const list = $("savedPresetsList")
  const presets = await loadPresets()
  if (!globalThis.chrome?.storage?.local) {
    list.replaceChildren(Object.assign(document.createElement("li"), { textContent: "Saving is available when opened as the Chrome extension." }))
    return
  }
  if (!presets.length) {
    list.replaceChildren(Object.assign(document.createElement("li"), { textContent: "No saved projects yet." }))
    return
  }
  list.replaceChildren(...presets.map((p, index) => {
    const li = document.createElement("li")
    const name = document.createElement("span")
    name.textContent = p.name
    const load = Object.assign(document.createElement("button"), { type: "button", className: "btn-link", textContent: "Load" })
    load.addEventListener("click", () => {
      raw = { ...defaultsFor(Object.hasOwn(MODELS, p.config.model) ? p.config.model : "lowboy-trailer", p.config.region ?? raw.region), ...p.config }
      recompute({ syncAll: true })
    })
    const del = Object.assign(document.createElement("button"), { type: "button", className: "btn-link danger", textContent: "Delete" })
    del.addEventListener("click", async () => {
      await deletePreset(index)
      await renderPresets()
    })
    const actions = document.createElement("span")
    actions.append(load, del)
    li.append(name, actions)
    return li
  }))
}

async function onSave() {
  if (!lastResult) return
  const { config, parts } = lastResult
  const name = `${parts.model.label} · ${config.axles} axles · ${config.cargo.weightT} t · ${parts.region.id}`
  try {
    await savePreset(name, config)
    await renderPresets()
  } catch (err) {
    console.error("KALES CAD: failed to save project", err)
    $("btnSavePreset").textContent = "Save failed — retry"
  }
}

function init() {
  buildStaticControls()
  $("configForm").addEventListener("input", onFormChange)
  $("configForm").addEventListener("submit", (e) => e.preventDefault())
  $("btnSavePreset").addEventListener("click", onSave)
  $("btnPrintSpec").addEventListener("click", () => window.print())
  recompute({ syncAll: true })
  renderPresets()
}

init()
