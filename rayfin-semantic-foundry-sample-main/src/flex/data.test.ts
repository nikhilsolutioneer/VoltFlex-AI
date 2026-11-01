import { expect, it, vi } from 'vitest'
import { loadDataset, parseIntervals, typicalHouseholdDataset, typicalHouseholdIntervals } from './data'
import { localHour, MODEL_FIELDS } from './model'
import { totalKwh } from './tariff'

vi.mock('../semanticModel', () => ({
  // Literal names: a vi.mock factory is hoisted above the imports.
  modelConnection: {
    workspaceId: 'w', itemId: 'i', table: 'Consumption', portalUrl: 'https://portal.example.test',
    columns: [{ name: 'datetime', dataType: 'dateTime' }, { name: 'consumption_Wh', dataType: 'double' }],
  },
  readModel: vi.fn(() => { throw new Error('Open this app inside the Fabric portal to query the semantic model.') }),
}))

it('converts Wh to kWh exactly once, at the data boundary', () => {
  const intervals = parseIntervals(
    [MODEL_FIELDS.intervalTimestamp, MODEL_FIELDS.intervalEnergyWh],
    [['2026-01-13T00:00:00Z', 651], ['2026-01-13T00:15:00Z', '403']],
  )
  expect(intervals).toEqual([
    { ts: '2026-01-13T00:00:00.000Z', kwh: 0.651 },
    { ts: '2026-01-13T00:15:00.000Z', kwh: 0.403 },
  ])
})

it('drops malformed rows instead of letting NaN or negative energy through', () => {
  const intervals = parseIntervals(
    [MODEL_FIELDS.intervalTimestamp, MODEL_FIELDS.intervalEnergyWh],
    [
      ['not-a-date', 400],
      ['2026-01-13T00:00:00Z', -5],
      ['2026-01-13T00:15:00Z', 'abc'],
      ['2026-01-13T00:30:00Z', null],
      ['2026-01-13T00:45:00Z', 400],
    ],
  )
  expect(intervals).toHaveLength(1)
  expect(intervals[0].kwh).toBe(0.4)
})

it('returns nothing when the expected model fields are absent', () => {
  expect(parseIntervals(['something_else'], [[1]])).toEqual([])
})

it('sorts readings chronologically regardless of the order the model returned them', () => {
  const intervals = parseIntervals(
    [MODEL_FIELDS.intervalTimestamp, MODEL_FIELDS.intervalEnergyWh],
    [['2026-01-13T01:00:00Z', 100], ['2026-01-13T00:00:00Z', 200]],
  )
  expect(intervals.map((entry) => entry.kwh)).toEqual([0.2, 0.1])
})

it('generates whole local days for the typical-household estimate', () => {
  const intervals = typicalHouseholdIntervals(2)
  expect(intervals).toHaveLength(192)
  expect(localHour(intervals[0].ts)).toBe(0)
  expect(localHour(intervals[191].ts)).toBe(23)
  expect(totalKwh(intervals) / 2).toBeGreaterThan(20)
  expect(totalKwh(intervals) / 2).toBeLessThan(45)
  expect(() => typicalHouseholdIntervals(0)).toThrow()
  expect(() => typicalHouseholdIntervals(400)).toThrow()
})

it('says plainly when the figures are an estimate rather than a measurement', () => {
  const dataset = typicalHouseholdDataset('No meter is attached.')
  expect(dataset.source).toBe('typical-household')
  expect(dataset.note).toContain('No meter is attached.')
  expect(dataset.note).toContain('not yours')
})

it('degrades to the labelled estimate when the model read fails, instead of blocking the chat', async () => {
  const dataset = await loadDataset()
  expect(dataset.source).toBe('typical-household')
  expect(dataset.note).toMatch(/not available right now/)
  expect(dataset.note).not.toMatch(/Fabric portal|semantic model/)
  expect(dataset.intervals.length).toBeGreaterThan(0)
})
