import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RayfinClient } from '@microsoft/rayfin-client'
import type { AppSchema } from '../rayfin/data/schema'
import { FLEX_AGENTS, FLEX_SKILLS } from './flex/skills'
import { Workspace } from './Workspace'

vi.mock('./notes/NotesPanel', () => ({ NotesPanel: () => <p>notes panel</p> }))
vi.mock('./SemanticModelPanel', () => ({ SemanticModelPanel: () => <p>model panel</p> }))
vi.mock('./openai', () => ({ askOpenAI: vi.fn() }))

const client = new RayfinClient<AppSchema>({ baseUrl: 'https://notes.example.test/', publishableKey: 'pk-test', authStorage: false })
afterEach(cleanup)

function openTab(name: string) {
  fireEvent.click(screen.getByRole('tab', { name }))
}

it('opens on the coach, with one Foundry key entry point', async () => {
  render(<Workspace client={client} />)
  expect(screen.getByRole('tab', { name: 'FlexCoach' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('heading', { name: 'FlexCoach' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Foundry settings' })).toHaveLength(1)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ask FlexCoach' })).toBeEnabled())
})

it('answers from calculated findings even without a Foundry key', async () => {
  render(<Workspace client={client} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ask FlexCoach' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'What should I change first?' }))
  expect(screen.getByText(/Skills used:/)).toBeInTheDocument()
  expect(screen.getAllByText('How I calculated this').length).toBeGreaterThan(0)
  expect(screen.getByText(/seeing the calculated findings without the conversational/)).toBeInTheDocument()
})

it('lists every agent and skill, and runs one on demand', async () => {
  render(<Workspace client={client} />)
  openTab('Agents & skills')
  for (const agent of FLEX_AGENTS) expect(screen.getByRole('heading', { name: agent.name })).toBeInTheDocument()
  for (const skill of FLEX_SKILLS) expect(screen.getByRole('heading', { name: skill.name })).toBeInTheDocument()

  const card = screen.getByRole('heading', { name: 'Flexibility profiling' }).closest('article')!
  await waitFor(() => expect(within(card).getByRole('button', { name: 'Run this skill' })).toBeEnabled())
  fireEvent.click(within(card).getByRole('button', { name: 'Run this skill' }))
  expect(within(card).getByText('How I calculated this')).toBeInTheDocument()
})

it('shows the energy view with its estimate warning and the numbers behind the chart', async () => {
  render(<Workspace client={client} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ask FlexCoach' })).toBeEnabled())
  openTab('Your energy')
  expect(screen.getByText(/typical-household figures, not your own readings/)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /Your energy by hour against the price curve/ })).toBeInTheDocument()
  expect(screen.getByText('Show the numbers behind this chart')).toBeInTheDocument()
})

it('keeps the notes and model panels behind their own tabs', () => {
  render(<Workspace client={client} />)
  expect(screen.queryByText('notes panel')).not.toBeInTheDocument()
  openTab('Your notes')
  expect(screen.getByText('notes panel')).toBeInTheDocument()
  openTab('Model data')
  expect(screen.getByText('model panel')).toBeInTheDocument()
  expect(screen.queryByText('notes panel')).not.toBeInTheDocument()
})

it('still runs the assistant when no deployment backs the notes tab', async () => {
  render(<Workspace client={null} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ask FlexCoach' })).toBeEnabled())
  openTab('Your notes')
  expect(screen.getByText(/Your notes need a Fabric deployment/)).toBeInTheDocument()
  expect(screen.queryByText('notes panel')).not.toBeInTheDocument()
})

it('sends the grounded system prompt and the question once a key is present', async () => {
  const ask = vi.mocked((await import('./openai')).askOpenAI)
  ask.mockResolvedValue('Your biggest hour is 18:00.')
  render(<Workspace client={null} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ask FlexCoach' })).toBeEnabled())

  fireEvent.click(screen.getByRole('button', { name: 'Foundry settings' }))
  fireEvent.change(screen.getByLabelText('Foundry resource endpoint'), { target: { value: 'https://test.openai.azure.com/' } })
  fireEvent.change(screen.getByLabelText('Model deployment name'), { target: { value: 'model' } })
  fireEvent.change(screen.getByLabelText('Your Foundry API key (memory only)'), { target: { value: 'demo-test-key' } })
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  fireEvent.click(screen.getByRole('button', { name: 'Where is my power going?' }))

  expect(ask).toHaveBeenCalledOnce()
  const [endpoint, deployment, key, prompt, , system] = ask.mock.calls[0]
  expect([endpoint, deployment, key, prompt]).toEqual(['https://test.openai.azure.com/', 'model', 'demo-test-key', 'Where is my power going?'])
  expect(system).toContain('You are FlexCoach')
  expect(system).toContain('<<<GROUNDED_FACTS>>>')
  expect(system).not.toContain('demo-test-key')
  expect(await screen.findByText('Your biggest hour is 18:00.')).toBeInTheDocument()
})
