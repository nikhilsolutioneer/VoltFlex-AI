/** Flexibility profiling: turn an interval series into what can move, when, and for how long. Pure functions only. */
import { localHour, NOT_IN_MODEL } from './model'
import {
  assertIntervals, assertPriceCurve, byLocalDay, completenessPct, hourlyKwh,
  type Interval, peakHour, peakKw, type PriceCurve, priceAlignment, totalKwh,
} from './tariff'
import { INTERVALS_PER_HOUR, round } from './units'

export type Confidence = 'measured' | 'high' | 'medium' | 'low'
export type AssetType = 'ev' | 'water-heating' | 'appliance' | 'unclassified'

export interface LoadBlock {
  readonly startTs: string
  readonly startHour: number
  readonly durationH: number
  readonly avgKw: number
  readonly kwh: number
  /** Energy above the baseload, i.e. the part that could actually move. */
  readonly excessKwh: number
  readonly type: AssetType
}

export interface InferredAsset {
  readonly type: AssetType
  readonly confidence: Confidence
  readonly kw: number
  readonly kwhPerDay: number
  readonly shiftWindowH: number
  readonly reboundFactor: number
  readonly constraint: string
  readonly blockCount: number
}

export interface FlexProfile {
  readonly days: number
  readonly intervals: number
  readonly completenessPct: number
  readonly totalKwh: number
  readonly dailyKwh: number
  readonly baseloadKw: number
  readonly peakKw: number
  readonly peakHour: number
  readonly hourlyKwh: readonly number[]
  /** Positive: load already leans into cheap hours. Negative: it sits on the expensive ones. */
  readonly alignmentPct: number
  readonly blocks: readonly LoadBlock[]
  readonly assets: readonly InferredAsset[]
  readonly shiftableKwhPerDay: number
  readonly flexibleSharePct: number
  readonly flexibilityScore: number
  readonly scoreInputs: Readonly<Record<string, number>>
  readonly assumptions: readonly string[]
  readonly confidence: Confidence
  readonly warnings: readonly string[]
}

/** Cold-start planning defaults. Replaced by measured values whenever real data exists. */
const ASSET_LIBRARY: Record<Exclude<AssetType, 'unclassified'>, {
  minKw: number; maxKw: number; minH: number; maxH: number
  shiftWindowH: number; reboundFactor: number; constraint: string
}> = {
  ev: {
    minKw: 3.3, maxKw: 22, minH: 1, maxH: 12,
    shiftWindowH: 10, reboundFactor: 0,
    constraint: 'Ready by the usual departure time, with your minimum state of charge kept',
  },
  'water-heating': {
    minKw: 1.8, maxKw: 6, minH: 0.5, maxH: 3,
    shiftWindowH: 8, reboundFactor: 0,
    constraint: 'Hot water at the usual times; the legionella cycle stays untouched',
  },
  appliance: {
    minKw: 1, maxKw: 3.5, minH: 0.5, maxH: 2.5,
    shiftWindowH: 6, reboundFactor: 0,
    constraint: 'Programme finishes before you need it',
  },
}

const FLEXIBLE_TYPES: readonly AssetType[] = ['ev', 'water-heating', 'appliance']

export function buildProfile(intervals: readonly Interval[], curve: PriceCurve): FlexProfile {
  assertIntervals(intervals)
  assertPriceCurve(curve)
  const days = byLocalDay(intervals)
  const energy = totalKwh(intervals)
  const warnings: string[] = []
  if (energy <= 0) throw new Error('This meter recorded no consumption for the period, so there is nothing to profile.')

  const coverage = completenessPct(intervals)
  if (coverage < 90) warnings.push(`Only ${round(coverage, 0)}% of the expected 15-minute readings are present for this period.`)

  const baseloadKw = averageDailyBaseloadKw(intervals)
  const blocks = detectBlocks(intervals, baseloadKw)
  const assets = summariseAssets(blocks, days.size)
  const shiftableKwhPerDay = assets.reduce((sum, asset) => sum + asset.kwhPerDay, 0)
  const dailyKwh = energy / days.size
  const flexibleShare = Math.min(1, shiftableKwhPerDay / dailyKwh)
  const shiftWindowH = energyWeightedShiftWindowH(assets)

  // Neither controllability nor on-site storage is measurable in this model, so both inputs stay at zero.
  const scoreInputs = {
    flexibleShare: round(flexibleShare, 3),
    shiftWindowH: round(shiftWindowH, 1),
    controllableShare: 0,
    pvOrBatteryKwh: 0,
  }
  const flexibilityScore = Math.round(
    40 * Math.min(1, scoreInputs.flexibleShare / 0.4)
    + 25 * Math.min(1, scoreInputs.shiftWindowH / 8)
    + 20 * Math.min(1, scoreInputs.controllableShare)
    + 15 * Math.min(1, scoreInputs.pvOrBatteryKwh / 10),
  )

  const assumptions = [
    `Period: ${days.size} local day(s), ${intervals.length} intervals at 15 minutes, Europe/Zurich.`,
    'Baseload is the 10th percentile of each day\u2019s 15-minute values, averaged over the days.',
    'Appliance attribution is inferred from the shape of the load curve. There is no submetering in this data.',
    `Not measured here: ${NOT_IN_MODEL.join(', ')}.`,
    'Controllability and on-site storage score zero because this model cannot observe them.',
  ]
  if (!assets.length) assumptions.push('No shiftable block was detected, so the flexible share is zero rather than estimated.')

  return {
    days: days.size,
    intervals: intervals.length,
    completenessPct: round(coverage, 1),
    totalKwh: round(energy, 1),
    dailyKwh: round(dailyKwh, 1),
    baseloadKw: round(baseloadKw, 2),
    peakKw: round(peakKw(intervals), 2),
    peakHour: peakHour(intervals),
    hourlyKwh: hourlyKwh(intervals).map((value) => round(value, 2)),
    alignmentPct: round(priceAlignment(intervals, curve) * 100, 1),
    blocks,
    assets,
    shiftableKwhPerDay: round(shiftableKwhPerDay, 2),
    flexibleSharePct: round(flexibleShare * 100, 1),
    flexibilityScore,
    scoreInputs,
    assumptions,
    confidence: assets.length ? 'low' : 'medium',
    warnings,
  }
}

/** Mean over local days of each day's 10th-percentile interval power. */
export function averageDailyBaseloadKw(intervals: readonly Interval[]): number {
  const days = byLocalDay(intervals)
  let sum = 0
  for (const [, dayIntervals] of days) sum += percentile(dayIntervals.map(intervalKw), 0.1)
  return sum / days.size
}

export function percentile(values: readonly number[], fraction: number): number {
  if (!values.length) throw new Error('A percentile needs at least one value.')
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))
  return sorted[index]
}

/** Step-change detection on the 15-minute series: contiguous runs sitting clearly above the baseload. */
export function detectBlocks(intervals: readonly Interval[], baseloadKw: number): LoadBlock[] {
  const thresholdKw = baseloadKw + 1
  const sorted = [...intervals].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
  const blocks: LoadBlock[] = []
  let run: Interval[] = []

  const close = () => {
    if (run.length >= 2) {
      const durationH = run.length / INTERVALS_PER_HOUR
      const kwh = totalKwh(run)
      const avgKw = kwh / durationH
      const excessKwh = Math.max(0, kwh - baseloadKw * durationH)
      blocks.push({
        startTs: run[0].ts, startHour: localHour(run[0].ts),
        durationH: round(durationH, 2), avgKw: round(avgKw, 2),
        kwh: round(kwh, 2), excessKwh: round(excessKwh, 2),
        type: classify(avgKw, durationH, localHour(run[0].ts)),
      })
    }
    run = []
  }

  for (const entry of sorted) {
    if (intervalKw(entry) >= thresholdKw) run.push(entry)
    else close()
  }
  close()
  return blocks
}

export function classify(avgKw: number, durationH: number, startHour: number): AssetType {
  const ev = ASSET_LIBRARY.ev
  const overnight = startHour >= 17 || startHour <= 7
  if (avgKw >= ev.minKw && avgKw <= ev.maxKw && durationH >= ev.minH && overnight) return 'ev'
  const water = ASSET_LIBRARY['water-heating']
  if (avgKw >= water.minKw && avgKw <= water.maxKw && durationH >= water.minH && durationH <= water.maxH) return 'water-heating'
  const appliance = ASSET_LIBRARY.appliance
  if (avgKw >= appliance.minKw && avgKw <= appliance.maxKw && durationH <= appliance.maxH) return 'appliance'
  return 'unclassified'
}

function summariseAssets(blocks: readonly LoadBlock[], days: number): InferredAsset[] {
  return FLEXIBLE_TYPES.flatMap((type) => {
    if (type === 'unclassified') return []
    const matching = blocks.filter((block) => block.type === type)
    if (!matching.length) return []
    const library = ASSET_LIBRARY[type as Exclude<AssetType, 'unclassified'>]
    return [{
      type,
      // Without submetering an asset claim is always an inference, never a measurement.
      confidence: 'low' as Confidence,
      kw: round(Math.max(...matching.map((block) => block.avgKw)), 2),
      kwhPerDay: round(matching.reduce((sum, block) => sum + block.excessKwh, 0) / days, 2),
      shiftWindowH: library.shiftWindowH,
      reboundFactor: library.reboundFactor,
      constraint: library.constraint,
      blockCount: matching.length,
    }]
  })
}

function energyWeightedShiftWindowH(assets: readonly InferredAsset[]): number {
  const energy = assets.reduce((sum, asset) => sum + asset.kwhPerDay, 0)
  if (energy <= 0) return 0
  return assets.reduce((sum, asset) => sum + asset.shiftWindowH * asset.kwhPerDay, 0) / energy
}

function intervalKw(entry: Interval): number {
  return entry.kwh * INTERVALS_PER_HOUR
}
