/**
 * AGENTS ADAPTER (local) — the prototype's coding-agent adapter catalog.
 *
 * Contract refs:
 * - Feature id: `agents-adapters` (port/FEATURE_MAP.md — local).
 * - Glossary row: Agent / Agent adapter (AgentsView) — deliberately NOT
 *   merged with Hermes subagents (D-0017: subagents are runtime spawns,
 *   this is an adapter-type catalog — different concepts, both survive).
 * - Backend-todo shape: `agents.list/register` (port/FEATURE_MAP.md).
 *
 * Interface = prototype names (prototype `data/catalog.ts` `Agent` shape,
 * `AgentsView` "Coding agent adapters"). The seed catalog is the
 * prototype's own presentation data ("Adapter catalog, not an installation
 * or activity report" — prototype data/catalog.ts); user-registered entries
 * persist at `conductor.workspace.v3.agents`.
 */

import { atom } from 'nanostores'

import { readLocalRecord, WORKSPACE_KEY, writeLocalRecord } from './storage'

/** Prototype vocabulary — prototype/src/workbench/data/catalog.ts. */
export type AgentKind = 'terminal' | 'ide' | 'cloud' | 'hybrid'
export type AgentStatus = 'connected' | 'auth-required' | 'not-installed' | 'degraded'

export interface AgentModelRef {
  id: string
  label: string
  ctx: string
  price: string
}

export interface AgentAdapterEntry {
  id: string
  name: string
  vendor: string
  glyph: string
  from: string
  to: string
  kind: AgentKind
  status: AgentStatus
  version: string
  models: AgentModelRef[]
  strengths: string[]
  weakSpots: string[]
  invocations: number
  successRate: number
  p50: string
  /** True when the user registered this entry (persisted); seed rows are false. */
  custom?: boolean
}

export interface AgentsAdapter {
  /** Seed catalog + user-registered entries (user entries last). */
  list(): AgentAdapterEntry[]
  /** Register a user entry; persists across restarts. */
  register(entry: Omit<AgentAdapterEntry, 'custom'>): AgentAdapterEntry | null
  /** Remove a user-registered entry; seed rows cannot be removed. */
  unregister(id: string): boolean
}

/* ============================ seed catalog ============================ */

const withDefaults = (
  entry: Partial<AgentAdapterEntry> & Pick<AgentAdapterEntry, 'id' | 'name' | 'vendor' | 'glyph' | 'from' | 'to' | 'kind'>
): AgentAdapterEntry => ({
  status: 'not-installed',
  version: '',
  models: [],
  strengths: [],
  weakSpots: [],
  invocations: 0,
  successRate: 0,
  p50: '',
  ...entry
})

/**
 * The prototype's catalog, adopted as-is (prototype `data/catalog.ts`).
 * Presentation reference only — statuses describe the prototype's demo
 * corpus, not any real runtime connection.
 */
export const SEED_AGENTS: AgentAdapterEntry[] = [
  withDefaults({ id: 'aro', name: 'Aro Agent', vendor: 'samjuniors', glyph: 'AR', from: '#6EE7B7', to: '#10B981', kind: 'hybrid', status: 'connected', version: 'v1.5.0',
    models: [{ id: 'aro-4-405b', label: 'Aro 4 405B', ctx: '131k', price: 'free' }, { id: 'aro-4-70b', label: 'Aro 4 70B', ctx: '131k', price: 'free' }],
    strengths: ['Autonomous agent loop', 'Multi-provider execution', 'Terminal and browser'], weakSpots: [], invocations: 0, successRate: 100, p50: '—' }),
  withDefaults({ id: 'claude-code', name: 'Claude Code', vendor: 'Anthropic', glyph: 'CC', from: '#d4aa91', to: '#c9845b', kind: 'hybrid', status: 'connected', version: '2.1.4', models: [{ id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', ctx: '200k', price: 'provider pricing' }] }),
  withDefaults({ id: 'codex', name: 'Codex', vendor: 'OpenAI', glyph: 'CX', from: '#babdb8', to: '#86af9a', kind: 'hybrid', status: 'connected', version: '1.9.0', models: [{ id: 'gpt-5.4-codex', label: 'GPT-5.4-Codex', ctx: 'provider managed', price: 'provider pricing' }] }),
  withDefaults({ id: 'cursor', name: 'Cursor', vendor: 'Cursor', glyph: 'CU', from: '#b4b9c4', to: '#7c8fa8', kind: 'ide', status: 'connected', version: '1.2.0' }),
  withDefaults({ id: 'hermes', name: 'Hermes', vendor: 'Nous Research', glyph: 'HR', from: '#caaad3', to: '#ac78a7', kind: 'terminal', status: 'connected', version: '4.70b' }),
  withDefaults({ id: 'glm-code', name: 'GLM Code', vendor: 'Z.ai', glyph: 'GL', from: '#add6c4', to: '#57a98f', kind: 'terminal', status: 'connected', version: '1.4.2' }),
  withDefaults({ id: 'zed', name: 'Zed', vendor: 'Zed Industries', glyph: 'ZD', from: '#d1c193', to: '#c6a259', kind: 'ide' })
]

export function agentById(id: string): AgentAdapterEntry {
  return SEED_AGENTS.find(a => a.id === id) ?? SEED_AGENTS[0]
}

/* ============================ persistence ============================ */

function isAgentKind(value: unknown): value is AgentKind {
  return value === 'terminal' || value === 'ide' || value === 'cloud' || value === 'hybrid'
}

function isAgentStatus(value: unknown): value is AgentStatus {
  return value === 'connected' || value === 'auth-required' || value === 'not-installed' || value === 'degraded'
}

export function sanitizeCustomAgents(value: unknown): AgentAdapterEntry[] {
  if (!Array.isArray(value)) {return []}

  const out: AgentAdapterEntry[] = []

  for (const item of value) {
    if (item == null || typeof item !== 'object') {continue}
    const a = item as Record<string, unknown>

    if (typeof a.id !== 'string' || typeof a.name !== 'string' || !isAgentKind(a.kind)) {continue}

    const models = Array.isArray(a.models)
      ? a.models.filter(
          (m): m is AgentModelRef =>
            m != null && typeof m === 'object' &&
            typeof (m as AgentModelRef).id === 'string' && typeof (m as AgentModelRef).label === 'string'
        ).map(m => ({ id: m.id, label: m.label, ctx: String(m.ctx ?? ''), price: String(m.price ?? '') }))
      : []

    out.push({
      id: a.id,
      name: a.name,
      vendor: typeof a.vendor === 'string' ? a.vendor : '',
      glyph: typeof a.glyph === 'string' ? a.glyph : a.name.slice(0, 2).toUpperCase(),
      from: typeof a.from === 'string' ? a.from : '#6ee7b7',
      to: typeof a.to === 'string' ? a.to : '#10b981',
      kind: a.kind,
      status: isAgentStatus(a.status) ? a.status : 'not-installed',
      version: typeof a.version === 'string' ? a.version : '',
      models,
      strengths: Array.isArray(a.strengths) ? a.strengths.filter((s): s is string => typeof s === 'string') : [],
      weakSpots: Array.isArray(a.weakSpots) ? a.weakSpots.filter((s): s is string => typeof s === 'string') : [],
      invocations: 0,
      successRate: 0,
      p50: '',
      custom: true
    })
  }

  return out
}

/* ============================== adapter ============================== */

// BACKEND-TODO(agents): local persistence only — the future backend call is
// `agents.register` (see port/FEATURE_MAP.md `agents-adapters`).
export const localAgentsAdapter: AgentsAdapter = {
  list() {
    return [...SEED_AGENTS, ...$customAgents.get()]
  },

  register(entry) {
    const clean: AgentAdapterEntry = { ...withDefaults(entry), custom: true }

    if (!clean.id || !clean.name) {return null}

    if (localAgentsAdapter.list().some(a => a.id === clean.id)) {return null}

    $customAgents.set([...$customAgents.get(), clean])

    return clean
  },

  unregister(id) {
    const customs = $customAgents.get()
    const next = customs.filter(a => a.id !== id)

    if (next.length === customs.length) {return false}

    $customAgents.set(next)

    return true
  }
}

/* ============================== store ============================== */

/** User-registered entries only; the seed catalog is static presentation data. */
export const $customAgents = atom<AgentAdapterEntry[]>(readLocalRecord(WORKSPACE_KEY.agents, [], sanitizeCustomAgents))

$customAgents.subscribe(entries => {
  // BACKEND-TODO(agents): replace with the real `agents.list/register` sync
  // when the backend lands; until then this is the persistence point.
  writeLocalRecord(WORKSPACE_KEY.agents, entries)
})
