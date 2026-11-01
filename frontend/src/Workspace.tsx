import { useState } from 'react'
import type { NotesClient } from './notes/client'
import { NotesPanel } from './notes/NotesPanel'
import { SemanticModelPanel } from './SemanticModelPanel'
import { OpenAIPanel } from './OpenAIPanel'
import { FlexChatPanel } from './flex/FlexChatPanel'
import { FlexInsightsPanel } from './flex/FlexInsightsPanel'
import { FlexSkillsPanel } from './flex/FlexSkillsPanel'
import { useFlexSession } from './flex/useFlexSession'
import { useFoundryConfig } from './useFoundryConfig'

const TABS = [
  { id: 'coach', label: 'FlexCoach' },
  { id: 'energy', label: 'Your energy' },
  { id: 'skills', label: 'Agents & skills' },
  { id: 'model', label: 'Model data' },
  { id: 'notes', label: 'Your notes' },
  { id: 'foundry', label: 'Raw prompt' },
] as const

type TabId = typeof TABS[number]['id']

export function Workspace({ client }: { client: NotesClient | null }) {
  const [tab, setTab] = useState<TabId>('coach')
  const session = useFlexSession()
  const config = useFoundryConfig()

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Flexibility assistant sections">
        {TABS.map((entry) => (
          <button key={entry.id} type="button" role="tab" id={`tab-${entry.id}`}
            aria-selected={tab === entry.id} aria-controls={`panel-${entry.id}`}
            className={tab === entry.id ? 'tab tab-active' : 'tab'}
            onClick={() => setTab(entry.id)}>{entry.label}</button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {session.busy && <p role="status">Reading your meter data&hellip;</p>}
        {session.error && tab !== 'model' && tab !== 'notes' && <p className="error" role="alert">{session.error}</p>}

        {tab === 'coach' && <FlexChatPanel context={session.context} config={config} />}
        {tab === 'energy' && (session.context
          ? <FlexInsightsPanel context={session.context} note={session.dataset?.note ?? ''} />
          : <p role="status">No readings to show yet.</p>)}
        {tab === 'skills' && <FlexSkillsPanel context={session.context} />}
        {tab === 'model' && <SemanticModelPanel />}
        {tab === 'notes' && (client
          ? <NotesPanel client={client} />
          : <p className="warning">Your notes need a Fabric deployment. Run the deploy step, then reload this app from its Fabric portal item.</p>)}
        {tab === 'foundry' && <OpenAIPanel />}
      </div>
    </>
  )
}
