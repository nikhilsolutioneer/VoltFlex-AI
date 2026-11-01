/** Data boundary. Wh becomes kWh here, exactly once, and nothing downstream ever sees a raw model row. */
import { modelConnection, readModel } from '../semanticModel'
import { localHour, MODEL_FIELDS, REFERENCE_LOAD_SHAPE_WH } from './model'
import type { Interval } from './tariff'
import type { DataSource } from './skills'
import { INTERVALS_PER_HOUR, kwhFromWh, MINUTES_PER_INTERVAL } from './units'

/** One local day of 15-minute readings; the portal-brokered read is capped at 100 rows. */
const READ_LIMIT = 96

export interface FlexDataset {
  readonly intervals: readonly Interval[]
  readonly source: DataSource
  readonly note: string
}

export async function loadDataset(signal?: AbortSignal): Promise<FlexDataset> {
  const model = modelConnection
  const hasFields = model?.columns.some((column) => column.name === MODEL_FIELDS.intervalEnergyWh)
    && model.columns.some((column) => column.name === MODEL_FIELDS.intervalTimestamp)
  if (!model || !hasFields) return typicalHouseholdDataset('The deployed model does not expose 15-minute readings, so these figures are estimates.')

  let table
  try {
    table = await readModel(model, [MODEL_FIELDS.intervalTimestamp, MODEL_FIELDS.intervalEnergyWh], READ_LIMIT)
  } catch {
    // A failed read degrades to the labelled estimate; it never drops the customer into an error message.
    return typicalHouseholdDataset('Your readings are not available right now, so these figures are estimates.')
  }
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  const intervals = parseIntervals(table.columns.map((column) => column.name), table.rows)
  if (intervals.length < INTERVALS_PER_HOUR * 4) {
    return typicalHouseholdDataset('Too few readings came back to profile a real day, so these figures are estimates.')
  }
  return { intervals, source: 'semantic-model', note: `From your meter: ${intervals.length} readings at ${MINUTES_PER_INTERVAL} minutes.` }
}

/** Narrow the model result before anything uses it; a row is untrusted until every field is checked. */
export function parseIntervals(columns: readonly string[], rows: readonly unknown[][]): Interval[] {
  const tsIndex = columns.indexOf(MODEL_FIELDS.intervalTimestamp)
  const whIndex = columns.indexOf(MODEL_FIELDS.intervalEnergyWh)
  if (tsIndex < 0 || whIndex < 0) return []
  const intervals: Interval[] = []
  for (const row of rows) {
    const ts = toIsoTimestamp(row[tsIndex])
    const wh = toNonNegativeNumber(row[whIndex])
    if (ts && wh !== null) intervals.push({ ts, kwh: kwhFromWh(wh) })
  }
  return intervals.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
}

/**
 * Cold-start estimate: the documented cohort load shape scaled to one dwelling, plus the planning
 * defaults for an EV and a hot-water tank. Every figure derived from this is an estimate, not a measurement.
 */
export function typicalHouseholdDataset(reason: string): FlexDataset {
  return {
    intervals: typicalHouseholdIntervals(7),
    source: 'typical-household',
    note: `${reason} They describe a typical household in this dataset, not yours.`,
  }
}

const HOUSEHOLD_SCALE = 0.35
const TYPICAL_START = Date.UTC(2026, 0, 12, 23, 0, 0)
/** Planning defaults from the asset flexibility library, not observations. */
const TYPICAL_BLOCKS = [
  { hours: [18], kw: 9.4 },
  { hours: [5, 6], kw: 2.2 },
]

export function typicalHouseholdIntervals(days: number): Interval[] {
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new Error('Generate between 1 and 31 days.')
  const stepMs = MINUTES_PER_INTERVAL * 60_000
  const count = days * 24 * INTERVALS_PER_HOUR
  return Array.from({ length: count }, (_, index) => {
    const ts = new Date(TYPICAL_START + index * stepMs).toISOString()
    const hour = localHour(ts)
    const baseKwh = kwhFromWh(REFERENCE_LOAD_SHAPE_WH[hour] * HOUSEHOLD_SCALE)
    const blockKw = TYPICAL_BLOCKS.filter((block) => block.hours.includes(hour)).reduce((sum, block) => sum + block.kw, 0)
    return { ts, kwh: baseKwh + blockKw / INTERVALS_PER_HOUR }
  })
}

function toIsoTimestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  if (typeof value !== 'string' || value.length > 64) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function toNonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
