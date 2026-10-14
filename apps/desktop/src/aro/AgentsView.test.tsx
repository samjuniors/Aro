import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $customAgents, adapters } from '@/adapters'
import { readKey, writeKey } from '@/lib/storage'
import { $activeSessionId } from '@/store/session'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'

import { AroAgentsPage, SELECTED_ADAPTER_KEY } from './AgentsView'

describe('AroAgentsPage (AgentsView.tsx)', () => {
  beforeEach(() => {
    // Reset custom agents store and storage
    $customAgents.set([])
    writeKey(SELECTED_ADAPTER_KEY, 'aro')
    $activeSessionId.set(null)
    $subagentsBySession.set({})
  })

  afterEach(() => {
    cleanup()
  })

  it('renders page header, stats, seed agent catalog cards, and honest badges', () => {
    render(<AroAgentsPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Coding Agent Adapters' })
    ).toBeDefined()
    expect(screen.getByText('local catalog')).toBeDefined()
    expect(screen.getByText('conductor.workspace.v3.agents')).toBeDefined()

    // Seed agents should be rendered
    expect(screen.getByText('Aro Agent')).toBeDefined()
    expect(screen.getByText('Claude Code')).toBeDefined()
    expect(screen.getByText('Cursor')).toBeDefined()
    expect(screen.getByText('Hermes')).toBeDefined()
  })

  it('filters agent cards by kind and search query', () => {
    render(<AroAgentsPage />)

    // Filter by terminal
    const terminalTab = screen.getByRole('button', { name: 'Terminal' })
    fireEvent.click(terminalTab)

    expect(screen.getByText('Hermes')).toBeDefined()
    expect(screen.queryByText('Cursor')).toBeNull()

    // Search query
    const searchInput = screen.getByPlaceholderText('Search adapters...')
    fireEvent.change(searchInput, { target: { value: 'GLM' } })
    expect(screen.getByText('GLM Code')).toBeDefined()
    expect(screen.queryByText('Hermes')).toBeNull()
  })

  it('registers a custom agent adapter and persists it across reloads', () => {
    render(<AroAgentsPage />)

    const openFormBtn = screen.getByRole('button', { name: 'Register Adapter' })
    fireEvent.click(openFormBtn)

    expect(
      screen.getByRole('heading', { level: 3, name: 'Register Custom Agent Adapter' })
    ).toBeDefined()

    const idInput = screen.getByPlaceholderText('e.g., custom-coder')
    const nameInput = screen.getByPlaceholderText('e.g., Custom Coder')
    const vendorInput = screen.getByPlaceholderText('e.g., Internal / Self-hosted')

    fireEvent.change(idInput, { target: { value: 'my-custom-agent' } })
    fireEvent.change(nameInput, { target: { value: 'My Custom Agent' } })
    fireEvent.change(vendorInput, { target: { value: 'Acme Corp' } })

    const submitBtn = screen.getByRole('button', { name: 'Save Adapter' })
    fireEvent.click(submitBtn)

    // Form should close on success and agent should appear with custom badge
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Register Custom Agent Adapter' })
    ).toBeNull()

    expect(screen.getByText('My Custom Agent')).toBeDefined()
    expect(screen.getByText('custom')).toBeDefined()
    expect($customAgents.get()).toHaveLength(1)
    expect($customAgents.get()[0].id).toBe('my-custom-agent')
  })

  it('prevents registering an agent with duplicate ID', () => {
    render(<AroAgentsPage />)

    const openFormBtn = screen.getByRole('button', { name: 'Register Adapter' })
    fireEvent.click(openFormBtn)

    // Try registering with ID 'aro' which already exists in seed catalog
    const idInput = screen.getByPlaceholderText('e.g., custom-coder')
    const nameInput = screen.getByPlaceholderText('e.g., Custom Coder')

    fireEvent.change(idInput, { target: { value: 'aro' } })
    fireEvent.change(nameInput, { target: { value: 'Duplicate Aro' } })

    const submitBtn = screen.getByRole('button', { name: 'Save Adapter' })
    fireEvent.click(submitBtn)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('An agent with ID "aro" already exists.')
    expect($customAgents.get()).toHaveLength(0)
  })

  it('allows unregistering custom agents while protecting seed agents from deletion', async () => {
    // Add a custom agent first
    adapters.agents.register({
      id: 'temporary-agent',
      name: 'Temporary Agent',
      vendor: 'Test',
      kind: 'cloud',
      glyph: 'TA',
      from: '#6ee7b7',
      to: '#10b981',
      status: 'not-installed',
      version: 'v1.0.0',
      models: [],
      strengths: [],
      weakSpots: [],
      invocations: 0,
      successRate: 0,
      p50: ''
    })

    render(<AroAgentsPage />)

    // Custom agent card should have the unregister icon button
    const customCard = screen.getByTestId('agent-card-temporary-agent')
    expect(customCard).toBeDefined()

    const unregisterBtn = screen.getByRole('button', { name: 'Unregister adapter' })
    fireEvent.click(unregisterBtn)

    expect($customAgents.get()).toHaveLength(0)
    await waitFor(() => {
      expect(screen.queryByTestId('agent-card-temporary-agent')).toBeNull()
    })

    // Seed agent cards should NOT have unregister buttons
    const aroCard = screen.getByTestId('agent-card-aro')
    expect(aroCard.querySelector('button[aria-label="Unregister adapter"]')).toBeNull()
  })

  it('selects an adapter preference and updates persistence', () => {
    render(<AroAgentsPage />)

    const codexCard = screen.getByTestId('agent-card-codex')
    const selectBtn = codexCard.querySelector('button')!
    fireEvent.click(selectBtn)

    expect(readKey(SELECTED_ADAPTER_KEY)).toBe('codex')
  })

  it('displays active subagents isolated strictly to the active session', () => {
    const sessionA = 'session-alpha-123'
    const sessionB = 'session-beta-456'

    const subagentA: SubagentProgress = {
      id: 'sub-worker-1',
      parentId: null,
      goal: 'Execute integration tests and verify code coverage',
      status: 'running',
      taskCount: 3,
      taskIndex: 1,
      startedAt: Date.now() - 10000,
      updatedAt: Date.now(),
      durationSeconds: 10.2,
      model: 'aro-4-70b',
      currentTool: 'run_tests',
      filesRead: [],
      filesWritten: [],
      stream: []
    }

    const subagentB: SubagentProgress = {
      id: 'sub-worker-isolated-from-other-session',
      parentId: null,
      goal: 'Secret task from session B',
      status: 'completed',
      taskCount: 1,
      taskIndex: 1,
      startedAt: Date.now() - 20000,
      updatedAt: Date.now(),
      durationSeconds: 5.0,
      filesRead: [],
      filesWritten: [],
      stream: []
    }

    $subagentsBySession.set({
      [sessionA]: [subagentA],
      [sessionB]: [subagentB]
    })

    // Activate session A
    $activeSessionId.set(sessionA)

    render(<AroAgentsPage />)

    // Subagent A should be visible
    expect(screen.getByText('sub-worker-1')).toBeDefined()
    expect(screen.getByText('Execute integration tests and verify code coverage')).toBeDefined()
    expect(screen.getByText('tool: run_tests')).toBeDefined()
    expect(screen.getByText('10.2s')).toBeDefined()

    // Subagent B from session B MUST NOT leak into session A
    expect(
      screen.queryByText('sub-worker-isolated-from-other-session')
    ).toBeNull()
    expect(screen.queryByText('Secret task from session B')).toBeNull()
  })

  it('shows honest empty state when no subagents exist for the active session', () => {
    $activeSessionId.set('empty-session')
    $subagentsBySession.set({ 'empty-session': [] })

    render(<AroAgentsPage />)

    expect(
      screen.getByText('No subagent tasks have been spawned in the current session.')
    ).toBeDefined()
  })
})
