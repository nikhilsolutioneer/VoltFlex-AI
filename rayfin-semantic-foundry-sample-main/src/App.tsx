import { useState } from 'react'
import type { NotesConnection } from './notes/client'
import { useNotesAuth } from './notes/useNotesAuth'
import { Workspace } from './Workspace'

export function App({ connection }: { connection: NotesConnection }) {
  const { session, busy, error, signIn, signOut } = useNotesAuth(connection)
  const [keySession, setKeySession] = useState(0)
  const user = session?.isAuthenticated ? session.user : null
  return (
    <>
      <section className="panel session">
        <div>
          <strong>{user ? user.email || user.id : 'Sign in with Fabric'}</strong>
          <p className="muted">Your own meter data, your own notes, and a demo API key you provide for this session.</p>
        </div>
        <button disabled={busy} onClick={() => {
          if (user) { setKeySession((current) => current + 1); void signOut() }
          else void signIn()
        }}>{busy ? 'Checking Fabric session...' : user ? 'Sign out and clear key' : 'Sign in with Fabric'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      {user && !busy ? (
        <Workspace key={`${user.id}:${keySession}`} client={connection.client} />
      ) : <p role="status">{busy ? 'Completing Fabric authentication...' : 'Sign in to use the sample. No saved API key or mock identity is used.'}</p>}
    </>
  )
}
