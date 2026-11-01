/** Unit conversion and Swiss formatting. The data boundary converts once; the rest of the app never sees Wh. */

/** The semantic model stores interval energy in Wh at 15-minute grain. */
export const MINUTES_PER_INTERVAL = 15
export const INTERVALS_PER_HOUR = 60 / MINUTES_PER_INTERVAL
export const INTERVALS_PER_DAY = 24 * INTERVALS_PER_HOUR
const WH_PER_KWH = 1000
/** Average power over a 15-minute interval: kW = Wh / 250. */
const WH_PER_INTERVAL_PER_KW = WH_PER_KWH / INTERVALS_PER_HOUR

export function kwhFromWh(wh: number): number {
  return finite(wh, 'energy') / WH_PER_KWH
}

export function whFromKwh(kwh: number): number {
  return finite(kwh, 'energy') * WH_PER_KWH
}

export function kwFromIntervalWh(wh: number): number {
  return finite(wh, 'energy') / WH_PER_INTERVAL_PER_KW
}

export function intervalWhFromKw(kw: number): number {
  return finite(kw, 'power') * WH_PER_INTERVAL_PER_KW
}

export function rappenPerKwh(chfPerKwh: number): number {
  return finite(chfPerKwh, 'price') * 100
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(finite(value, 'value') * factor) / factor
}

/** Swiss thousands separator, e.g. 1'440. */
export function swissNumber(value: number, digits = 0): string {
  const text = Math.abs(finite(value, 'value')).toFixed(digits)
  const [whole, fraction] = text.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2019')
  return `${value < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`
}

export function formatChf(chf: number, digits = 0): string {
  return `CHF ${swissNumber(chf, digits)}`
}

export function formatRappen(chfPerKwh: number): string {
  return `${swissNumber(rappenPerKwh(chfPerKwh), 1)} Rp./kWh`
}

export function formatKwh(kwh: number, digits = 1): string {
  return `${swissNumber(kwh, digits)} kWh`
}

export function formatKw(kw: number, digits = 2): string {
  return `${swissNumber(kw, digits)} kW`
}

export function formatPct(pct: number, digits = 1): string {
  return `${pct > 0 ? '+' : ''}${swissNumber(pct, digits)}%`
}

/** 24-hour clock, Swiss convention. */
export function formatHour(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('An hour must be an integer between 0 and 23.')
  return `${String(hour).padStart(2, '0')}:00`
}

function finite(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Expected a finite ${label} value.`)
  return value
}
