/** Deterministic cost engine. Pure functions, no I/O, no React. The model explains these results; it never computes them. */
import { localDayKey, localHour, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import { INTERVALS_PER_DAY, INTERVALS_PER_HOUR, kwhFromWh } from './units'

/** One 15-minute meter interval. `ts` is an ISO 8601 UTC instant; `kwh` is already converted. */
export interface Interval {
  readonly ts: string
  readonly kwh: number
}

/** 24 hourly prices in CHF/kWh, indexed by Europe/Zurich local hour. */
export type PriceCurve = readonly number[]

export function assertPriceCurve(curve: PriceCurve): PriceCurve {
  if (curve.length !== 24 || curve.some((price) => !Number.isFinite(price) || price < 0 || price > 5)) {
    throw new Error('A price curve needs 24 hourly prices in CHF/kWh.')
  }
  return curve
}

export function assertIntervals(intervals: readonly Interval[]): readonly Interval[] {
  if (!intervals.length) throw new Error('No meter intervals available for this period.')
  if (intervals.some((entry) => !Number.isFinite(entry.kwh) || entry.kwh < 0)) {
    throw new Error('Meter intervals must carry a non-negative energy value.')
  }
  return intervals
}

export function priceAt(curve: PriceCurve, ts: string): number {
  return assertPriceCurve(curve)[localHour(ts)]
}

export function meanPrice(curve: PriceCurve): number {
  return assertPriceCurve(curve).reduce((sum, price) => sum + price, 0) / 24
}

export function cheapestHour(curve: PriceCurve): number {
  return assertPriceCurve(curve).indexOf(Math.min(...curve))
}

export function priciestHour(curve: PriceCurve): number {
  return assertPriceCurve(curve).indexOf(Math.max(...curve))
}

export function totalKwh(intervals: readonly Interval[]): number {
  return intervals.reduce((sum, entry) => sum + entry.kwh, 0)
}

/** Cost of the actual curve under a time-varying price. */
export function dynamicCostChf(intervals: readonly Interval[], curve: PriceCurve): number {
  assertIntervals(intervals)
  assertPriceCurve(curve)
  return intervals.reduce((sum, entry) => sum + entry.kwh * curve[localHour(entry.ts)], 0)
}

/** Cost of the actual curve at one flat price. */
export function staticCostChf(intervals: readonly Interval[], chfPerKwh: number): number {
  assertIntervals(intervals)
  if (!Number.isFinite(chfPerKwh) || chfPerKwh <= 0) throw new Error('A static price must be a positive CHF/kWh value.')
  return totalKwh(intervals) * chfPerKwh
}

/** Theoretical floor: each local day's whole load priced at that day's cheapest hour. Never achievable. */
export function lowestPriceCostChf(intervals: readonly Interval[], curve: PriceCurve): number {
  assertIntervals(intervals)
  assertPriceCurve(curve)
  let cost = 0
  for (const [, dayIntervals] of byLocalDay(intervals)) {
    const cheapest = Math.min(...dayIntervals.map((entry) => curve[localHour(entry.ts)]))
    cost += totalKwh(dayIntervals) * cheapest
  }
  return cost
}

/**
 * Price alignment: 1 - (price-weighted cost / flat-price cost).
 * Positive means the load already sits in cheap hours. Needs no disaggregation, so confidence is high.
 */
export function priceAlignment(intervals: readonly Interval[], curve: PriceCurve): number {
  const flat = staticCostChf(intervals, meanPrice(curve))
  if (flat === 0) throw new Error('Alignment needs a period with non-zero consumption.')
  return 1 - dynamicCostChf(intervals, curve) / flat
}

/** Energy per local hour of day, summed across the period. */
export function hourlyKwh(intervals: readonly Interval[]): number[] {
  assertIntervals(intervals)
  const hours = Array.from({ length: 24 }, () => 0)
  for (const entry of intervals) hours[localHour(entry.ts)] += entry.kwh
  return hours
}

export function byLocalDay(intervals: readonly Interval[]): Map<string, Interval[]> {
  const days = new Map<string, Interval[]>()
  for (const entry of intervals) {
    const key = localDayKey(entry.ts)
    const day = days.get(key)
    if (day) day.push(entry)
    else days.set(key, [entry])
  }
  return days
}

/** Highest 15-minute average power in the period — the quantity a capacity tariff bills. */
export function peakKw(intervals: readonly Interval[]): number {
  assertIntervals(intervals)
  return Math.max(...intervals.map((entry) => entry.kwh * INTERVALS_PER_HOUR))
}

export function peakHour(intervals: readonly Interval[]): number {
  const hours = hourlyKwh(intervals)
  return hours.indexOf(Math.max(...hours))
}

/** Share of the expected 96 intervals per local day that are actually present. */
export function completenessPct(intervals: readonly Interval[]): number {
  const days = byLocalDay(intervals)
  if (!days.size) return 0
  return Math.min(100, (intervals.length / (days.size * INTERVALS_PER_DAY)) * 100)
}

export function defaultPriceCurve(): PriceCurve {
  return REFERENCE_PRICE_CURVE_CHF_PER_KWH
}

export function intervalFromWh(ts: string, wh: number): Interval {
  return { ts, kwh: kwhFromWh(wh) }
}
