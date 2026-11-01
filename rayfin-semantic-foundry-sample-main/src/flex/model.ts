/**
 * Verified facts about the deployed semantic model.
 * Source: .github/skills/fabric-flex-data/references/semantic-model.md — re-verify after a model refresh.
 */

export const MODEL_FIELDS = {
  intervalEnergyWh: 'consumption_Wh',
  intervalTimestamp: 'datetime',
  dateKey: 'ConsumptionDate',
  timeKey: 'ConsumptionTime',
  customerId: 'CustomerId',
  /** Misspelled in the model itself; queries fail silently against the corrected spelling. */
  totalEnergyWh: 'TotalConsumtion_Wh',
  /** Named "PerWh" but the value is CHF per kWh. Do not divide by 1000. */
  staticPrice: 'FixPricePerWh',
  costStatic: 'CostStaticPrice',
  costDynamic: 'CostByDynamicPrice',
  costLowest: 'CostByLowestPrice',
  savingsDynamicPct: 'SavingsDynamic_Pct',
  savingsLowestPct: 'SavingsLowest_Pct',
} as const

export const TIME_ZONE = 'Europe/Zurich'

export const DATASET_FACTS = {
  period: 'one winter month',
  resolutionMinutes: 15,
  customers: 144,
  staticPriceChfPerKwh: 0.23,
  meanDynamicPriceChfPerKwh: 0.217,
  cheapestHour: 3,
  cheapestHourChfPerKwh: 0.196,
  priciestHour: 17,
  priciestHourChfPerKwh: 0.296,
  spreadChfPerKwh: 0.1,
  meanCustomerKwhForPeriod: 1440,
} as const

/**
 * The band every simulated saving must land inside, as a percentage of the static-price bill.
 * Floor: switch tariff, change nothing. Ceiling: perfect, physically impossible shifting.
 */
export const SAVINGS_BAND_PCT = { floor: -5, ceiling: 17 } as const

/**
 * Indicative hourly price shape (CHF/kWh, Europe/Zurich local hour), fitted to the documented
 * anchors: min 03:00, max 17:00, mean ~0.217, spread ~10 Rp./kWh. Not a per-interval measurement.
 */
export const REFERENCE_PRICE_CURVE_CHF_PER_KWH: readonly number[] = [
  0.203, 0.200, 0.197, 0.196, 0.199, 0.205,
  0.208, 0.218, 0.222, 0.216, 0.210, 0.206,
  0.202, 0.198, 0.200, 0.204, 0.232, 0.296,
  0.275, 0.252, 0.232, 0.220, 0.212, 0.204,
]

/**
 * Indicative average load shape across all customers (Wh per 15-minute interval, local hour),
 * fitted to the documented anchors: trough ~403 Wh at 03:00, peaks ~651 Wh at 11:00 and ~588 Wh at 17:00.
 */
export const REFERENCE_LOAD_SHAPE_WH: readonly number[] = [
  470, 435, 412, 403, 408, 425,
  470, 540, 590, 620, 640, 651,
  645, 610, 575, 555, 565, 588,
  580, 565, 555, 540, 520, 495,
]

/** What the model does not contain. Any question touching these gets "not measured", never a substitute figure. */
export const NOT_IN_MODEL: readonly string[] = [
  'CO2 intensity', 'outside temperature', 'PV production', 'grid or feeder load',
  'asset registry or submetering', 'HT/NT or capacity tariff', 'summer or annual behaviour',
]

const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' })
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

function instant(ts: string): number {
  const time = Date.parse(ts)
  if (!Number.isFinite(time)) throw new Error('Interval timestamps must be ISO 8601 instants.')
  return time
}

/** Local hour 0-23. DST-safe: derived from the time zone, never from a fixed offset. */
export function localHour(ts: string): number {
  return Number(hourFormat.format(instant(ts)))
}

/** Local calendar day key, e.g. 2026-01-17. Tolerates 23- and 25-hour DST days. */
export function localDayKey(ts: string): string {
  return dayFormat.format(instant(ts))
}
