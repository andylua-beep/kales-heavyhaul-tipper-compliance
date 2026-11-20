chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("kales_heavyhaul_presets")
  if (!existing.kales_heavyhaul_presets) {
    await chrome.storage.local.set({
      kales_heavyhaul_presets: [
        {
          name: "3-axle lowboy · 30 t excavator · China GB 1589",
          savedAt: null,
          config: {
            region: "CN",
            model: "lowboy-trailer",
            tractor: "6x4",
            suspension: "mechanical-13",
            axles: 3,
            spacingM: 1.31,
            lengthM: 13.5,
            neckM: 3.8,
            rearOverhangM: 1.6,
            deckMm: 900,
            cargo: { weightT: 30, lengthM: 4.2, widthM: 3.0, heightM: 3.1 }
          }
        }
      ]
    })
  }
})
