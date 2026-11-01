import { expect, it } from 'vitest'
import {
  formatChf, formatHour, formatKw, formatKwh, formatPct, formatRappen,
  intervalWhFromKw, kwFromIntervalWh, kwhFromWh, swissNumber, whFromKwh,
} from './units'

it('converts the model\u2019s Wh at 15-minute grain without a 1000x or 4x error', () => {
  expect(kwhFromWh(651)).toBeCloseTo(0.651, 6)
  expect(whFromKwh(0.651)).toBeCloseTo(651, 6)
  // 403 Wh in a 15-minute interval is the documented 03:00 trough, about 1.6 kW.
  expect(kwFromIntervalWh(403)).toBeCloseTo(1.612, 3)
  expect(kwFromIntervalWh(2500)).toBe(10)
  expect(intervalWhFromKw(10)).toBe(2500)
})

it('rejects non-finite energy instead of silently producing NaN', () => {
  expect(() => kwhFromWh(Number.NaN)).toThrow()
  expect(() => kwFromIntervalWh(Number.POSITIVE_INFINITY)).toThrow()
})

it('formats with Swiss conventions', () => {
  expect(swissNumber(1440)).toBe('1\u2019440')
  expect(swissNumber(-1234567, 1)).toBe('-1\u2019234\u2019567.0')
  expect(formatChf(187.43)).toBe('CHF 187')
  expect(formatKwh(1440.25)).toBe('1\u2019440.3 kWh')
  expect(formatKw(2.345)).toBe('2.35 kW')
  expect(formatPct(-5)).toBe('-5.0%')
  expect(formatPct(17)).toBe('+17.0%')
  expect(formatHour(3)).toBe('03:00')
  expect(formatHour(17)).toBe('17:00')
})

it('prices in Rp./kWh from a CHF/kWh source value', () => {
  expect(formatRappen(0.296)).toBe('29.6 Rp./kWh')
  expect(formatRappen(0.1)).toBe('10.0 Rp./kWh')
})

it('refuses an hour outside the 24-hour clock', () => {
  expect(() => formatHour(24)).toThrow()
  expect(() => formatHour(-1)).toThrow()
})
