import { useMemo, useState } from 'react'
import { askOpenAI } from '../openai'
import { FoundrySettings } from '../FoundrySettings'
import type { FoundryConfig } from '../useFoundryConfig'
import { useRequest } from '../useRequest'
import { SkillResultCard } from './FlexParts'
import { askDataAgent } from './dataAgent'
import { buildSystemPrompt, MAX_QUESTION_LENGTH, sanitizeQuestion } from './prompt'
import { runSkills, selectSkills, skillById, type SkillContext, type SkillResult } from './skills'
import { formatHour } from './units'

interface Turn {
  readonly id: string
  readonly question: string
  readonly answer: string
  readonly measured: string
  readonly results: readonly SkillResult[]
}

const STARTERS = [
  'Where is my power going?',
  'Would the dynamic tariff be cheaper for me?',
  'What should I change first?',
  'What does kW actually mean?',
]

export function FlexChatPanel({ context, config }: { context: SkillContext | null; config: FoundryConfig }) {
  const { busy, error, run, cancel } = useRequest()
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<readonly Turn[]>([])

  const opening = useMemo(() => (context ? skillById('flexibility-profiling').run(context) : null), [context])

  function ask(text: string) {
    if (!context) return
    let cleaned: string
    try {
      cleaned = sanitizeQuestion(text)
    } catch {
      return
    }
    const results = runSkills(selectSkills(cleaned), context)
    const id = crypto.randomUUID()
    setTurns((current) => [...current, { id, question: cleaned, answer: '', measured: '', results }])
    setQuestion('')

    void run(async (signal) => {
      const measured = config.dataAgentReady ? await askDataAgent(config.dataAgentToken, cleaned, signal) : ''
      const answer = config.configured
        ? await askOpenAI(config.endpoint, config.deployment, config.apiKey, cleaned, signal, buildSystemPrompt(results, context, measured))
        : ''
      return { measured, answer }
    }, (value) => setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...value } : turn))))
  }

  function clear() {
    cancel()
    config.clearKey()
    setTurns([])
    setQuestion('')
  }

  return (
    <section className="panel" aria-labelledby="coach-title">
      <h2 id="coach-title">FlexCoach</h2>
      <FoundrySettings config={config} busy={busy} />

      {opening && (
        <div className="coach-opening">
          <p><strong>{opening.headline}</strong> That gap is what we can work with.</p>
          <p className="muted">Every number below is calculated in this app from your load curve. The language model
            only explains them &mdash; it is not allowed to invent or recalculate a figure.</p>
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); ask(question) }}>
        <label htmlFor="coach-question">Ask about your electricity</label>
        <textarea id="coach-question" value={question} maxLength={MAX_QUESTION_LENGTH} rows={2} required disabled={busy || !context}
          onChange={(event) => setQuestion(event.target.value)} />
        <div className="actions">
          <button type="submit" disabled={busy || !context}>{busy ? 'Thinking\u2026' : 'Ask FlexCoach'}</button>
          <button className="secondary" type="button" onClick={clear}>Clear key and conversation</button>
        </div>
      </form>

      <div className="starters">
        {STARTERS.map((starter) => (
          <button key={starter} type="button" className="secondary chip" disabled={busy || !context} onClick={() => ask(starter)}>
            {starter}
          </button>
        ))}
      </div>

      {!config.configured && (
        <p className="muted">No Foundry key yet, so you are seeing the calculated findings without the conversational
          reply. The numbers are the same either way.</p>
      )}
      {!config.dataAgentReady && (
        <p className="warning">No Fabric data agent token yet. Until you paste one in the settings gear, the figures
          below are typical-household estimates, not your readings.</p>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="transcript">
        {turns.map((turn) => (
          <article key={turn.id} className="turn">
            <p className="turn-question"><strong>You:</strong> {turn.question}</p>
            {turn.answer && <p className="answer" role="status">{turn.answer}</p>}
            {turn.measured && (
              <div className="coach-opening">
                <p className="muted"><strong>From your Fabric data agent, live:</strong></p>
                <p className="answer">{turn.measured}</p>
              </div>
            )}
            <p className="muted">Skills used: {turn.results.map((result) => result.skillId).join(', ')}.</p>
            {turn.results.map((result) => <SkillResultCard key={result.skillId} result={result} />)}
          </article>
        ))}
      </div>

      <p className="muted">Demo only: your API key stays in page memory. Only your question and the calculated summary
        above are sent &mdash; never raw meter readings, identifiers, or addresses. Peak hours are shown in 24-hour
        local time, for example {formatHour(17)}.</p>
    </section>
  )
}
