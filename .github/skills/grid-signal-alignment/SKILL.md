---
name: grid-signal-alignment
description: "Align customer consumption with the needs of the electricity system. Use for questions about peak shaving, local grid congestion, CO2-optimised timing, when the grid needs less or more load, demand response, flexibility markets, balancing and ancillary services, aggregator pooling, ripple control, and how a household's shifting actually helps the energy transition."
argument-hint: "Grid need or signal to align consumption with"
---

# Grid Signal Alignment

Price is a proxy for system need — a good one, but not the only one. This skill covers the other
signals, and the honest story about what one household's shifting actually does.

**What is measurable today:** the deployed semantic model contains the **price signal only**. There
is no feeder load, no CO2 intensity, and no TSO data in it. Explain the other signals as concepts,
use the price signal for any number, and say plainly when a measurement is not available rather
than substituting an industry average.

## When to use

- The customer asks "does this actually help?", "am I helping the grid?", or about CO2 timing.
- Optimising for something other than the bill: local congestion, peak load, emissions.
- Designing demand-response, aggregation, or community features.

## The signals, in order of usefulness to a household

| Signal | Source | Horizon | What it asks for |
|---|---|---|---|
| **Retail price / spot** | Tariff, day-ahead market | 12–36 h | Move load to cheap hours |
| **Local grid load** | DSO substation / feeder telemetry | hours–days | Reduce the local peak, absorb local PV surplus |
| **System peak** | National load curve, winter evenings | seasonal | Avoid 17:00–20:00 winter load |
| **Marginal CO2** | Time-resolved intensity series | 24 h | Move to low-carbon hours |
| **Balancing / ancillary** | TSO markets (FCR, aFRR, mFRR) | seconds–minutes | Requires an aggregator; not a solo household |
| **Ripple control** | DSO broadcast (Rundsteuerung) | real time | Legacy direct control of boilers/heat pumps |

### Signal conflicts are normal
The cheapest hour is not always the lowest-CO2 hour, and neither is always the best for the local
feeder. When signals disagree:

1. State the conflict plainly rather than hiding it behind one blended score.
2. Default to the customer's stated priority (money / CO2 / grid). Ask once, then remember.
3. Offer the compromise window where two of three signals agree.

## Local congestion — the underrated one

National price signals say nothing about whether *this street* is congested. A feeder with heavy PV
at noon wants **more** load then, even if the national price is not especially low. A feeder with a
cluster of EVs wants less load at 18:00.

Where feeder-level data exists in the Lakehouse, prefer it: it is the signal with the most physical
truth in it and the one a DSO can actually act on. Aggregate it to a neighbourhood level before
showing anything, and never at a granularity that identifies a household.

## What one household can honestly claim

Be precise and modest, then show the aggregate:

> *"Your shift moves about 9 kWh out of the evening peak. On its own that's small. Across the
> 12'000 customers with an EV in this area, the same shift is roughly 25 MW — about the peak
> load of a small town."*

This framing is both true and motivating. Overclaiming individual impact is the fastest route to
cynicism.

## Participation models, plainly explained

| Model | What the customer does | What they get | Reality check |
|---|---|---|---|
| **Implicit DR** | Reacts to tariff signals | Lower bill | Available today, no contract needed |
| **Explicit DR / pooling** | Lets an aggregator control an asset | Availability + activation payment | Needs a contract, a controllable asset, and pool minimums (MW-scale) that only aggregation reaches |
| **Ripple control** | Utility switches boiler/heat pump | Usually a cheaper tariff | Often already in place — check before "optimising" |
| **Local community / ZEV** | Shares PV with neighbours | Cheaper internal price | Depends on local rules and metering |

In Switzerland, the flexibility of a connected asset is generally regarded as belonging to the end
consumer, and its use by a network operator requires agreement and compensation. Present the details
as "to confirm with your utility" — the regulatory framework is actively evolving.

## Rebound and herding — always model them

Two failure modes destroy the system value of flexibility:

- **Herding**: a shared cheap window turns into the new peak. Mitigate with randomised start times,
  staggered windows, and capacity-aware dispatch.
- **Rebound**: deferred thermal load returns, often at higher power than it left. Always include
  recovery energy in the simulation and check the post-shift peak, not just the shifted hour.

If a recommendation would create either effect at scale, say so and adjust the window.
