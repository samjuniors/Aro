/**
 * ARO AGENTS VIEW — Coding agent adapters catalog & active session subagents (Phase 4 / A10).
 *
 * Contract refs:
 * - Feature id: `agents-adapters` (port/FEATURE_MAP.md — local, Origin: Prototype-only).
 * - Glossary row: Agent / Agent adapter (AgentsView) — deliberately NOT
 *   merged with Hermes subagents (D-0017: subagents are runtime spawns,
 *   this is an adapter-type catalog — different concepts, both survive).
 * - Persistence: `conductor.workspace.v3.agents` (custom agents) +
 *   `conductor.adapter.selected` (selected adapter preference).
 * - Backend-todo shape: `agents.list/register` (port/FEATURE_MAP.md).
 */

import { useStore } from '@nanostores/react'
import { useCallback, useMemo, useState } from 'react'

import { $customAgents, adapters } from '@/adapters'
import type { AgentKind } from '@/adapters/agents'
import { readKey, writeKey } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { $activeSessionId } from '@/store/session'
import { $subagentsBySession, type SubagentProgress } from '@/store/subagents'

import {
  AgentMark,
  IconCheck,
  IconCloud,
  IconLaptop,
  IconLayers,
  IconPlus,
  IconPulse,
  IconSearch,
  IconTerminal,
  IconTrash,
  IconWarning,
  IconX
} from './Icons'
import { ToastHost, useToasts } from './toasts'
import { Badge, Button, IconButton, Input, Segmented, Stat } from './ui'

export const SELECTED_ADAPTER_KEY = 'conductor.adapter.selected'

const KIND_ICONS: Record<AgentKind, typeof IconTerminal> = {
  terminal: IconTerminal,
  ide: IconLaptop,
  cloud: IconCloud,
  hybrid: IconLayers
}

// BACKEND-TODO(agents): local persistence only — future backend call is
// `agents.list/register` (see port/FEATURE_MAP.md `agents-adapters`).
export function AroAgentsPage({ onStart }: { onStart?: (id: string) => void } = {}) {
  const customAgents = useStore($customAgents)
  const activeSessionId = useStore($activeSessionId)
  const subagentsBySession = useStore($subagentsBySession)

  const { items: toastItems, toast } = useToasts()

  // Selected adapter preference
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(() => {
    return readKey(SELECTED_ADAPTER_KEY) || 'aro'
  })

  // Filter & Search
  const [kindFilter, setKindFilter] = useState<'all' | AgentKind>('all')
  const [search, setSearch] = useState('')

  // Register New Agent Dialog/Form
  const [isRegistering, setIsRegistering] = useState(false)
  const [formId, setFormId] = useState('')
  const [formName, setFormName] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formKind, setFormKind] = useState<AgentKind>('terminal')
  const [formGlyph, setFormGlyph] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formStrengths, setFormStrengths] = useState('')
  const [formWeakSpots, setFormWeakSpots] = useState('')
  const [registerError, setRegisterError] = useState<string | null>(null)

  // Full catalog: seed rows + custom rows
  const allAgents = useMemo(() => {
    const seed = adapters.agents.list().filter(a => !a.custom)

    return [...seed, ...customAgents]
  }, [customAgents])

  // Active subagents strictly isolated to the current session
  const activeSessionSubagents: SubagentProgress[] = useMemo(() => {
    if (!activeSessionId) {return []}

    return subagentsBySession[activeSessionId] || []
  }, [activeSessionId, subagentsBySession])

  // Filtered agent list
  const filteredAgents = useMemo(() => {
    return allAgents.filter(a => {
      if (kindFilter !== 'all' && a.kind !== kindFilter) {return false}

      if (search.trim()) {
        const q = search.trim().toLowerCase()

        return (
          a.name.toLowerCase().includes(q) ||
          a.vendor.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [allAgents, kindFilter, search])

  // Select agent
  const handleSelectAdapter = useCallback(
    (id: string) => {
      setSelectedAdapterId(id)
      writeKey(SELECTED_ADAPTER_KEY, id)

      if (onStart) {
        onStart(id)
      }

      toast(
        `Saved ${id} as workspace adapter preference. Note: Hermes session turns execute through the active profile model; this preference is stored locally.`,
        'iris'
      )
    },
    [onStart, toast]
  )

  // Unregister custom agent
  const handleUnregister = useCallback(
    (id: string) => {
      const ok = adapters.agents.unregister(id)

      if (ok) {
        if (selectedAdapterId === id) {
          setSelectedAdapterId('aro')
          writeKey(SELECTED_ADAPTER_KEY, 'aro')
        }

        toast(`Unregistered agent adapter ${id}`, 'neutral')
      } else {
        toast(`Cannot unregister seed adapter ${id}`, 'rose')
      }
    },
    [selectedAdapterId, toast]
  )

  // Register custom agent
  const handleRegister = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const cleanId = formId.trim().toLowerCase().replace(/\s+/g, '-')
      const cleanName = formName.trim()

      if (!cleanId || !cleanName) {
        setRegisterError('Agent ID and Name are required.')

        return
      }

      if (allAgents.some(a => a.id === cleanId)) {
        setRegisterError(`An agent with ID "${cleanId}" already exists.`)

        return
      }

      const glyph = (formGlyph.trim() || cleanName.slice(0, 2)).toUpperCase()

      const strengths = formStrengths
        ? formStrengths.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const weakSpots = formWeakSpots
        ? formWeakSpots.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const created = adapters.agents.register({
        id: cleanId,
        name: cleanName,
        vendor: formVendor.trim() || 'Custom',
        kind: formKind,
        glyph,
        from: '#6ee7b7',
        to: '#10b981',
        status: 'not-installed',
        version: formVersion.trim() || 'v1.0.0',
        models: [],
        strengths,
        weakSpots,
        invocations: 0,
        successRate: 0,
        p50: ''
      })

      if (created) {
        setIsRegistering(false)
        setFormId('')
        setFormName('')
        setFormVendor('')
        setFormGlyph('')
        setFormVersion('')
        setFormStrengths('')
        setFormWeakSpots('')
        setRegisterError(null)
        toast(`Registered custom agent adapter metadata "${cleanName}"`, 'mint')
      } else {
        setRegisterError('Failed to register agent adapter.')
      }
    },
    [
      formId,
      formName,
      formVendor,
      formKind,
      formGlyph,
      formVersion,
      formStrengths,
      formWeakSpots,
      allAgents,
      toast
    ]
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-aro-base text-aro-ink select-text">
      {/* Header */}
      <header className="border-b border-aro-line-soft bg-aro-raise/40 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-aro-mono text-[10px] font-semibold tracking-wider text-aro-ink-4 uppercase">
                Configuration
              </span>
              <Badge mono tone="iris">
                local catalog
              </Badge>
              <Badge mono tone="neutral">
                conductor.workspace.v3.agents
              </Badge>
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-aro-ink">
              Coding Agent Adapters
            </h1>
            <p className="text-[12px] text-aro-ink-3">
              Reference catalog of coding agent definitions and live Hermes session subagents. Catalog entries represent reference specifications; custom registrations store local metadata only.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={IconPlus}
              onClick={() => setIsRegistering(!isRegistering)}
              size="sm"
              variant="primary"
            >
              {isRegistering ? 'Cancel' : 'Register Adapter'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {/* Runtime Boundary Notice */}
        <section
          aria-label="Agent Execution Notice"
          className="rounded-[10px] border border-aro-line-soft bg-aro-raise/80 p-4 shadow-aro-e1 space-y-1.5"
        >
          <div className="flex items-center gap-2">
            <IconTerminal className="text-aro-iris" size={15} />
            <h2 className="text-[12.5px] font-semibold text-aro-ink">
              Catalog & Runtime Execution Boundaries
            </h2>
            <Badge mono tone="iris">
              catalog metadata
            </Badge>
          </div>
          <p className="text-[11.5px] text-aro-ink-3">
            <strong>Built-in catalog entries</strong> are reference specifications from the prototype catalog, not verified local host installations. <strong>Custom agent registration</strong> saves adapter metadata locally to workspace preferences (<code className="font-aro-mono text-[10.5px]">conductor.workspace.v3.agents</code>); it does not create an executable process or register a tool with the Hermes backend. <strong>Active Session Subagents</strong> below are genuine live subagents streamed from Hermes gateway events.
          </p>
        </section>

        {/* Statistics Row */}
        <section aria-label="Catalog Statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Total Adapters"
            sub={`${allAgents.length - customAgents.length} seed · ${customAgents.length} custom`}
            tone="iris"
            value={allAgents.length}
          />
          <Stat
            label="Selected Adapter"
            sub="Local preference (conductor.adapter.selected)"
            tone="mint"
            value={selectedAdapterId.toUpperCase()}
          />
          <Stat
            label="Active Session Subagents"
            sub={activeSessionId ? `Session ${activeSessionId.slice(0, 8)}` : 'No active session'}
            tone={activeSessionSubagents.length > 0 ? 'cyan' : 'neutral'}
            value={activeSessionSubagents.length}
          />
        </section>

        {/* Live Session Subagents Section (Session Isolation) */}
        <section
          aria-label="Active Session Subagents"
          className="rounded-[10px] border border-aro-line-soft bg-aro-raise p-4 shadow-aro-e1 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconPulse className="text-aro-cyan" size={15} />
              <h2 className="text-[13px] font-semibold text-aro-ink">
                Active Session Subagents
              </h2>
              <Badge dot mono tone="cyan">
                {activeSessionSubagents.length} running
              </Badge>
            </div>
            <span className="font-aro-mono text-[10px] text-aro-ink-4">
              {activeSessionId ? `Bound to ${activeSessionId}` : 'No active session'}
            </span>
          </div>

          {!activeSessionId ? (
            <p className="font-aro-mono text-[11px] text-aro-ink-4">
              No active session selected. Open or select a chat session to monitor its delegated subagent workers.
            </p>
          ) : activeSessionSubagents.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-aro-line-soft p-4 text-center">
              <p className="text-[12px] text-aro-ink-3">
                No subagent tasks have been spawned in the current session.
              </p>
              <p className="mt-0.5 text-[10.5px] text-aro-ink-4">
                When the agent delegates work via fan-out tools, child workers appear here with live progress.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-aro-line-soft/60">
              {activeSessionSubagents.map(sub => (
                <div className="flex items-center justify-between py-2.5" key={sub.id}>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-aro-mono text-[11px] font-semibold text-aro-ink">
                        {sub.id}
                      </span>
                      <Badge
                        dot
                        mono
                        tone={
                          sub.status === 'running'
                            ? 'cyan'
                            : sub.status === 'completed'
                              ? 'mint'
                              : sub.status === 'failed'
                                ? 'rose'
                                : 'neutral'
                        }
                      >
                        {sub.status}
                      </Badge>
                      {sub.model && (
                        <span className="font-aro-mono text-[10px] text-aro-ink-4">
                          {sub.model}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-aro-ink-2">{sub.goal}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 font-aro-mono text-[11px] text-aro-ink-4">
                    {sub.currentTool && (
                      <span className="rounded bg-aro-hover px-1.5 py-0.5 text-[10px] text-aro-ink-3">
                        tool: {sub.currentTool}
                      </span>
                    )}
                    {sub.durationSeconds !== undefined && (
                      <span>{sub.durationSeconds.toFixed(1)}s</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Register Agent Form */}
        {isRegistering && (
          <section
            aria-label="Register New Agent Adapter"
            className="rounded-[10px] border border-aro-iris/40 bg-aro-raise p-4 shadow-aro-e2 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-aro-ink">
                  Register Custom Agent Adapter
                </h3>
                <p className="text-[11px] text-aro-ink-3">
                  Saves adapter metadata to local workspace storage (<code className="font-aro-mono text-[10px]">conductor.workspace.v3.agents</code>). Does not spawn an executable process.
                </p>
              </div>
              <IconButton
                icon={IconX}
                label="Close form"
                onClick={() => setIsRegistering(false)}
                size={22}
              />
            </div>

            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleRegister}>
              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Adapter ID (slug) *
                </label>
                <Input
                  className="font-aro-mono text-[12px]"
                  onChange={e => setFormId(e.target.value)}
                  placeholder="e.g., custom-coder"
                  required
                  value={formId}
                />
              </div>

              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Display Name *
                </label>
                <Input
                  className="text-[12px]"
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Custom Coder"
                  required
                  value={formName}
                />
              </div>

              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Vendor
                </label>
                <Input
                  className="text-[12px]"
                  onChange={e => setFormVendor(e.target.value)}
                  placeholder="e.g., Internal / Self-hosted"
                  value={formVendor}
                />
              </div>

              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Kind
                </label>
                <select
                  className="h-[30px] w-full rounded-[7px] border border-aro-line bg-aro-raise px-2 font-aro-mono text-[12px] text-aro-ink"
                  onChange={e => setFormKind(e.target.value as AgentKind)}
                  value={formKind}
                >
                  <option value="terminal">Terminal</option>
                  <option value="ide">IDE</option>
                  <option value="cloud">Cloud</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Glyph (2 chars)
                </label>
                <Input
                  className="font-aro-mono text-[12px] uppercase"
                  maxLength={2}
                  onChange={e => setFormGlyph(e.target.value.slice(0, 2))}
                  placeholder="CC"
                  value={formGlyph}
                />
              </div>

              <div className="space-y-1">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Version
                </label>
                <Input
                  className="font-aro-mono text-[12px]"
                  onChange={e => setFormVersion(e.target.value)}
                  placeholder="v1.0.0"
                  value={formVersion}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-aro-mono text-[10.5px] text-aro-ink-3">
                  Strengths (comma separated)
                </label>
                <Input
                  className="text-[12px]"
                  onChange={e => setFormStrengths(e.target.value)}
                  placeholder="Fast completions, Local execution, Self-improving loop"
                  value={formStrengths}
                />
              </div>

              {registerError && (
                <div
                  className="flex items-center gap-1.5 font-aro-mono text-[11px] text-aro-rose sm:col-span-2"
                  role="alert"
                >
                  <IconWarning size={13} />
                  <span>{registerError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button
                  onClick={() => setIsRegistering(false)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button icon={IconCheck} size="sm" type="submit" variant="primary">
                  Save Adapter
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            items={[
              { value: 'all', label: `All (${allAgents.length})` },
              { value: 'terminal', label: 'Terminal' },
              { value: 'ide', label: 'IDE' },
              { value: 'cloud', label: 'Cloud' },
              { value: 'hybrid', label: 'Hybrid' }
            ]}
            onChange={v => setKindFilter(v as 'all' | AgentKind)}
            value={kindFilter}
          />

          <div className="relative w-full max-w-xs">
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aro-ink-4"
              size={13}
            />
            <Input
              className="pl-8 text-[12px]"
              onChange={e => setSearch(e.target.value)}
              placeholder="Search adapters..."
              value={search}
            />
          </div>
        </div>

        {/* Adapters Catalog Cards */}
        <section aria-label="Agent Adapters" className="space-y-3">
          {filteredAgents.length === 0 ? (
            <div className="rounded-[10px] border border-aro-line-soft bg-aro-raise/50 p-6 text-center text-[12px] text-aro-ink-3">
              No agent adapters found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredAgents.map(agent => {
                const KindIcon = KIND_ICONS[agent.kind] || IconTerminal
                const isSelected = selectedAdapterId === agent.id

                return (
                  <div
                    className={cn(
                      'flex flex-col justify-between rounded-[10px] border bg-aro-raise p-4 transition-all shadow-aro-e1',
                      isSelected
                        ? 'border-aro-iris bg-aro-raise/90 shadow-aro-e2'
                        : 'border-aro-line-soft hover:border-aro-line-strong'
                    )}
                    data-testid={`agent-card-${agent.id}`}
                    key={agent.id}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Mark, Name, Vendor, Kind */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <AgentMark
                            from={agent.from}
                            glyph={agent.glyph}
                            size={32}
                            to={agent.to}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-[13.5px] font-semibold text-aro-ink">
                                {agent.name}
                              </h3>
                              {agent.custom && (
                                <Badge mono tone="iris">
                                  custom
                                </Badge>
                              )}
                              {isSelected && (
                                <Badge dot mono tone="mint">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-aro-ink-3">
                              {agent.vendor || 'Unknown vendor'}{' '}
                              {agent.version && `· ${agent.version}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className="flex items-center gap-1 rounded bg-aro-hover px-1.5 py-0.5 font-aro-mono text-[9.5px] text-aro-ink-3 uppercase"
                            title={`Kind: ${agent.kind}`}
                          >
                            <KindIcon size={11} />
                            {agent.kind}
                          </span>
                        </div>
                      </div>

                      {/* Status and Strengths */}
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-aro-mono text-[10px] text-aro-ink-4">
                            STATUS:
                          </span>
                          <span className="text-aro-ink-3">
                            {agent.custom
                              ? 'Local metadata definition (not an executable process)'
                              : 'Catalog reference specification (not locally verified)'}
                          </span>
                        </div>

                        {agent.strengths && agent.strengths.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {agent.strengths.map((str, idx) => (
                              <span
                                className="rounded bg-aro-sunken px-1.5 py-0.5 text-[10px] text-aro-ink-3"
                                key={idx}
                              >
                                {str}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-aro-line-soft/60 pt-3">
                      <span className="font-aro-mono text-[10px] text-aro-ink-4">
                        id: {agent.id}
                      </span>

                      <div className="flex items-center gap-2">
                        {agent.custom && (
                          <IconButton
                            className="text-aro-ink-4 hover:text-aro-rose"
                            icon={IconTrash}
                            label="Unregister adapter"
                            onClick={() => handleUnregister(agent.id)}
                            size={24}
                          />
                        )}

                        <Button
                          onClick={() => handleSelectAdapter(agent.id)}
                          size="xs"
                          variant={isSelected ? 'secondary' : 'ghost'}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <ToastHost items={toastItems} />
    </div>
  )
}
