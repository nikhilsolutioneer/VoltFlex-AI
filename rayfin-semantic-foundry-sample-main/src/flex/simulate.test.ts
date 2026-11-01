import { expect, it } from 'vitest'
import { typicalHouseholdIntervals } from './data'
import { DATASET_FACTS, localHour, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import { applyShift, assertShiftPlan, scaleSpread, type ShiftPlan, simulateShift } from './simulate'
import { dynamicCostChf, type Interval, intervalFromWh, meanPrice, totalKwh } from './tariff'

const CURVE = REFERENCE_PRICE_CURVE_CHF_PER_KWH
const STATIC = DATASET_FACTS.staticPriceChfPerKwh
const STEP_MS = 15 * 60_000

function series(count: number, whAt: (hour: number) => number): Interval[] {
  const start = Date.parse('2026-01-12T23:00:00Z')
  return Array.from({ length: count }, (_, index) => {
    const ts = new Date(start + index * STEP_MS).toISOString()
    return intervalFromWh(ts, whAt(localHour(ts)))
  })
}

const plan = (overrides: Partial<ShiftPlan> = {}): ShiftPlan => ({
  label: 'Car charging moved to 02:00',
  assetType: 'ev',
  fromHours: [18, 19],
  toHours: [2, 3],
  kwhPerDay: 8,
  maxKw: 11,
  efficiency: 1,
  reboundFactor: 0,
  comfortImpact: 'None',
  ...overrides,
})

it('conserves energy when there is no loss and no rebound', () => {
  const intervals = series(96, (hour) => (hour === 18 || hour === 19 ? 2000 : 300))
  const shifted = applyShift(intervals, plan())
  expect(totalKwh(shifted.intervals)).toBeCloseTo(totalKwh(intervals), 9)
  expect(shifted.movedKwh).toBeCloseTo(8, 6)
  expect(shifted.addedKwh).toBeCloseTo(8, 6)
})

it('pays back rebound energy and round-trip losses instead of deleting them', () => {
  const intervals = series(96, (hour) => (hour === 18 || hour === 19 ? 2000 : 300))
  const shifted = applyShift(intervals, plan({ efficiency: 0.9, reboundFactor: 0.2 }))
  // 8 kWh delivered costs 8 * 1.2 / 0.9 = 10.67 kWh at the new time.
  expect(shifted.addedKwh).toBeCloseTo(10.667, 2)
  expect(totalKwh(shifted.intervals)).toBeCloseTo(totalKwh(intervals) + (shifted.addedKwh - shifted.movedKwh), 6)
})

it('clamps the target window to the asset power limit', () => {
  const intervals = series(96, (hour) => (hour === 18 || hour === 19 ? 8000 : 300))
  const shifted = applyShift(intervals, plan({ kwhPerDay: 30, maxKw: 3 }))
  expect(shifted.capacityLimited).toBe(true)
  // Two hours at 3 kW, minus what already sits there.
  expect(shifted.movedKwh).toBeLessThanOrEqual(6)
  const target = shifted.intervals.filter((entry) => [2, 3].includes(localHour(entry.ts)))
  for (const entry of target) expect(entry.kwh * 4).toBeLessThanOrEqual(3.01)
})

it('cannot move more energy than the source window holds', () => {
  const intervals = series(96, (hour) => (hour === 18 || hour === 19 ? 250 : 300))
  const shifted = applyShift(intervals, plan({ kwhPerDay: 40 }))
  expect(shifted.movedKwh).toBeCloseTo(2, 6)
  for (const entry of shifted.intervals) expect(entry.kwh).toBeGreaterThanOrEqual(0)
})

it('lands the saving inside the do-nothing floor and the perfect-shifting ceiling', () => {
  const result = simulateShift(typicalHouseholdIntervals(7), CURVE, plan({ fromHours: [18], toHours: [2, 3] }), STATIC)
  expect(result.withinBand).toBe(true)
  expect(result.savingVsStaticPct).toBeGreaterThanOrEqual(result.band.floorPct)
  expect(result.savingVsStaticPct).toBeLessThanOrEqual(result.band.ceilingPct)
  expect(result.band.ceilingPct).toBeGreaterThan(result.band.floorPct)
})

it('reports a negative saving rather than flipping its sign', () => {
  const intervals = series(96, (hour) => (hour === 3 ? 4000 : 200))
  const result = simulateShift(intervals, CURVE, plan({ fromHours: [3], toHours: [17], label: 'Moved onto the peak' }), STATIC)
  expect(result.scenarioDynamicChf).toBeGreaterThan(result.doNothingDynamicChf)
  expect(result.withinBand).toBe(false)
  expect(result.assumptions.join(' ')).toContain('should not be shown to a customer')
})

it('always states the energy moved, the rebound, and the period', () => {
  const result = simulateShift(typicalHouseholdIntervals(3), CURVE, plan({ fromHours: [18] }), STATIC)
  expect(result.assumptions.join(' ')).toMatch(/Energy is conserved/)
  expect(result.assumptions.join(' ')).toMatch(/Not annualised/)
  expect(result.confidence).toBe('low')
  expect(result.comfortImpact).toBe('None')
  expect(result.savingRangeChf[0]).toBeLessThanOrEqual(result.savingRangeChf[1])
})

it('lowers the evening peak when load moves out of it', () => {
  const result = simulateShift(typicalHouseholdIntervals(3), CURVE, plan({ fromHours: [18], maxKw: 4 }), STATIC)
  expect(result.peakKwDelta).toBeLessThan(0)
})

it('scales the price spread without moving the average price', () => {
  const stressed = scaleSpread(CURVE, 0.7)
  expect(meanPrice(stressed)).toBeCloseTo(meanPrice(CURVE), 9)
  expect(Math.max(...stressed) - Math.min(...stressed)).toBeCloseTo(0.07, 3)
  const flatIntervals = series(96, () => 400)
  expect(dynamicCostChf(flatIntervals, stressed)).toBeCloseTo(dynamicCostChf(flatIntervals, CURVE), 6)
})

it('rejects impossible plans instead of simulating them', () => {
  expect(() => assertShiftPlan(plan({ fromHours: [] }))).toThrow()
  expect(() => assertShiftPlan(plan({ toHours: [24] }))).toThrow()
  expect(() => assertShiftPlan(plan({ fromHours: [2], toHours: [2] }))).toThrow()
  expect(() => assertShiftPlan(plan({ kwhPerDay: 0 }))).toThrow()
  expect(() => assertShiftPlan(plan({ maxKw: -1 }))).toThrow()
  expect(() => assertShiftPlan(plan({ efficiency: 1.4 }))).toThrow()
  expect(() => assertShiftPlan(plan({ reboundFactor: -0.1 }))).toThrow()
})
