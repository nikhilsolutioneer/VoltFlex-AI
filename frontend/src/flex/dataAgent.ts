/** Real Fabric Data Agent client (MCP over streamable HTTP). The token comes from the settings panel, per session. */

const AGENT_URL = 'https://api.fabric.microsoft.com/v1/mcp/workspaces/497df2d0-0d00-4cdf-9e99-325c8ed54e6b/dataagents/b3b88088-c6a3-4ef0-8aff-723aeec88a68/agent'
// The dev server proxies /dataagent to the same URL; a deployed build has no proxy and must call it directly.
const ENDPOINT = import.meta.env.DEV ? '/dataagent' : AGENT_URL
/** Read from the deployed agent's own tools/list; used when the handshake is unavailable. */
const FALLBACK_TOOL = { name: 'DataAgent_ChatWithConsumption', argument: 'userQuestion' }

let sessionId = ''
let tool = { ...FALLBACK_TOOL }
let connected = false
let nextId = 1

function bearer(token: string): string {
  const trimmed = token.trim()
  if (!trimmed) throw new Error('Paste a Fabric data agent token first.')
  return /^bearer /i.test(trimmed) ? trimmed : `Bearer ${trimmed}`
}

async function rpc(token: string, method: string, params: unknown, signal?: AbortSignal): Promise<unknown> {
  const notification = method.startsWith('notifications/')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
    Authorization: bearer(token),
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const response = await fetch(ENDPOINT, {
    method: 'POST', headers, signal,
    body: JSON.stringify(notification
      ? { jsonrpc: '2.0', method, params }
      : { jsonrpc: '2.0', id: nextId++, method, params }),
  })
  const issued = response.headers.get('mcp-session-id')
  if (issued) sessionId = issued
  if (response.status === 401 || response.status === 403) {
    throw new Error('The data agent rejected the token. Generate a new one and paste it again.')
  }
  if (!response.ok) throw new Error(`The data agent returned HTTP ${response.status}.`)
  if (notification) return null

  const payload = parsePayload(await response.text())
  if (isRecord(payload) && isRecord(payload.error)) {
    const detail = typeof payload.error.message === 'string' ? payload.error.message : 'Invalid request'
    throw new Error(`Data agent: ${detail} (code ${String(payload.error.code ?? 'unknown')}). An expired token is the usual cause.`)
  }
  return isRecord(payload) ? payload.result : null
}

/** The transport may answer as plain JSON or as a server-sent event stream. */
function parsePayload(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const lines = trimmed.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim())
  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line)
    } catch {
      continue
    }
  }
  return null
}

async function connect(token: string, signal?: AbortSignal): Promise<void> {
  if (connected) return
  await rpc(token, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'flexibility-assistant', version: '1.0.0' },
  }, signal)
  await rpc(token, 'notifications/initialized', {}, signal)
  connected = true

  const listed = await rpc(token, 'tools/list', {}, signal)
  const tools = isRecord(listed) && Array.isArray(listed.tools) ? listed.tools : []
  const first = tools.find(isRecord)
  if (first && typeof first.name === 'string') {
    const schema = isRecord(first.inputSchema) && isRecord(first.inputSchema.properties) ? first.inputSchema.properties : null
    const [argument] = schema ? Object.keys(schema) : []
    tool = { name: first.name, argument: argument || FALLBACK_TOOL.argument }
  }
}

async function callTool(token: string, question: string, signal?: AbortSignal): Promise<string> {
  const result = await rpc(token, 'tools/call', { name: tool.name, arguments: { [tool.argument]: question } }, signal)
  const content = isRecord(result) && Array.isArray(result.content) ? result.content : []
  const text = content
    .filter(isRecord)
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => String(part.text))
    .join('\n')
    .trim()
  if (!text) throw new Error('The data agent returned no readings for that question.')
  return text
}

/** Ask the deployed data agent a question and return its answer verbatim. */
export async function askDataAgent(token: string, question: string, signal?: AbortSignal): Promise<string> {
  try {
    await connect(token, signal)
  } catch (cause) {
    // Some gateways accept tools/call without a prior handshake; try the known tool before giving up.
    try {
      return await callTool(token, question, signal)
    } catch {
      throw cause
    }
  }
  return callTool(token, question, signal)
}

export function resetDataAgent(): void {
  sessionId = ''
  connected = false
  nextId = 1
  tool = { ...FALLBACK_TOOL }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
