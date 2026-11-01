import { useState } from 'react'
import { SkillResultCard } from './FlexParts'
import { FLEX_AGENTS, FLEX_SKILLS, skillById, type SkillContext, type SkillId, type SkillResult } from './skills'

export function FlexSkillsPanel({ context }: { context: SkillContext | null }) {
  const [results, setResults] = useState<Partial<Record<SkillId, SkillResult>>>({})
  const [failed, setFailed] = useState('')

  function runSkill(id: SkillId) {
    if (!context) return
    try {
      setFailed('')
      setResults((current) => ({ ...current, [id]: skillById(id).run(context) }))
    } catch {
      setFailed('That check needs data we do not have for this period yet.')
    }
  }

  return (
    <section className="panel" aria-labelledby="skills-title">
      <h2 id="skills-title">Agents and skills</h2>
      <p className="muted">Everything the assistant can do is declared here. Each skill runs deterministic code in this
        app; the language model only puts the results into words.</p>

      <h3>Agents</h3>
      <div className="cards">
        {FLEX_AGENTS.map((agent) => (
          <article className="card" key={agent.id}>
            <div className="card-head">
              <h4>{agent.name}</h4>
              <span className={`badge badge-${agent.role === 'runtime' ? 'medium' : 'low'}`}>
                {agent.role === 'runtime' ? 'Talks to customers' : 'Builds the app'}
              </span>
            </div>
            <p>{agent.summary}</p>
            <p className="muted">Skills: {agent.skills.join(', ')}</p>
            <ul className="bullets">{agent.boundaries.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          </article>
        ))}
      </div>

      <h3>Skills</h3>
      {failed && <p className="error" role="alert">{failed}</p>}
      <div className="cards">
        {FLEX_SKILLS.map((skill) => (
          <article className="card" key={skill.id}>
            <div className="card-head">
              <h4>{skill.name}</h4>
              <code>{skill.id}</code>
            </div>
            <p>{skill.summary}</p>
            <p className="muted"><strong>When it runs:</strong> {skill.whenToUse}</p>
            <button type="button" className="secondary" disabled={!context} onClick={() => runSkill(skill.id)}>
              Run this skill
            </button>
            {results[skill.id] && <SkillResultCard result={results[skill.id]!} />}
          </article>
        ))}
      </div>
    </section>
  )
}
