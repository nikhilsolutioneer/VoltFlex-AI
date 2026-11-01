import { expect, it } from 'vitest'
import { typicalHouseholdIntervals } from './data'
import { localHour, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import { buildProfile } from './profile'
import { buildCandidatePlans, cheapestWindow, observedHours, recommend } from './recommend'
import { type Interval, intervalFromWh } from './tariff'

const CURVE = REFERENCE_PRICE_CURVE_CHF_PER_KWH
const STEP_MS = 15 * 60_000

function household(days = 7) {
  const intervals = typicalHouseholdIntervals(days)
  return { intervals, profile: buildProfile(intervals, CURVE) }
}

function series(count: number, whAt: (hour: number) => number): Interval[] {
  const start = Date.parse('2026-01-12T23:00:00Z')
  return Array.from({ length: count }, (_, index) => {
    const ts = new Date(start + index * STEP_MS).toISOString()
    return intervalFromWh(ts, whAt(localHour(ts)))
  })
}

it('finds the cheapest consecutive window in the price curve', () => {
  expect(cheapestWindow(CURVE, 4)).toEqual([1, 2, 3, 4])
  expect(cheapestWindow(CURVE, 1)).toEqual([3])
  expect(() => cheapestWindow(CURVE, 0)).toThrow()
  expect(() => cheapestWindow(CURVE, 13)).toThrow()
})

it('ranks at most three actions, each with all six fields filled', () => {
  const { intervals, profile } = household()
  const actions = recommend(intervals, CURVE, profile)
  expect(actions.length).toBeGreaterThan(0)
  expect(actions.length).toBeLessThanOrEqual(3)
  for (const action of actions) {
    expect(action.action).toBeTruthy()
    expect(action.valueChfPerMonth).toBeGreaterThan(0)
    expect(action.comfortCost).toBeTruthy()
    expect(action.effort).toBeTruthy()
    expect(action.whyItWorks).toBeTruthy()
    expect(action.howToVerify).toBeTruthy()
  }
})

it('puts the tariff switch last and only once a shift pays for it', () => {
  const { intervals, profile } = household()
  const actions = recommend(intervals, CURVE, profile)
  const switchAction = actions.find((action) => action.id === 'tariff-switch')
  if (switchAction) {
    expect(actions[actions.length - 1].id).toBe('tariff-switch')
    expect(switchAction.tier).toBe('contract')
    expect(switchAction.comfortCost).toMatch(/price risk/)
    expect(actions.filter((action) => action.tier !== 'contract').length).toBeGreaterThan(0)
  }
  expect(actions.filter((action) => action.id === 'tariff-switch').length).toBeLessThanOrEqual(1)
})

it('never recommends moving load that already sits in the cheap window', () => {
  const intervals = series(96 * 3, (hour) => (hour === 2 || hour === 3 ? 3000 : 300))
  const profile = buildProfile(intervals, CURVE)
  expect(observedHours(profile, 'ev').every((hour) => cheapestWindow(CURVE, 4).includes(hour))).toBe(true)
  expect(buildCandidatePlans(profile, CURVE)).toEqual([])
  expect(recommend(intervals, CURVE, profile)).toEqual([])
})

it('says nothing rather than inventing an action when no block is movable', () => {
  const intervals = series(96 * 2, () => 400)
  const profile = buildProfile(intervals, CURVE)
  expect(recommend(intervals, CURVE, profile)).toEqual([])
})

it('spreads recommended start times so customers do not all pile onto one hour', () => {
  const { profile } = household(2)
  const starts = new Set([0, 1, 2, 3].map((seed) => buildCandidatePlans(profile, CURVE, { jitterSeed: seed })[0]?.toHours[0]))
  expect(starts.size).toBeGreaterThan(1)
  for (const start of starts) expect(cheapestWindow(CURVE, 4)).toContain(start)
})

it('carries the inference and extrapolation caveats on every action', () => {
  const { intervals, profile } = household()
  for (const action of recommend(intervals, CURVE, profile)) {
    const assumptions = action.assumptions.join(' ')
    expect(assumptions).toMatch(/inferred from the shape of your load curve/)
    expect(assumptions).toMatch(/extrapolates one winter month/)
    expect(action.valueRangeChfPerYear[0]).toBeLessThan(action.valueChfPerYear)
    expect(action.valueRangeChfPerYear[1]).toBeGreaterThan(action.valueChfPerYear)
  }
})
