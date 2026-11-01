---
name: flexibility-profiling
description: "Identify and quantify a customer's electricity flexibility potential from smart meter and asset data. Use when asked 'how much flexibility do I have', 'what can I shift', 'where does my power go', for load disaggregation, baseload vs shiftable load splits, EV / heat pump / boiler / battery / PV flexibility sizing, shiftable kWh per day, or building a customer flexibility profile or score."
argument-hint: "Customer or meter to profile"
---

# Flexibility Profiling

Turn raw interval consumption into a clear answer to: *"How much of my electricity can move in
time, when, and for how long — without me noticing?"*

## When to use

- A customer asks what flexibility they have, or you need to open a conversation with a concrete hook.
- Before any tariff simulation or recommendation — the profile is the input to both.
- To compute a **Flexibility Score** for onboarding or gamified experiences.

## Procedure

### 1. Pull the data
Use the `fabric-flex-data` skill. The deployed model gives you **15-minute `consumption_Wh` for one
winter month**, plus date and time-of-day dimensions. Convert once, at the start:
`kWh = Wh / 1000`, average `kW = Wh / 250`.

What the model does **not** give you shapes everything below: no submetering, no asset registry, no
PV, no outside temperature. Every asset claim is therefore an inference from the shape of the load
curve, and must be labelled as one.

### 2. Split the load curve

| Component | How to derive it | Flexible? |
|---|---|---|
| **Baseload** | 10th percentile of each day's 15-min values, averaged | No |
| **Thermal** | Load correlated with outside temperature (heating degree hours) | Yes — hours |
| **EV** | Sustained blocks at ~3.7 / 7.4 / 11 / 22 kW, mostly evening/overnight | Yes — the most |
| **DHW / boiler** | Repeating 1–3 h blocks at 2–6 kW, often tariff-clock driven | Yes — hours |
| **Battery** | Signed charge/discharge, if metered separately | Yes — fully |
| **PV self-consumption** | Production minus export | Indirect — shift load into it |
| **Occupant activity** | Cooking, lighting, entertainment, residual | Mostly no |

Against the current model only the baseload, block-detection, and residual rows are computable.
Temperature correlation, battery signals, and PV are not available — say so rather than guessing.

Without submetering, do a **rule-based disaggregation**: detect rectangular load blocks (step-change
detection on the 15-min series), classify by magnitude, duration, and time-of-day. State the
confidence. Never present a disaggregation as measured fact.

Useful anchor for magnitude checks: across all 144 customers the average 15-minute interval runs
~400 Wh at the 03:00 trough (≈1.6 kW) and ~590–650 Wh at the midday and 17:00 peaks (≈2.4–2.6 kW).
A household block far above that is a large appliance, an EV, or electric heating.

### 3. Quantify per asset
For each flexible asset, produce the four numbers that matter:

- **Power `kW`** — how much can be moved at once.
- **Energy `kWh/day`** — how much can be moved per day.
- **Shift window `h`** — how far it can move without breaching comfort.
- **Recovery / rebound** — energy that must be paid back later (thermal loads, always).

Use the constants and comfort limits in [the asset library](./references/asset-flexibility.md).

### 4. Aggregate

```
flexible_share = shiftable_kWh_per_day / total_kWh_per_day
peak_reduction_potential_kW = Σ asset_kW available in the target hour
```

**Flexibility Score (0–100)** — a communication device, not a physical quantity:

```
score = 40·min(1, flexible_share / 0.40)      # how much can move
      + 25·min(1, shift_window_h / 8)          # how far it can move
      + 20·min(1, controllable_share)          # how much is automatable today
      + 15·min(1, pv_or_battery_kWh / 10)      # on-site storage/generation
```

Always publish the inputs next to the score. An unexplained score is a black box, and black boxes
do not get trusted with a heat pump.

### 5. Return the profile

```json
{
  "period": "2026-08-01/2026-08-31",
  "dataQuality": "15-min, 98% complete",
  "totalKwh": 412,
  "baseloadKw": 0.28,
  "assets": [
    { "type": "ev", "confidence": "high", "kW": 11, "kWhPerDay": 9.4,
      "shiftWindowH": 10, "reboundKwh": 0, "constraint": "ready by 07:00, min 80% SoC" }
  ],
  "flexibleSharePct": 38,
  "peakReductionKw": 7.2,
  "flexibilityScore": 71,
  "assumptions": ["EV inferred from load pattern, not submetered"]
}
```

## Quality gates

- Reject or flag periods with > 10% missing intervals; seasonality needs ≥ 12 months.
- The current dataset is **one winter month**. It cannot support a summer, annual, or heating-season
  claim, and a temperature-driven heat pump signature is not verifiable from it. Say this rather
  than quietly annualising.
- A customer with `TotalConsumtion_Wh = 0` is a data gap. Do not profile them.
- Compare to a like-for-like benchmark cohort, never to a named peer, even though the model exposes
  every customer identifier.
- If no flexible asset is detected, that is a real and useful answer: report the small wins
  (boiler timing, appliance timing) and stop.

## Price-alignment score — the cheap, honest first answer

When asset detection is weak, you can still say something exact and useful. Weight each interval's
energy by that interval's price and compare against the flat-price cost:

```
alignment = 1 − ( Σ E(t)·price(t) ) / ( Σ E(t) · mean_price )
```

Positive means the customer already leans into cheap hours; negative means their load sits on the
expensive ones. In this dataset almost everyone scores negative, which is exactly the opening the
conversation needs. This number requires no disaggregation and no assumptions, so it carries high
confidence — use it before any inferred asset figure.
