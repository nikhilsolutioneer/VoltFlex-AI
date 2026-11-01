/** Ranked, comfort-constrained next actions. Nothing is recommended that has not been simulated first. */
import { DATASET_FACTS } from './model'
import type { AssetType, FlexProfile } from './profile'
import { type SimulationResult, type ShiftPlan, simulateShift } from './simulate'
import { assertPriceCurve, dynamicCostChf, type Interval, type PriceCurve, staticCostChf } from './tariff'
import { formatHour, round } from './units'

export type Tier = 'free-today' | 'settings' | 'contract' | 'investment'
export type Effort = 'automated-once' | 'weekly-habit' | 'daily-manual'
export type ComfortLevel = 'imperceptible' | 'minor' | 'noticeable' | 'unacceptable'

const EFFORT_FACTOR: Record<Effort, number> = { 'automated-once': 1, 'weekly-habit': 0.6, 'daily-manual': 0.3 }
const COMFORT_FACTOR: Record<ComfortLevel, number> = { imperceptible: 1, minor: 0.7, noticeable: 0.3, unacceptable: 0 }
const CONFIDENCE_FACTOR = { low: 0.3, medium: 0.6, high: 0.8, measured: 1 } as const
/** Inferred assets and one month of data do not support three significant figures. */
const UNCERTAINTY = 0.4

export interface Recommendation {
  readonly id: string
  readonly action: string
  readonly tier: Tier
  readonly valueChfPerMonth: number
  readonly valueChfPerYear: number
  readonly valueRangeChfPerYear: readonly [number, number]
  readonly comfortCost: string
  readonly comfortLevel: ComfortLevel
  readonly effort: string
  readonly whyItWorks: string
  readonly howToVerify: string
  readonly score: number
  readonly confidence: 'low' | 'medium' | 'high'
  readonly assumptions: readonly string[]
  readonly simulation: SimulationResult
}

export interface RecommendOptions {
  /** Hardware the customer does not own is only proposed when they asked about investing. */
  readonly includeInvestments?: boolean
  /** Anti-herding: spreads recommended start times across customers instead of stacking them on one hour. */
  readonly jitterSeed?: number
  readonly staticPriceChfPerKwh?: number
}

/** The N consecutive local hours with the lowest average price, wrapping across midnight. */
export function cheapestWindow(curve: PriceCurve, hours: number): number[] {
  assertPriceCurve(curve)
  if (!Number.isInteger(hours) || hours < 1 || hours > 12) throw new Error('A price window is 1 to 12 whole hours.')
  let best = { start: 0, average: Number.POSITIVE_INFINITY }
  for (let start = 0; start < 24; start += 1) {
    const window = Array.from({ length: hours }, (_, offset) => curve[(start + offset) % 24])
    const average = window.reduce((sum, price) => sum + price, 0) / hours
    if (average < best.average) best = { start, average }
  }
  return Array.from({ length: hours }, (_, offset) => (best.start + offset) % 24)
}

/** The hours where this asset's blocks actually run today. */
export function observedHours(profile: FlexProfile, type: AssetType): number[] {
  const hours = new Set<number>()
  for (const block of profile.blocks) {
    if (block.type !== type) continue
    for (let offset = 0; offset < Math.max(1, Math.round(block.durationH)); offset += 1) {
      hours.add((block.startHour + offset) % 24)
    }
  }
  return [...hours].sort((a, b) => a - b)
}

const ASSET_COPY: Record<Exclude<AssetType, 'unclassified'>, {
  action: (window: readonly number[]) => string
  comfortCost: string
  comfortLevel: ComfortLevel
  effort: string
  effortKey: Effort
  howToVerify: string
  windowHours: number
  efficiency: number
  reboundFactor: number
}> = {
  ev: {
    action: (window) => `Set your charger to start at ${formatHour(window[0])} instead of on plug-in`,
    comfortCost: 'None, as long as the car is plugged in overnight and ready at your usual departure time',
    comfortLevel: 'imperceptible',
    effort: 'One setting in the charger app, once, reversible any time',
    effortKey: 'automated-once',
    howToVerify: 'Compare next month\u2019s bill, or come back and I\u2019ll re-run this on your new data',
    windowHours: 4, efficiency: 1, reboundFactor: 0,
  },
  'water-heating': {
    action: (window) => `Move your hot water heating to start at ${formatHour(window[0])}`,
    comfortCost: 'None expected: the tank stays hot until morning. The legionella cycle is not touched',
    comfortLevel: 'minor',
    effort: 'One timer setting on the boiler, or ask your electrician if it is on utility ripple control',
    effortKey: 'automated-once',
    howToVerify: 'Check that your hot water is still there at the usual times, then compare the bill',
    windowHours: 3, efficiency: 1, reboundFactor: 0.05,
  },
  appliance: {
    action: (window) => `Start the dishwasher and washing machine with a timer at ${formatHour(window[0])}`,
    comfortCost: 'The programme finishes overnight instead of in the evening',
    comfortLevel: 'minor',
    effort: 'The delay-start button, each time you load it',
    effortKey: 'weekly-habit',
    howToVerify: 'Small on its own \u2014 treat it as practice, and let the bigger loads carry the money',
    windowHours: 3, efficiency: 1, reboundFactor: 0,
  },
}

export function buildCandidatePlans(profile: FlexProfile, curve: PriceCurve, options: RecommendOptions = {}): ShiftPlan[] {
  return profile.assets.flatMap((asset) => {
    if (asset.type === 'unclassified' || asset.kwhPerDay <= 0) return []
    const copy = ASSET_COPY[asset.type]
    const window = jitterWindow(cheapestWindow(curve, copy.windowHours), options.jitterSeed)
    const fromHours = observedHours(profile, asset.type).filter((hour) => !window.includes(hour))
    // Telling someone to do what they already do destroys credibility, so an already-aligned asset is dropped.
    if (!fromHours.length) return []
    return [{
      label: `${labelFor(asset.type)} moved to ${formatHour(window[0])}`,
      assetType: asset.type,
      fromHours,
      toHours: window,
      kwhPerDay: asset.kwhPerDay,
      maxKw: asset.kw,
      efficiency: copy.efficiency,
      reboundFactor: copy.reboundFactor,
      comfortImpact: copy.comfortCost,
    }]
  })
}

export function recommend(
  intervals: readonly Interval[],
  curve: PriceCurve,
  profile: FlexProfile,
  options: RecommendOptions = {},
): Recommendation[] {
  const staticPrice = options.staticPriceChfPerKwh ?? DATASET_FACTS.staticPriceChfPerKwh
  const doNothingDynamicChf = dynamicCostChf(intervals, curve)
  const baselineStaticChf = staticCostChf(intervals, staticPrice)

  const scored = buildCandidatePlans(profile, curve, options).flatMap((plan) => {
    const simulation = simulateShift(intervals, curve, plan, staticPrice)
    if (!simulation.withinBand) return []
    const copy = ASSET_COPY[plan.assetType as Exclude<AssetType, 'unclassified'>]
    if (COMFORT_FACTOR[copy.comfortLevel] === 0) return []

    // The action's own worth is what shifting adds on top of simply switching tariff.
    const monthlyChf = round(((doNothingDynamicChf - simulation.scenarioDynamicChf) / simulation.days) * 30, 2)
    const yearlyChf = round(monthlyChf * 12, 0)
    // An action worth under a franc a year is not worth a customer's attention.
    if (yearlyChf < 1) return []

    return [{
      id: `${plan.assetType}-${plan.toHours[0]}`,
      action: copy.action(plan.toHours),
      tier: 'settings' as Tier,
      valueChfPerMonth: monthlyChf,
      valueChfPerYear: yearlyChf,
      valueRangeChfPerYear: [round(yearlyChf * (1 - UNCERTAINTY), 0), round(yearlyChf * (1 + UNCERTAINTY), 0)] as [number, number],
      comfortCost: copy.comfortCost,
      comfortLevel: copy.comfortLevel,
      effort: copy.effort,
      whyItWorks: `Your ${labelFor(plan.assetType).toLowerCase()} currently runs around ${formatHour(plan.fromHours[0])}. `
        + `Moving it into the cheap window saves about ${round(priceGap(curve, plan) * 100, 1)} Rp. on every kWh.`,
      howToVerify: copy.howToVerify,
      score: round(yearlyChf * EFFORT_FACTOR[copy.effortKey] * COMFORT_FACTOR[copy.comfortLevel] * CONFIDENCE_FACTOR[simulation.confidence], 1),
      confidence: simulation.confidence,
      assumptions: [
        ...simulation.assumptions,
        'The yearly figure extrapolates one winter month. Real seasons differ.',
        `This ${labelFor(plan.assetType).toLowerCase()} is inferred from the shape of your load curve, not measured directly.`,
        'Start times are deliberately spread out: if everyone charges at the cheapest hour, that hour stops being cheap.',
      ],
      simulation,
    }]
  }).sort((a, b) => b.score - a.score)

  // The tariff switch is the reward for shifting, never the first move, so it only appears once the shift pays for it.
  const best = scored[0]
  if (best && best.simulation.scenarioDynamicChf < baselineStaticChf) {
    return [...scored.slice(0, 2), tariffSwitchRecommendation(best, baselineStaticChf)]
  }
  return scored.slice(0, 3)
}

function tariffSwitchRecommendation(best: Recommendation, baselineStaticChf: number): Recommendation {
  const monthlyChf = round(((baselineStaticChf - best.simulation.scenarioDynamicChf) / best.simulation.days) * 30, 2)
  return {
    ...best,
    id: 'tariff-switch',
    action: 'Only after that is running, look at the dynamic tariff',
    tier: 'contract',
    valueChfPerMonth: monthlyChf,
    valueChfPerYear: round(monthlyChf * 12, 0),
    valueRangeChfPerYear: [round(monthlyChf * 12 * 0.6, 0), round(monthlyChf * 12 * 1.4, 0)],
    comfortCost: 'You take on price risk: a dynamic tariff can also move against you',
    comfortLevel: 'minor',
    effort: 'A contract change with your utility, to confirm with them',
    whyItWorks: 'On your current pattern the dynamic tariff would cost you more. With the shift above in place, the numbers turn around.',
    howToVerify: 'Ask your utility to model your last 12 months before signing anything',
    score: 0,
    assumptions: [
      ...best.assumptions,
      'The switch is only worth it once the shift above is actually automated and running.',
    ],
  }
}

function priceGap(curve: PriceCurve, plan: ShiftPlan): number {
  const average = (hours: readonly number[]) => hours.reduce((sum, hour) => sum + curve[hour], 0) / hours.length
  return Math.max(0, average(plan.fromHours) - average(plan.toHours))
}

/** Deterministic per-session offset inside the cheap window; keeps advice stable but customers de-synchronised. */
function jitterWindow(window: number[], seed?: number): number[] {
  if (seed === undefined || window.length < 2) return window
  const offset = Math.abs(Math.trunc(seed)) % window.length
  return [...window.slice(offset), ...window.slice(0, offset)]
}

function labelFor(type: AssetType): string {
  return type === 'ev' ? 'Car charging' : type === 'water-heating' ? 'Hot water' : type === 'appliance' ? 'Appliances' : 'Load'
}
