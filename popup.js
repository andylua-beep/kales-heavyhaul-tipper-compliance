import { evaluate } from "./lib/engine.js"
import { REGIONS, REGION_ORDER } from "./lib/regulations.js"
import { MODELS, MODEL_ORDER, SUSPENSIONS, tyresFor } from "./lib/equipment.js"
import { DOLLY_LINE_OPTIONS } from "./lib/dolly.js"

const MODEL_URLS = {
  "lowboy-trailer": "https://www.kalestruck.com/product-category/trailers/lowboy-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
  "removable-gooseneck-lowboy-trailer": "https://www.kalestruck.com/product-category/trailers/removable-gooseneck-lowboy-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
  "hydraulic-modular-trailer": "https://www.kalestruck.com/product-category/trailers/hydraulic-modular-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
  "car-carrier-trailer": "https://www.kalestruck.com/product-category/trailers/car-carrier-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
  "tipper-semi-trailer": "https://www.kalestruck.com/product-category/trailers/tipper-semi-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul",
  "side-tipper-trailer": "https://www.kalestruck.com/product-category/trailers/side-tipper-trailer/?utm_source=chrome-extension&utm_medium=referral&utm_campaign=heavyhaul"
}
const PAYLOAD_RANGE = { modular: [10, 300], default: [2, 80] }

const $ = (id) => document.getElementById(id)

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map(([id, label]) => new Option(label, id, false, id === value)))
  select.value = value ?? options[0]?.[0] ?? ""
}

function readRaw() {
  return {
    region: $("quickRegion").value,
    model: $("quickModel").value,
    suspension: $("quickSuspension").value,
    tyre: $("quickTyre").value,
    axles: Number($("quickAxles").value),
    dollyLines: Number($("quickDolly").value) || 0,
    cargo: { weightT: Number($("quickWeight").value) }
  }
}

function applyModelDefaults(modelId) {
  const model = MODELS[modelId]
  const [min, max] = model.family === "modular" ? PAYLOAD_RANGE.modular : PAYLOAD_RANGE.default
  Object.assign($("quickWeight"), { min, max, value: model.cargo.weightT })
  $("quickAxles").value = model.axles.default
  fillSelect($("quickSuspension"), model.suspensions.map((id) => [id, SUSPENSIONS[id].label]), model.suspensions[0])
  $("quickTyre").value = ""
  $("quickDolly").value = "0"
  $("quickDollyField").classList.toggle("is-hidden", !model.allowsDolly)
}

function render(r) {
  const { config, parts, loads } = r
  fillSelect($("quickTyre"), tyresFor(config.suspension).map((t) => [t.id, t.label]), config.tyre)
  const isModular = parts.model.family === "modular"
  const issue = r.issues.find((i) => i.field === "axles")
  $("quickAxles").setAttribute("aria-invalid", String(Boolean(issue)))
  $("quickAxlesLabel").textContent = isModular ? "Axle lines" : "Axles"
  const hint = $("quickAxlesHint")
  hint.classList.toggle("error", Boolean(issue))
  hint.textContent = issue
    ? `Only ${issue.max} fit ${config.lengthM} m — using ${issue.used}`
    : `${r.bounds.axles.min}–${r.bounds.axles.max} fit ${config.lengthM} m`

  $("quickWeightVal").textContent = `${config.cargo.weightT.toFixed(1)} t`
  const gcw = r.checks.find((c) => c.id === "legal-gcw")
  $("qGvw").textContent = `${loads.gcwT} / ${gcw?.limit ?? "—"} t`
  const cap = Math.min(parts.speedRating?.ratingT ?? parts.suspension.ratingT, r.tyreAxleCapT)
  $("qAxleLabel").textContent = `Per ${isModular ? "line" : "axle"} / capacity`
  $("qAxle").textContent = `${loads.perAxleT} / ${cap} t`
  $("qRated").textContent = r.maxPayloadT.legal > 0 ? `${r.maxPayloadT.legal} t` : "Permit only"

  const worst = r.checks.find((c) => c.status === r.verdict.status && c.status !== "ok")
  const status = $("quickStatus")
  status.className = `status-pill st-${r.verdict.status}`
  status.textContent = worst ? `${r.verdict.title}: ${worst.label}${worst.limit !== null ? ` ${worst.value} > ${worst.limit} ${worst.unit}` : ""}` : `${r.verdict.title} — ${parts.region.id}`

  const link = $("quickCategoryLink")
  link.href = MODEL_URLS[config.model]
  link.textContent = `KALES ${parts.model.label} specs ↗`
}

function update() {
  render(evaluate(readRaw()))
}

function init() {
  fillSelect($("quickRegion"), REGION_ORDER.map((id) => [id, REGIONS[id].name]), "CN")
  fillSelect($("quickModel"), MODEL_ORDER.map((id) => [id, MODELS[id].label]), "lowboy-trailer")
  fillSelect($("quickDolly"), DOLLY_LINE_OPTIONS.map((n) => [String(n), n === 0 ? "None" : `${n} line${n > 1 ? "s" : ""} · ${n * 2} axles · ${n * 18} t`]), "0")
  applyModelDefaults("lowboy-trailer")
  $("quickForm").addEventListener("input", (event) => {
    if (event.target.id === "quickModel") applyModelDefaults(event.target.value)
    if (event.target.id === "quickSuspension") $("quickTyre").value = ""
    update()
  })
  $("quickForm").addEventListener("submit", (e) => e.preventDefault())
  $("btnOpenFullTab").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("app.html") }))
  update()
}

init()
