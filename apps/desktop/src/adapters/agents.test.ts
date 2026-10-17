import { beforeEach, describe, expect, it } from 'vitest'

import { $customAgents, type AgentAdapterEntry, localAgentsAdapter, SEED_AGENTS } from './agents'
import { WORKSPACE_KEY } from './storage'

describe('agents adapter (local)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $customAgents.set([])
  })

  it('lists the prototype seed catalog', () => {
    const ids = localAgentsAdapter.list().map(a => a.id)

    expect(ids).toContain('aro')
    expect(ids).toContain('hermes')
    expect(ids.length).toBeGreaterThanOrEqual(SEED_AGENTS.length)
  })

  it('registers and persists user entries; duplicate ids are rejected', () => {
    const entry = localAgentsAdapter.register({
      id: 'my-agent', name: 'My Agent', vendor: 'me', glyph: 'MA', from: '#111111', to: '#222222', kind: 'cloud',
      status: 'not-installed', version: '', models: [], strengths: [], weakSpots: [], invocations: 0, successRate: 0, p50: ''
    })

    expect(entry).not.toBeNull()
    expect(entry?.custom).toBe(true)

    const duplicate = localAgentsAdapter.register({
      id: 'my-agent', name: 'Again', vendor: 'me', glyph: 'MA', from: '#111111', to: '#222222', kind: 'cloud',
      status: 'not-installed', version: '', models: [], strengths: [], weakSpots: [], invocations: 0, successRate: 0, p50: ''
    })

    expect(duplicate).toBeNull()
    expect(window.localStorage.getItem(WORKSPACE_KEY.agents)).toBe(JSON.stringify([entry]))

    // Seed rows cannot be removed; user rows can.
    expect(localAgentsAdapter.unregister('aro')).toBe(false)
    expect(localAgentsAdapter.unregister('my-agent')).toBe(true)
    expect(localAgentsAdapter.list().some(a => a.id === 'my-agent')).toBe(false)
  })

  it('re-hydrates persisted custom entries on cold re-read', () => {
    const entry: AgentAdapterEntry = {
      id: 'cold', name: 'Cold Boot', vendor: 'me', glyph: 'CB', from: '#111111', to: '#222222', kind: 'cloud',
      status: 'not-installed', version: '', models: [], strengths: [], weakSpots: [], invocations: 0, successRate: 0, p50: '', custom: true
    }

    window.localStorage.setItem(WORKSPACE_KEY.agents, JSON.stringify([entry]))

    $customAgents.set(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY.agents)!))

    expect(localAgentsAdapter.list().find(a => a.id === 'cold')).toMatchObject({ name: 'Cold Boot' })
  })
})
