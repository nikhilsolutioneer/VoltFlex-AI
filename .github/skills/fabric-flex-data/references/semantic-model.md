# Semantic model knowledge base

Verified against the deployed semantic model through the Fabric Data Agent. This is the ground truth
for every number the assistant states. **Re-verify after any model refresh or data reload** — the
figures below describe the current demo dataset, not a permanent fact about the world.

## Tables

### `Consumption` (fact, 15-minute grain)

| Column | Type | Meaning |
|---|---|---|
| `consumption_Wh` | Decimal | Energy in the interval, **in Wh** — not kWh |
| `datetime` | DateTime | Interval timestamp |
| `ConsumptionDate` | DateTime | Key into the date dimension |
| `ConsumptionTime` | DateTime | Key into the time-of-day dimension |
| `dataset_id` | Text | Source dataset key |

### `ConsumptionDate` (date dimension)
`ConsumptionDate`, `DayName`, `DayType` (`Workday` \| `Weekend`), `Month`, `MonthOfYear`,
`Season`, `Week`.

### `ConsumptionTime` (time-of-day dimension)
`ConsumptionTime`, `Hour` (0–23), `DayNight` — **`Day` = hours 06–21, `Night` = hours 22–05**.
Note this is the model's own day/night split; it is *not* the utility HT/NT clock.

### `Customer`
`CustomerId` (Text). Pseudonymous 4-character hex identifiers. Related to `Consumption`.

### `DynamicTarif` (price series, 15-minute grain)
`Tarif` (Double), `TarifName`, `TarifType`, `Unit`, `ValidFrom`, `ValidTo`.

### `DynamicTarifMinValuePerDay`
`ConsumptionDate`, `LowestTarif`, `TarifName`, `TarifType`, `Unit` — the single cheapest price of
each day, used by the best-case measure.

## Measures on `Consumption`

| Measure | Meaning |
|---|---|
| `TotalConsumtion_Wh` | Total energy in Wh. **The name is misspelled in the model** — use it verbatim |
| `FixPricePerWh` | The static reference price. Despite the name, the value is **CHF per kWh** |
| `CostStaticPrice` | Cost of actual consumption at the static price, CHF |
| `CostByDynamicPrice` | Cost of actual consumption at the 15-min dynamic price, CHF |
| `CostByLowestPrice` | **Theoretical floor**: each day's entire consumption priced at that day's single cheapest interval price, summed over days |
| `SavingsDynamic_Absolute` / `_Pct` | Static minus dynamic — what switching tariff does with **no behaviour change** |
| `SavingsLowest_Absolute` / `_Pct` | Static minus best case — the **unreachable upper bound** on shifting |

## Current dataset facts

| Fact | Value |
|---|---|
| Period | ~one month, **winter only** (`Season` has a single value) |
| Resolution | 15 minutes |
| Customers | 144, pseudonymous |
| Rows | ~388k |
| Tariff | one series, `TarifName = integrated_400D`, `TarifType = integrated`, `Unit = CHF/kWh` |
| Dynamic price range | ~0.104 – 0.352 CHF/kWh, mean ~0.217 |
| Static price | ~0.23 CHF/kWh |
| Cheapest hour | **03:00**, ~0.196 CHF/kWh |
| Most expensive hour | **17:00**, ~0.296 CHF/kWh |
| Usable spread | ~0.10 CHF/kWh ≈ **10 Rp./kWh** |
| Consumption per customer | mean ~1'440 kWh for the period; range 0 – ~9'840 kWh |

### Average load shape (Wh per 15-min interval, all customers)

Trough ~403 Wh at 03:00 (≈1.6 kW), peak ~651 Wh at 11:00 and a second peak ~588 Wh at 17:00
(≈2.35 kW). Load falls through the night to 03:00 and rises steadily from 05:00.

## The headline insight

```
SavingsDynamic_Pct   mean −5%   (range −11% … +1%)   ← switch tariff, change nothing
SavingsLowest_Pct    mean +17%  (range +14% … +19%)  ← unreachable perfect shifting
```

**Today's consumption is misaligned with today's prices.** The evening price peak at 17:00 lands on
a consumption peak, and the cheap 03:00 window sits on the daily consumption trough. So:

- Switching to this dynamic tariff **without changing behaviour makes almost every customer worse
  off**, by about 5%. Never recommend the switch on its own.
- The entire value lives in the gap between −5% and +17%. That gap is the flexibility opportunity,
  and it is what the assistant exists to help the customer capture.
- A realistic capture is `shiftable_share × spread_capture`, typically a **small fraction** of the
  17% ceiling. Use the ceiling to frame ambition, never to quote a saving.

## Known gotchas

1. **Wh, not kWh.** `kWh = consumption_Wh / 1000`. Average power `kW = consumption_Wh / 250` for a
   15-minute interval. This is the single most likely source of a 1000× or 4× error.
2. **`FixPricePerWh` is CHF/kWh.** The name lies. Do not divide by 1000.
3. **`TotalConsumtion_Wh` is misspelled.** Queries fail silently against the corrected spelling.
4. **One winter month.** No seasonality, no summer, no heating-season comparison. Never annualise
   without saying you extrapolated from a single winter month, and never claim a heat pump pattern
   from it alone.
5. **Timestamps.** The series starts at 23:00 on the day before the first full local day, which is
   the signature of UTC storage with `Europe/Zurich` local dimensions. Confirm which field is local
   before doing any daily or hourly aggregation, and state the time zone in every answer.
6. **Zero-consumption customers exist.** A customer with `TotalConsumtion_Wh = 0` is a data gap, not
   an efficiency champion. Screen before profiling.
7. **`CostByLowestPrice` is physically impossible.** It assumes an entire day's load moves to one
   15-minute price. Present it as "the theoretical maximum", never as an achievable target.
8. **`dataset_id` and `CustomerId` are different fields.** Use `CustomerId` for the customer
   relationship; confirm the join before mixing them.

## What the model does **not** contain

No asset registry, no submetering, no PV production, no outside temperature, no grid/feeder load,
no CO2 intensity, no HT/NT tariff, no capacity tariff, no dwelling or household attributes.

Consequences the assistant must respect:

- **All appliance-level attribution is inference from the load curve.** Label it as inferred, with
  a confidence, every single time.
- **No CO2 claims.** Say the data is not available rather than quoting an average-mix figure.
- **No grid-congestion claims.** Only the price signal is grounded here.
- **No heat pump confirmation.** Temperature correlation is not computable from this model.
- Benchmarks are possible across the 144 customers — aggregate cohorts only, never a named peer.
