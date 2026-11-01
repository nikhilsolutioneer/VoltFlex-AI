# Asset flexibility library

Planning defaults for Swiss single-family / apartment customers. **Replace with measured values
whenever real data exists** — these are for cold-start estimates and must be labelled as such.

## Electric vehicle

| Property | Typical |
|---|---|
| AC charging power | 3.7 kW (1×16 A), 7.4 kW, 11 kW (3×16 A), 22 kW |
| Battery | 40–90 kWh usable |
| Daily energy | 5–12 kWh (~25–45 km/day at 17–20 kWh/100 km) |
| Plugged-in duration | 12–16 h on a typical weekday evening |
| Charging need | 1–3 h at 11 kW |
| **Flexibility** | **Highest of any household asset**: energy is ~fully shiftable inside the plug-in window, no rebound, no comfort loss |
| Comfort constraint | Departure time + minimum state of charge; keep a user-set "always ready" floor (e.g. 50%) |
| Failure mode | Herding — everyone charging at the same cheap hour creates a new peak. Randomise start times. |

Bidirectional (V2H / V2G) adds discharge, but check warranty, inverter capability, and that the
customer is compensated. Do not assume it.

## Heat pump

| Property | Typical |
|---|---|
| Electrical power | 2–5 kW (SFH air-water), COP 2.5–4.5 seasonal |
| Building thermal inertia | 2–6 h for a renovated SFH, > 12 h for a heavy/well-insulated one |
| Shift window | 1–4 h without perceptible temperature change (±0.5 K) |
| Rebound | Near 100% — deferred heat is consumed later, often at higher power |
| Comfort constraint | Indoor setpoint band; never in extreme cold without a verified reserve |

Pre-heating (charging the building before a price peak) is the useful move. Net saving only exists
if the price spread beats the extra losses from a higher flow temperature.

## Domestic hot water / boiler

| Property | Typical |
|---|---|
| Power | 2–6 kW |
| Storage | 200–800 L ≈ 8–35 kWh thermal |
| Daily energy | 4–10 kWh |
| Shift window | 6–12 h — the tank is the storage |
| Comfort constraint | Legionella cycle (≥ 60 °C periodically) and morning/evening draw-off |

Often already on a utility ripple-control (Rundsteuerung) clock. Check before "optimising" it — you
may be fighting an existing control signal.

## Home battery

| Property | Typical |
|---|---|
| Capacity | 5–15 kWh |
| Power | 3–10 kW |
| Round-trip efficiency | 85–92% |
| Cycle cost | Degradation is real; count ~CHF 0.05–0.12/kWh cycled unless the customer has a figure |
| **Flexibility** | Fully dispatchable within SoC and power limits |

A battery only pays when the price spread exceeds round-trip losses **plus** cycle cost. Say this
before anyone spends CHF 10'000.

## Rooftop PV

| Property | Typical |
|---|---|
| Size | 5–15 kWp |
| Yield | ~950–1'100 kWh/kWp·a on the Swiss plateau |
| Self-consumption (no storage) | 25–35%; with load shifting 40–55%; with battery 60–75% |

With feed-in remuneration well below the retail price, **every kWh moved under the PV curve is worth
the difference**. This is usually the single largest, easiest win — and it needs no tariff change.

## Appliances

Dishwasher 0.8–1.5 kWh, washing machine 0.5–1.2 kWh, tumble dryer 1.5–3.5 kWh per cycle. Fully
shiftable by timer, but small. Use them as an engagement on-ramp, not a savings pitch — the honest
framing is "this builds the habit; the EV and the heat pump carry the money".

## What is *not* flexible

Lighting, cooking, refrigeration, IT, medical devices, and anything a person is standing in front of.
Never suggest shifting these. Doing so is the fastest way to lose the customer's trust.
