/** Scenario simulation. Energy is conserved, physics and comfort are clamped, and every saving is bounded by the model's own floor and ceiling. */
import { DATASET_FACTS, localHour } from './model'
import type { AssetType } from './profile'
import {
  assertIntervals, assertPriceCurve, byLocalDay, dynamicCostChf, type Interval,
  lowestPriceCostChf, meanPrice, peakKw, type PriceCurve, staticCostChf, totalKwh,
} from './tariff'
import { INTERVALS_PER_HOUR, round } from './units'

export interface ShiftPlan {
  readonly label: string
  readonly assetType: AssetType
  /** Europe/Zurich local hours the load moves out of. */
  readonly fromHours: readonly number[]
  /** Europe/Zurich local hours the load moves into. */
  readonly toHours: readonly number[]
  readonly kwhPerDay: number
  readonly maxKw: number
  /** Round-trip efficiency, 0 < e <= 1. Below 1 means more energy is consumed than delivered. */
  readonly efficiency: number
  /** Extra energy that must be paid back later. Near 1 for thermal loads, 0 for an EV. */
  readonly reboundFactor: number
  readonly comfortImpact: string
}

export interface SimulationResult {
  readonly scenario: string
  readonly days: number
  readonly baselineStaticChf: number
  readonly doNothingDynamicChf: number
  readonly scenarioDynamicChf: number
  readonly theoreticalFloorChf: number
  readonly savingChf: number
  readonly savingPerMonthChf: number
  readonly savingVsStaticPct: number
  readonly savingRangeChf: readonly [number, number]
  readonly shiftedKwhPerDay: number
  readonly addedKwhPerDay: number
  readonly peakKwDelta: number
  readonly comfortImpact: string
  readonly band: { readonly floorPct: number; readonly ceilingPct: number }
  readonly withinBand: boolean
  readonly assumptions: readonly string[]
  readonly confidence: 'low' | 'medium' | 'high'
}

export function assertShiftPlan(plan: ShiftPlan): ShiftPlan {
  if (!plan.fromHours.length || !plan.toHours.length) throw new Error('A shift needs a source and a target window.')
  if ([...plan.fromHours, ...plan.toHours].some((hour) => !Number.isInteger(hour) || hour < 0 || hour > 23)) {
    throw new Error('Shift windows are whole local hours between 0 and 23.')
  }
  if (plan.fromHours.some((hour) => plan.toHours.includes(hour))) throw new Error('A shift cannot move load into its own source window.')
  if (!(plan.kwhPerDay > 0)) throw new Error('A shift needs a positive amount of energy to move.')
  if (!(plan.maxKw > 0)) throw new Error('A shift needs a positive power limit.')
  if (!(plan.efficiency > 0 && plan.efficiency <= 1)) throw new Error('Round-trip efficiency must be above 0 and at most 1.')
  if (!(plan.reboundFactor >= 0 && plan.reboundFactor <= 2)) throw new Error('The rebound factor must be between 0 and 2.')
  return plan
}

/** Move energy between windows on every local day, conserving energy and respecting the power cap. */
export function applyShift(intervals: readonly Interval[], plan: ShiftPlan): {
  intervals: Interval[]
  movedKwh: number
  addedKwh: number
  capacityLimited: boolean
} {
  assertIntervals(intervals)
  assertShiftPlan(plan)
  const capKwhPerInterval = plan.maxKw / INTERVALS_PER_HOUR
  const result = new Map<string, number>()
  let movedKwh = 0
  let addedKwh = 0
  let capacityLimited = false

  for (const [, dayIntervals] of byLocalDay(intervals)) {
    const source = dayIntervals.filter((entry) => plan.fromHours.includes(localHour(entry.ts)))
    const target = dayIntervals.filter((entry) => plan.toHours.includes(localHour(entry.ts)))
    for (const entry of dayIntervals) result.set(entry.ts, entry.kwh)
    if (!source.length || !target.length) continue

    const availableKwh = totalKwh(source)
    const headroomKwh = target.reduce((sum, entry) => sum + Math.max(0, capKwhPerInterval - entry.kwh), 0)
    const perMoved = (1 + plan.reboundFactor) / plan.efficiency
    const wantedKwh = Math.min(plan.kwhPerDay, availableKwh)
    const dayMovedKwh = Math.min(wantedKwh, headroomKwh / perMoved)
    if (dayMovedKwh < wantedKwh - 1e-9) capacityLimited = true
    if (dayMovedKwh <= 0) continue

    const dayAddedKwh = dayMovedKwh * perMoved
    for (const entry of source) result.set(entry.ts, entry.kwh - dayMovedKwh * (entry.kwh / availableKwh))
    let remaining = dayAddedKwh
    for (const entry of target) {
      if (remaining <= 0) break
      const room = Math.max(0, capKwhPerInterval - entry.kwh)
      const fill = Math.min(room, remaining)
      result.set(entry.ts, (result.get(entry.ts) ?? entry.kwh) + fill)
      remaining -= fill
    }
    movedKwh += dayMovedKwh
    addedKwh += dayAddedKwh
  }

  return {
    intervals: intervals.map((entry) => ({ ts: entry.ts, kwh: Math.max(0, result.get(entry.ts) ?? entry.kwh) })),
    movedKwh, addedKwh, capacityLimited,
  }
}

export function simulateShift(
  intervals: readonly Interval[],
  curve: PriceCurve,
  plan: ShiftPlan,
  staticPriceChfPerKwh: number,
): SimulationResult {
  assertIntervals(intervals)
  assertPriceCurve(curve)
  assertShiftPlan(plan)
  const days = byLocalDay(intervals).size
  const baselineStaticChf = staticCostChf(intervals, staticPriceChfPerKwh)
  const doNothingDynamicChf = dynamicCostChf(intervals, curve)
  const theoreticalFloorChf = lowestPriceCostChf(intervals, curve)
  const shifted = applyShift(intervals, plan)
  const scenarioDynamicChf = dynamicCostChf(shifted.intervals, curve)

  const savingChf = baselineStaticChf - scenarioDynamicChf
  const savingVsStaticPct = (savingChf / baselineStaticChf) * 100
  const band = {
    floorPct: round(((baselineStaticChf - doNothingDynamicChf) / baselineStaticChf) * 100, 1),
    ceilingPct: round(((baselineStaticChf - theoreticalFloorChf) / baselineStaticChf) * 100, 1),
  }
  const withinBand = savingVsStaticPct >= band.floorPct - 1e-6 && savingVsStaticPct <= band.ceilingPct + 1e-6

  const stressed = stressSavings(intervals, curve, plan, staticPriceChfPerKwh)
  const assumptions = [
    `${round(shifted.movedKwh / days, 2)} kWh/day moved from ${windowText(plan.fromHours)} to ${windowText(plan.toHours)}, capped at ${plan.maxKw} kW.`,
    `Energy is conserved: ${round(shifted.addedKwh / days, 2)} kWh/day reappears in the target window (efficiency ${plan.efficiency}, rebound ${plan.reboundFactor}).`,
    `Priced against an indicative hourly curve for one winter month, and a static reference of ${staticPriceChfPerKwh} CHF/kWh.`,
    `Range covers \u00b130% on the price spread and \u00b120% on the energy moved.`,
    `Period is ${days} day(s). Not annualised — the source data covers ${DATASET_FACTS.period} only.`,
  ]
  if (shifted.capacityLimited) assumptions.push('The target window filled up, so less energy moved than planned.')
  if (!withinBand) assumptions.push('This result fell outside the do-nothing / perfect-shifting band and should not be shown to a customer.')

  return {
    scenario: plan.label,
    days,
    baselineStaticChf: round(baselineStaticChf, 2),
    doNothingDynamicChf: round(doNothingDynamicChf, 2),
    scenarioDynamicChf: round(scenarioDynamicChf, 2),
    theoreticalFloorChf: round(theoreticalFloorChf, 2),
    savingChf: round(savingChf, 2),
    savingPerMonthChf: round((savingChf / days) * 30, 2),
    savingVsStaticPct: round(savingVsStaticPct, 2),
    savingRangeChf: stressed,
    shiftedKwhPerDay: round(shifted.movedKwh / days, 2),
    addedKwhPerDay: round(shifted.addedKwh / days, 2),
    peakKwDelta: round(peakKw(shifted.intervals) - peakKw(intervals), 2),
    comfortImpact: plan.comfortImpact,
    band,
    withinBand,
    assumptions,
    // Every asset here is inferred from the load curve, so a simulation built on one can never be high.
    confidence: 'low',
  }
}

/** Scale a price curve's spread about its mean, keeping the average price unchanged. */
export function scaleSpread(curve: PriceCurve, factor: number): PriceCurve {
  const mean = meanPrice(curve)
  return curve.map((price) => Math.max(0, mean + (price - mean) * factor))
}

function stressSavings(
  intervals: readonly Interval[],
  curve: PriceCurve,
  plan: ShiftPlan,
  staticPriceChfPerKwh: number,
): [number, number] {
  const baselineStaticChf = staticCostChf(intervals, staticPriceChfPerKwh)
  const savings: number[] = []
  for (const spread of [0.7, 1.3]) {
    for (const energy of [0.8, 1.2]) {
      const stressedCurve = scaleSpread(curve, spread)
      const stressedPlan = { ...plan, kwhPerDay: plan.kwhPerDay * energy }
      const shifted = applyShift(intervals, stressedPlan)
      savings.push(baselineStaticChf - dynamicCostChf(shifted.intervals, stressedCurve))
    }
  }
  return [round(Math.min(...savings), 2), round(Math.max(...savings), 2)]
}

function windowText(hours: readonly number[]): string {
  const sorted = [...hours].sort((a, b) => a - b)
  const pad = (hour: number) => String(hour).padStart(2, '0')
  return `${pad(sorted[0])}:00\u2013${pad((sorted[sorted.length - 1] + 1) % 24)}:00`
}
