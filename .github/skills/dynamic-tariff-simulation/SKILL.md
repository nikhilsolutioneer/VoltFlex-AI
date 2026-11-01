---
name: dynamic-tariff-simulation
description: "Simulate and compare electricity tariffs and load-shifting scenarios for a customer. Use for 'what if' questions, 'should I switch to a dynamic tariff', 'how much would I save by charging at night', HT/NT vs time-of-use vs spot-price comparisons, capacity/peak tariff impact, PV self-consumption value, battery payback, and any question that needs a CHF number attached to moving kWh in time."
argument-hint: "Scenario to simulate, e.g. 'EV charging moved to 02:00'"
---

# Dynamic Tariff Simulation

Answer *"what would that actually cost or save me?"* with a reproducible number and its assumptions.

## When to use

- Any customer question containing "what if", "should I switch", "is it worth it", or "how much".
- After the `flexibility-profiling` skill has established what can move.
- Before the `flexibility-recommendations` skill ranks anything by value.

## Procedure

### 1. Establish the baseline
Compute actual cost over a real historical period from the customer's own interval series and their
current tariff, retrieved via the `fabric-flex-data` skill. Never simulate against an assumed
baseline when meter data exists.

The deployed semantic model already computes the three anchors. Use them rather than recomputing:

| Measure | Role |
|---|---|
| `CostStaticPrice` | Today's bill at the flat ~0.23 CHF/kWh reference price |
| `CostByDynamicPrice` | Same behaviour, dynamic 15-minute prices — the **do-nothing floor** |
| `CostByLowestPrice` | Every day's load at that day's cheapest interval — the **impossible ceiling** |

### 1b. Frame every scenario between floor and ceiling

```
SavingsDynamic_Pct   ≈ −5%   do nothing, just switch tariff
<your scenario>              ← must land strictly inside this band
SavingsLowest_Pct    ≈ +17%  perfect, physically impossible shifting
```

Any simulated saving outside that band is a bug, not a finding. Check it before you present it.
A realistic result sits in the low single-digit percentages, because only part of the load can move
and it can only move part of the way to the cheapest price.

Never quote `SavingsLowest_Pct` as an achievable saving. It is an ambition frame and nothing else.

```
cost = Σ_t  E(t)[kWh] × price(t)[Rp./kWh] / 100
```

Use the full price stack, not just the energy component — see
[the Swiss tariff model](./references/swiss-tariff-model.md). A saving computed on energy alone is
overstated, often by 2×.

### 2. Build the scenario
A scenario is an explicit, bounded transformation of the load curve:

```
shift(asset, fromWindow, toWindow, kWh, maxKw, efficiency, reboundFactor)
```

Hard rules:
- **Conserve energy.** Shifted kWh reappear elsewhere. For thermal loads add the rebound; for
  batteries and V2G apply round-trip efficiency.
- **Respect physics.** Never exceed the asset's `kW` or the connection limit, never exceed the
  available hours in the target window.
- **Respect comfort.** Carry the constraints from the profile (departure time, min SoC, temperature
  band, hot water draw-off).
- **Respect simultaneity.** If three assets all move to 02:00, sum their power and check the house
  fuse and any capacity tariff.

### 3. Price the scenario
Re-price the modified curve under each tariff being compared. Report as a delta:

```
Δcost = cost_scenario − cost_baseline        (negative = saving)
```

Extrapolate to a year **only** with a seasonality correction, and say you did. One cold January week
is not a year.

### 4. Report all four dimensions

| Dimension | Unit | Note |
|---|---|---|
| Money | CHF/month and CHF/year | The headline |
| Comfort | qualitative | "no change" / "hot water 1 h later" |
| CO2 | kg/year | Only if a time-resolved intensity series exists — it does not in the current model |
| Grid | kW peak change | Feeds the `grid-signal-alignment` skill |

### 5. Stress the result
Before presenting, re-run with: ±30% on the price spread, ±20% on the shifted kWh, and a worst-case
(everyone shifts, peak hour moves). If the saving flips sign, present it as "depends on" rather than
as a number. Report a range when the spread is wide.

## Standard scenarios worth having ready

1. **EV overnight** — move evening charging to the cheapest 3–4 h before departure.
2. **PV soaking** — move boiler, dishwasher, EV top-up into the midday production window.
3. **Heat pump pre-heat** — pre-charge the building 2 h before the evening price peak.
4. **Peak shaving** — cap simultaneous load at N kW; relevant under capacity tariffs.
5. **Tariff switch** — same load curve, different tariff. In this dataset the honest answer is
   usually **no**: the average customer pays ~5% more on the dynamic tariff without changing
   behaviour. Lead with that, then show what shifting would have to achieve to flip it.
6. **Battery arbitrage** — charge cheap, discharge expensive, net of efficiency and cycle cost.
   With a ~10 Rp./kWh daily spread, check this against round-trip losses before encouraging anyone.

## Output contract

```json
{
  "scenario": "EV charging moved from 18:00-21:00 to 01:00-05:00",
  "period": "2026-01-01/2026-12-31 (12 mo actual)",
  "tariff": "dynamic hourly (indicative)",
  "baselineChf": 1840,
  "scenarioChf": 1663,
  "savingChf": 177,
  "savingRange": [110, 240],
  "co2KgDelta": -46,
  "peakKwDelta": -4.1,
  "comfortImpact": "none — vehicle ready by 07:00",
  "assumptions": [
    "9.4 kWh/day charged, 11 kW, plugged 18:00-07:00",
    "Price spread HT/NT 8.2 Rp./kWh incl. grid component",
    "No change in driving pattern"
  ],
  "confidence": "medium"
}
```

## Anti-patterns

- Quoting a precise annual saving from two weeks of summer data.
- Comparing a dynamic tariff's *energy* price to a fixed tariff's *total* price.
- Ignoring the grid-usage component, which is often the larger half of the bill.
- Silently assuming the customer will manually re-time things every single day. Automation
  assumptions must be stated — unautomated behaviour change decays fast.
- Presenting a saving without the comfort cost next to it.
