import { expect, it } from 'vitest'
import { typicalHouseholdIntervals } from './data'
import { localHour, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import { buildProfile, classify, detectBlocks, percentile } from './profile'
import { type Interval, intervalFromWh } from './tariff'

const CURVE = REFERENCE_PRICE_CURVE_CHF_PER_KWH
const STEP_MS = 15 * 60_000

function series(startIso: string, count: number, whAt: (hour: number) => number): Interval[] {
  const start = Date.parse(startIso)
  return Array.from({ length: count }, (_, index) => {
    const ts = new Date(start + index * STEP_MS).toISOString()
    return intervalFromWh(ts, whAt(localHour(ts)))
  })
}

it('splits a typical household into baseload and movable blocks', () => {
  const profile = buildProfile(typicalHouseholdIntervals(7), CURVE)
  expect(profile.days).toBe(7)
  expect(profile.completenessPct).toBeCloseTo(100, 1)
  expect(profile.baseloadKw).toBeGreaterThan(0.4)
  expect(profile.baseloadKw).toBeLessThan(0.8)
  expect(profile.assets.map((asset) => asset.type).sort()).toEqual(['ev', 'water-heating'])
  expect(profile.flexibleSharePct).toBeGreaterThan(20)
  expect(profile.flexibilityScore).toBeGreaterThan(0)
  expect(profile.flexibilityScore).toBeLessThanOrEqual(100)
})

it('never claims an asset is measured when it was read off the curve', () => {
  const profile = buildProfile(typicalHouseholdIntervals(3), CURVE)
  expect(profile.confidence).toBe('low')
  for (const asset of profile.assets) expect(asset.confidence).toBe('low')
  expect(profile.assumptions.join(' ')).toContain('inferred from the shape of the load curve')
})

it('scores controllability and storage at zero because the model cannot observe them', () => {
  const profile = buildProfile(typicalHouseholdIntervals(2), CURVE)
  expect(profile.scoreInputs.controllableShare).toBe(0)
  expect(profile.scoreInputs.pvOrBatteryKwh).toBe(0)
  expect(profile.flexibilityScore).toBeLessThanOrEqual(65)
})

it('reads a misaligned load curve as a negative alignment', () => {
  const profile = buildProfile(typicalHouseholdIntervals(3), CURVE)
  expect(profile.alignmentPct).toBeLessThan(0)
  expect(profile.peakHour).toBe(18)
})

it('reports a flat curve as having nothing to shift, rather than estimating one', () => {
  const profile = buildProfile(series('2026-01-12T23:00:00Z', 96, () => 400), CURVE)
  expect(profile.assets).toEqual([])
  expect(profile.shiftableKwhPerDay).toBe(0)
  expect(profile.flexibilityScore).toBe(0)
  expect(profile.assumptions.join(' ')).toContain('No shiftable block was detected')
})

it('refuses to profile a customer with no consumption', () => {
  expect(() => buildProfile(series('2026-01-12T23:00:00Z', 96, () => 0), CURVE)).toThrow(/no consumption/i)
})

it('flags a period that fails the 90% completeness gate', () => {
  const profile = buildProfile(series('2026-01-12T23:00:00Z', 40, () => 400), CURVE)
  expect(profile.warnings.join(' ')).toMatch(/readings are present/)
})

it('classifies blocks only within the documented asset power and duration ranges', () => {
  expect(classify(11, 1, 18)).toBe('ev')
  expect(classify(11, 1, 12)).toBe('unclassified')
  expect(classify(3, 2, 5)).toBe('water-heating')
  expect(classify(1.5, 1, 12)).toBe('appliance')
  expect(classify(0.5, 4, 12)).toBe('unclassified')
})

it('only treats a run of at least two intervals as a block', () => {
  const flat = series('2026-01-12T23:00:00Z', 96, () => 400)
  const withSpike = flat.map((entry, index) => (index === 40 ? { ...entry, kwh: 3 } : entry))
  expect(detectBlocks(flat, 1.6)).toEqual([])
  expect(detectBlocks(withSpike, 1.6)).toEqual([])
})

it('takes a percentile without mutating the input', () => {
  const values = [5, 1, 3]
  expect(percentile(values, 0.1)).toBe(1)
  expect(values).toEqual([5, 1, 3])
  expect(() => percentile([], 0.1)).toThrow()
})
