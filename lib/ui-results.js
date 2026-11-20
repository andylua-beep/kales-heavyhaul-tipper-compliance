// DOM rendering of evaluation results (verdict, KPIs, checks, regulation card).
// Everything goes through textContent — no user data reaches innerHTML.
import { round } from "./model.js"
import { BASIS_LABELS } from "./regulations.js"

const GROUP_TITLES = {
  legal: (r) => `Statutory limits — ${r.parts.region.name}`,
  mechanical: () => "Equipment ratings",
  geometry: () => "Geometry & fit"
}
const STATUS_LABEL = { ok: "OK", info: "Info", warn: "Review", permit: "Permit", fail: "Fail" }

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value
    else if (key === "text") node.textContent = value
    else node.setAttribute(key, value)
  }
  for (const child of children) if (child) node.append(child)
  return node
}

const fmt = (v, unit) => (v === null || v === undefined ? "—" : `${v}${unit === "°" || unit === "%" ? "" : " "}${unit}`)
const byId = (id) => document.getElementById(id)
const findCheck = (r, id) => r.checks.find((c) => c.id === id)

function renderVerdict(r) {
  const box = byId("verdict")
  box.className = `verdict st-${r.verdict.status}`
  byId("verdictTitle").textContent = r.verdict.title
  byId("verdictText").textContent = r.verdict.text
  const counts = r.checks.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {})
  const parts = ["fail", "permit", "warn"].filter((s) => counts[s]).map((s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`)
  const legal = r.maxPayloadT.legal > 0 ? `Max payload ${r.maxPayloadT.legal} t within statutory limits` : "No payload fits statutory limits — permit route only"
  byId("verdictMeta").textContent = `${legal} · ${r.maxPayloadT.technical} t within equipment ratings${parts.length ? ` · ${parts.join(", ")}` : ""}`
}

function kpi(title, value, sub, status = "ok") {
  return el("div", { class: `kpi st-${status}` }, [
    el("div", { class: "title", text: title }),
    el("div", { class: "val", text: value }),
    el("div", { class: "sub", text: sub })
  ])
}

function renderKpis(r) {
  const gcw = findCheck(r, "legal-gcw")
  const { suspension, speedRating } = r.parts
  const axleCap = Math.min(speedRating?.ratingT ?? suspension.ratingT, r.tyreAxleCapT)
  const unit = suspension.kind === "multiline" ? "axle line" : "axle"
  const tiles = [
    kpi("Gross combination weight", `${r.loads.gcwT} t`, gcw ? `Limit ${gcw.limit} t (${r.parts.region.id})` : "No statutory GCW available", gcw?.status),
    kpi("Kingpin / axle group", `${r.loads.kingpinT} / ${r.loads.groupT} t`, `Tractor steer ${r.loads.steerT} t · drive ${r.loads.driveT} t`, findCheck(r, "kingpin")?.status),
    kpi(`Load per ${unit}`, `${r.loads.perAxleT} t`, `Capacity ${axleCap} t (suspension ${speedRating?.ratingT ?? suspension.ratingT} · tyres ${r.tyreAxleCapT})`, r.loads.perAxleT > axleCap ? "fail" : "ok"),
    r.maxPayloadT.legal > 0
      ? kpi("Max payload", `${r.maxPayloadT.legal} t`, `Statutory · ${r.maxPayloadT.technical} t by equipment ratings`, "info")
      : kpi("Max payload", "Permit only", `${r.maxPayloadT.technical} t by equipment ratings`, "permit")
  ]
  if (r.tipper) {
    tiles.push(kpi("Body volume", `${r.tipper.volumeM3} m³`, `Side ${r.tipper.sideHeightM} m · lift ${r.tipper.liftT} t (${r.tipper.cylinders} cyl.)`, "info"))
  }
  byId("kpis").replaceChildren(...tiles)
}

function checkRow(c) {
  const util = c.limit ? Math.min(1, Math.max(0, c.value / c.limit)) : null
  const label = el("td", {}, [el("span", { text: c.label }), c.note ? el("span", { class: "note", text: c.note }) : null])
  const utilCell = el("td", { class: "col-util" }, util === null ? [] : [el("div", { class: "util", title: `${round(util * 100, 0)}%` }, [el("i", { style: `width:${round(util * 100, 1)}%` })])])
  return el("tr", { class: `st-${c.status}` }, [
    el("td", {}, [el("span", { class: "badge", text: STATUS_LABEL[c.status] })]),
    label,
    el("td", { class: "num", text: fmt(c.value, c.unit) }),
    el("td", { class: "num", text: fmt(c.limit, c.unit) }),
    utilCell
  ])
}

function renderChecks(r) {
  const tables = ["legal", "mechanical", "geometry"].map((group) => {
    const rows = r.checks.filter((c) => c.group === group)
    if (!rows.length) return null
    const head = el("tr", {}, ["Status", "Check", "Value", "Limit", ""].map((t, i) => el("th", { text: t, class: i === 4 ? "col-util" : "" })))
    return el("table", { class: "checks" }, [
      el("caption", { text: GROUP_TITLES[group](r) }),
      el("thead", {}, [head]),
      el("tbody", {}, rows.map(checkRow))
    ])
  })
  byId("checksTables").replaceChildren(...tables.filter(Boolean))
}

function renderRegion(r) {
  const region = r.parts.region
  byId("regionName").textContent = region.name
  const badge = byId("regionBadge")
  const basis = BASIS_LABELS[region.basis] ?? BASIS_LABELS.unverified
  badge.textContent = basis.label
  badge.className = `badge st-${basis.status}`
  byId("regionSourceFull").textContent = `Source: ${region.source}`
  byId("regionNotes").replaceChildren(...region.notes.map((n) => el("li", { text: n })))
  byId("regionSource").textContent = `${region.source}${basis.note}`
}

export function renderResults(r, catalog) {
  renderVerdict(r)
  renderKpis(r)
  renderChecks(r)
  renderRegion(r)
  const info = catalog[r.config.model]
  byId("matchedModelTitle").textContent = `Recommended: ${info.title}`
  byId("matchedModelDesc").textContent = info.desc
  byId("matchedModelUrl").href = info.url
  byId("headerPrimaryCta").href = info.categoryUrl
}
