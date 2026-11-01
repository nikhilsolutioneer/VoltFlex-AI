import '@microsoft/rayfin-auth-provider-fabric'
import { createRoot } from 'react-dom/client'
import { createNotesConnection } from './notes/client'
import { App } from './App'
import { Workspace } from './Workspace'
import './styles.css'

const element = document.getElementById('root')
if (!element) throw new Error('Missing app root.')
const root = createRoot(element)

async function start() {
  let content
  try {
    const connection = await createNotesConnection({
      VITE_RAYFIN_API_URL: import.meta.env.VITE_RAYFIN_API_URL,
      VITE_RAYFIN_PUBLISHABLE_KEY: import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY,
      VITE_FABRIC_WORKSPACE_ID: import.meta.env.VITE_FABRIC_WORKSPACE_ID,
      VITE_FABRIC_ITEM_ID: import.meta.env.VITE_FABRIC_ITEM_ID,
      VITE_FABRIC_PORTAL_URL: import.meta.env.VITE_FABRIC_PORTAL_URL,
    }, window.location.origin)
    content = <App connection={connection} />
  } catch (error) {
    // Without a deployment the assistant still runs on labelled estimates; only the per-user data paths are unavailable.
    content = (
      <>
        <section className="panel">
          <h2>Running without a Fabric deployment</h2>
          <p className="muted">The assistant below works on typical-household estimates, not your own readings. Your
            meter data and your notes need a deployment and the Fabric portal.</p>
          <p className="warning">{error instanceof Error ? error.message : 'App initialization failed.'}</p>
        </section>
        <Workspace client={null} />
      </>
    )
  }
  root.render(
    <main className="app-shell">
      <header>
        <span className="eyebrow">FABRIC PORTAL / DEMO-ONLY API KEY</span>
        <h1>Your electricity, and what can move</h1>
        <p>See where your power goes, what shifting it is worth, and what to change first &mdash; in plain language.</p>
      </header>
      {content}
      <footer>Every figure is calculated in this app from your meter data. The language model explains them; it never computes them.</footer>
    </main>,
  )
}
void start()
