import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const generatedPath = resolve(import.meta.dirname, '.fabric-deployment', '.env.local')
const generated = existsSync(generatedPath) ? parseEnv(readFileSync(generatedPath, 'utf8')) : {}
const notesKeys = [
  'VITE_RAYFIN_API_URL', 'VITE_RAYFIN_PUBLISHABLE_KEY',
  'VITE_FABRIC_WORKSPACE_ID', 'VITE_FABRIC_ITEM_ID', 'VITE_FABRIC_PORTAL_URL',
]
const modelPath = resolve(import.meta.dirname, '.fabric-deployment', 'model.json')
const model = existsSync(modelPath) ? JSON.parse(readFileSync(modelPath, 'utf8')) : null

// Routing only: the browser supplies the Authorization header, so no token is baked into the server.
// Must stay in sync with AGENT_URL in src/flex/dataAgent.ts.
const dataAgentUrl = new URL('https://api.fabric.microsoft.com/v1/mcp/workspaces/497df2d0-0d00-4cdf-9e99-325c8ed54e6b/dataagents/b3b88088-c6a3-4ef0-8aff-723aeec88a68/agent')
const dataAgentProxy = {
  '/dataagent': {
    target: dataAgentUrl.origin,
    changeOrigin: true,
    secure: true,
    rewrite: () => dataAgentUrl.pathname,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only this deployment's generated values may supply local notes defaults.
  define: {
    ...Object.fromEntries(notesKeys.map((key) => [`import.meta.env.${key}`, JSON.stringify(generated[key] ?? '')])),
    __SEMANTIC_MODEL__: JSON.stringify(model?.validated ? {
      workspaceId: model.workspaceId, itemId: model.itemId,
      table: model.table, columns: model.columns, portalUrl: model.portalUrl,
    } : null),
    __DATA_AGENT__: JSON.stringify(true),
  },
  server: { host: 'localhost', port: 5175, strictPort: true, proxy: dataAgentProxy },
  preview: { host: 'localhost', port: 4175, strictPort: true, proxy: dataAgentProxy },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
})
