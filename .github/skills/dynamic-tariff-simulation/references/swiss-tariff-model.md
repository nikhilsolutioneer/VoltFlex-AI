# Swiss electricity tariff model

Structural reference for pricing a load curve in Switzerland. **All figures are indicative orders of
magnitude for simulation defaults — confirm current values against the utility's published tariff
sheet and ElCom data before showing them to a customer.**

## The price stack

A Swiss household bill has four components plus VAT. Flexibility economics depend on which of them
are time-varying.

| Component | German | Typical share | Time-varying? |
|---|---|---|---|
| Energy | Energie / Arbeitspreis | ~35–50% | Yes — HT/NT, ToU, or spot |
| Grid usage | Netznutzung | ~30–45% | Often HT/NT; increasingly capacity-based |
| Municipal fees | Abgaben an das Gemeinwesen | ~2–8% | No |
| Federal levy | Netzzuschlag (KEV) | small, fixed per kWh | No |
| VAT | MwSt | 8.1% on the total | No |

**Implication:** when the grid component is also HT/NT-differentiated, the effective spread a
customer can capture is much larger than the energy spread alone. Always price the full stack.

## Tariff types

### HT / NT (Hoch-/Niedertarif)
The classic two-block tariff. Typical pattern — **verify per utility**:

- **HT**: Mon–Fri 07:00–20:00, Sat 07:00–13:00
- **NT**: all other hours, Sundays, public holidays

Spread is commonly in the range of several Rp./kWh across the full stack. Simple, predictable, and
already enough to make overnight EV charging worthwhile without any tariff change.

### Time-of-use (multi-block)
Three or more fixed blocks, sometimes seasonal (winter/summer). Same simulation logic as HT/NT with
more boundaries.

### Dynamic / spot-indexed
Energy price follows the day-ahead market (EPEX SPOT CH, hourly products; finer market time units
are being introduced), plus a supplier margin, plus the unchanged grid/levy/VAT stack.

- Prices are published the previous day around midday → **day-ahead optimisation is possible**.
- Winter evening peaks and negative midday prices in sunny periods are both realistic.
- The customer carries price risk. Say so before recommending a switch, every time.
- Only worthwhile with automation or a genuinely flexible asset. For a customer with neither,
  the honest recommendation is "not yet".

### Capacity / peak tariff (Leistungstarif)
Charged on the highest 15-minute average power in the billing period (`Rp./kW` or `CHF/kW·month`).
Already standard for commercial customers and spreading to households with large loads.

- Changes the optimisation objective entirely: **avoid simultaneity**, not just expensive hours.
- One careless minute — EV + heat pump + oven + tumble dryer — can set the monthly charge.
- Value of flexibility = `Δpeak_kW × capacity_rate × months`.

### Self-consumption and communities
- **Eigenverbrauch**: PV kWh consumed on site avoid the full retail price; exported kWh earn only
  the (lower) feed-in remuneration. The delta is the value of shifting load into the PV window.
- **ZEV / local electricity communities**: internal trading changes the effective price for
  participants. Model as a separate price series, not as a discount.

## Regulatory context (Switzerland)

- Revised **StromVG / Mantelerlass** framework strengthens the position that **flexibility belongs
  to the end consumer**, and that its use by a network operator requires agreement and
  compensation. Treat the specifics as "to be confirmed with the utility" in customer-facing text.
- **Smart meter rollout** under StromVV targets broad coverage by the end of 2027, which is what
  makes 15-minute interval feedback possible at all.
- **Ripple control (Rundsteuerung)** already controls many boilers and heat pumps today. Check for
  it before claiming a load is uncontrolled.
- **ElCom** publishes comparative tariff data, useful for benchmarking and for sanity-checking any
  price used in a simulation.

## CO2 accounting

- Swiss consumption-mix intensity is low but strongly **time- and season-dependent** (winter
  imports). Use a time-resolved marginal intensity series when available.
- Prefer **marginal** over average intensity for shifting decisions — the question is what the
  *next* kWh causes, not what the average kWh contains.
- If no time series is available, say CO2 impact is "directionally positive but not quantified"
  rather than quoting an average-mix number that hides the whole effect.
