import { expect, it } from 'vitest'
import { typicalHouseholdDataset } from './data'
import { DATASET_FACTS, NOT_IN_MODEL, REFERENCE_PRICE_CURVE_CHF_PER_KWH } from './model'
import { buildProfile } from './profile'
import { FLEX_AGENTS, FLEX_SKILLS, runSkills, selectSkills, skillById, type SkillContext } from './skills'

const CURVE = REFERENCE_PRICE_CURVE_CHF_PER_KWH

function context(source: SkillContext['source'] = 'semantic-model'): SkillContext {
  const dataset = typicalHouseholdDataset('Test fixture.')
  return {
    intervals: dataset.intervals,
    curve: CURVE,
    profile: buildProfile(dataset.intervals, CURVE),
    staticPriceChfPerKwh: DATASET_FACTS.staticPriceChfPerKwh,
    source,
    jitterSeed: 0,
  }
}

it('declares every skill the customer-facing agent claims to have', () => {
  const declared = FLEX_SKILLS.map((skill) => skill.id).sort()
  const coach = FLEX_AGENTS.find((agent) => agent.id === 'flex-coach')!
  expect(coach.role).toBe('runtime')
  expect([...coach.skills].sort()).toEqual(declared)
  expect(FLEX_AGENTS.filter((agent) => agent.role === 'runtime')).toHaveLength(1)
})

it('runs every skill against a real profile and returns grounded output', () => {
  const skillContext = context()
  for (const skill of FLEX_SKILLS) {
    const result = skill.run(skillContext)
    expect(result.skillId).toBe(skill.id)
    expect(result.headline).toBeTruthy()
    expect(result.bullets.length).toBeGreaterThan(0)
    expect(['low', 'medium', 'high']).toContain(result.confidence)
    expect(result.notMeasured).toEqual(NOT_IN_MODEL)
  }
})

it('never presents estimated data with more confidence than measured data', () => {
  for (const skill of FLEX_SKILLS) {
    const measured = skill.run(context('semantic-model')).confidence
    const estimated = skill.run(context('typical-household')).confidence
    if (measured !== estimated) expect(estimated).toBe('low')
  }
})

it('leads the tariff skill with the counter-intuitive result instead of a sales pitch', () => {
  const result = skillById('dynamic-tariff-simulation').run(context())
  expect(result.headline).toMatch(/cost you about|already save about/)
  expect(result.bullets.join(' ')).toMatch(/physically impossible and never a target/)
})

it('quotes no CO2 or grid-congestion figure, because neither is measured', () => {
  const result = skillById('grid-signal-alignment').run(context())
  const text = [result.headline, ...result.bullets, ...result.findings.map((finding) => finding.value)].join(' ')
  expect(text).not.toMatch(/\bkg CO2|gCO2|CO2e/i)
  expect(result.bullets.join(' ')).toMatch(/not measured/)
})

it('always routes to profiling and recommendations so the customer can act', () => {
  for (const question of ['What does kW mean?', 'Is the dynamic tariff cheaper?', 'hello']) {
    const selected = selectSkills(question)
    expect(selected).toContain('flexibility-profiling')
    expect(selected).toContain('flexibility-recommendations')
    expect(new Set(selected).size).toBe(selected.length)
  }
})

it('routes money questions to the tariff skill and jargon questions to explainability', () => {
  expect(selectSkills('How much would I save by charging at night?')).toContain('dynamic-tariff-simulation')
  expect(selectSkills('What does that mean?')).toContain('flex-explainability')
  expect(selectSkills('Does this actually help the grid?')).toContain('grid-signal-alignment')
})

it('rejects an unknown skill id rather than silently doing nothing', () => {
  // @ts-expect-error the registry is closed; this guards the runtime path.
  expect(() => skillById('made-up-skill')).toThrow()
  expect(runSkills(['flex-explainability'], context())).toHaveLength(1)
})
