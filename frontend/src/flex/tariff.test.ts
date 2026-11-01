import { expect, it } from 'vitest'
import { localDayKey, localHour, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import {
  assertIntervals, assertPriceCurve, byLocalDay, cheapestHour, completenessPct, dynamicCostChf,
  hourlyKwh, type Interval, intervalFromWh, lowestPriceCostChf, meanPrice, peakHour, peakKw,
  priceAlignment, priciestHour, staticCostChf, totalKwh,
} from './tariff'

const STEP_MS = 15 * 60_000
const FLAT = Array.from({ length: 24 }, () => 0.2)

function series(startIso: string, count: number, whAt: (hour: number) => number): Interval[] {
  const start = Date.parse(startIso)
  return Array.from({ length: count }, (_, index) => {
    const ts = new Date(start + index * STEP_MS).toISOString()
    return intervalFromWh(ts, whAt(localHour(ts)))
  })
}

it('prices a flat curve identically to the static tariff', () => {
  const intervals = series('2026-01-12T23:00:00Z', 96, () => 500)
  expect(dynamicCostChf(intervals, FLAT)).toBeCloseTo(staticCostChf(intervals, 0.2), 9)
  expect(totalKwh(intervals)).toBeCloseTo(48, 9)
})

it('reads alignment as negative when load sits on the expensive hours', () => {
  const curve = REFERENCE_PRICE_CURVE_CHF_PER_KWH
  const evening = series('2026-01-12T23:00:00Z', 96, (hour) => (hour === priciestHour(curve) ? 4000 : 200))
  const night = series('2026-01-12T23:00:00Z', 96, (hour) => (hour === cheapestHour(curve) ? 4000 : 200))
  expect(priceAlignment(evening, curve)).toBeLessThan(0)
  expect(priceAlignment(night, curve)).toBeGreaterThan(0)
})

it('keeps the theoretical floor below the do-nothing dynamic cost', () => {
  const intervals = series('2026-01-12T23:00:00Z', 96, () => 500)
  const curve = REFERENCE_PRICE_CURVE_CHF_PER_KWH
  expect(lowestPriceCostChf(intervals, curve)).toBeLessThan(dynamicCostChf(intervals, curve))
})

it('derives peak power and peak hour from the 15-minute grain', () => {
  const intervals = series('2026-01-12T23:00:00Z', 96, (hour) => (hour === 17 ? 2500 : 250))
  expect(peakKw(intervals)).toBeCloseTo(10, 9)
  expect(peakHour(intervals)).toBe(17)
  expect(hourlyKwh(intervals).reduce((sum, value) => sum + value, 0)).toBeCloseTo(totalKwh(intervals), 9)
})

it('groups a 23-hour spring-forward day into one local day', () => {
  const intervals = series('2026-03-28T23:00:00Z', 92, () => 400)
  const days = byLocalDay(intervals)
  expect([...days.keys()]).toEqual(['2026-03-29'])
  expect(days.get('2026-03-29')).toHaveLength(92)
  // 02:00 local never happens on this day: 00:30 UTC is 01:30 local, 01:30 UTC is already 03:30.
  expect(localHour('2026-03-29T00:30:00Z')).toBe(1)
  expect(localHour('2026-03-29T01:30:00Z')).toBe(3)
})

it('groups a 25-hour autumn day into one local day with a repeated hour', () => {
  const intervals = series('2026-10-24T22:00:00Z', 100, () => 400)
  const days = byLocalDay(intervals)
  expect([...days.keys()]).toEqual(['2026-10-25'])
  expect(days.get('2026-10-25')).toHaveLength(100)
  expect(localHour('2026-10-25T00:30:00Z')).toBe(2)
  expect(localHour('2026-10-25T01:30:00Z')).toBe(2)
  expect(localDayKey('2026-10-25T23:30:00Z')).toBe('2026-10-26')
})

it('reports partial coverage instead of pretending the period is complete', () => {
  expect(completenessPct(series('2026-01-12T23:00:00Z', 96, () => 400))).toBeCloseTo(100, 6)
  expect(completenessPct(series('2026-01-12T23:00:00Z', 48, () => 400))).toBeCloseTo(50, 6)
})

it('rejects missing, negative, and malformed inputs rather than returning a number', () => {
  expect(() => assertIntervals([])).toThrow()
  expect(() => assertIntervals([{ ts: '2026-01-13T00:00:00Z', kwh: -1 }])).toThrow()
  expect(() => assertPriceCurve([0.2])).toThrow()
  expect(() => staticCostChf(series('2026-01-12T23:00:00Z', 4, () => 400), 0)).toThrow()
  expect(() => localHour('not-a-timestamp')).toThrow()
  expect(() => priceAlignment(series('2026-01-12T23:00:00Z', 4, () => 0), FLAT)).toThrow()
})

it('keeps the reference price curve consistent with the documented dataset facts', () => {
  const curve = REFERENCE_PRICE_CURVE_CHF_PER_KWH
  expect(cheapestHour(curve)).toBe(3)
  expect(priciestHour(curve)).toBe(17)
  expect(meanPrice(curve)).toBeCloseTo(0.217, 3)
  expect(Math.max(...curve) - Math.min(...curve)).toBeCloseTo(0.1, 3)
})
