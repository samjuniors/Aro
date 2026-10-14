/**
 * ARO RULES VIEW — Global instruction rules surface (Phase 4 / A10).
 *
 * Contract refs:
 * - Feature id: `rules` (port/FEATURE_MAP.md — local, Origin: Prototype-only).
 * - Glossary row: Rule (global instruction) — deliberately NOT merged with
 *   Hermes SOULs/profiles (D-0017: medium-confidence pair, different semantics).
 * - Persistence: `conductor.workspace.v3.rules` (rules list) +
 *   `conductor.workspace.v3.rules.disabled` (disabled states).
 * - Backend-todo shape: `rules.list/add/remove` -> future profile/rules endpoint.
 */

import { useStore } from '@nanostores/react'
import { useCallback, useMemo, useState } from 'react'

import { $rules, adapters } from '@/adapters'
import { readKey, writeKey } from '@/lib/storage'
import { cn } from '@/lib/utils'

import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSliders,
  IconTrash,
  IconWarning,
  IconX
} from './Icons'
import { ToastHost, useToasts } from './toasts'
import { Badge, Button, IconButton, Input, Segmented, Stat } from './ui'

export const DISABLED_RULES_STORAGE_KEY = 'conductor.workspace.v3.rules.disabled'

function readDisabledRuleSet(): Set<string> {
  const raw = readKey(DISABLED_RULES_STORAGE_KEY)

  if (!raw) {return new Set()}

  try {
    const parsed = JSON.parse(raw) as unknown

    return Array.isArray(parsed)
      ? new Set(parsed.filter((item): item is string => typeof item === 'string'))
      : new Set()
  } catch {
    return new Set()
  }
}

function writeDisabledRuleSet(set: Set<string>): void {
  writeKey(DISABLED_RULES_STORAGE_KEY, JSON.stringify([...set]))
}

// BACKEND-TODO(rules): local persistence only — future backend call is
// `rules.list/add/remove` against a profile/rules endpoint.
export function AroRulesPage() {
  const rules = useStore($rules)
  const { items: toastItems, toast } = useToasts()

  const [disabledRules, setDisabledRules] = useState<Set<string>>(() => readDisabledRuleSet())
  const [draft, setDraft] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingDraft, setEditingDraft] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all')

  const enabledCount = useMemo(
    () => rules.filter(r => !disabledRules.has(r)).length,
    [rules, disabledRules]
  )

  const disabledCount = rules.length - enabledCount

  const hasUnsavedEdits = useMemo(() => {
    if (editingIndex === null || editingIndex >= rules.length) {return false}

    return editingDraft.trim() !== rules[editingIndex]
  }, [editingIndex, editingDraft, rules])

  const handleAdd = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const text = draft.trim()

      if (!text) {
        setAddError('Instruction cannot be empty or whitespace only.')

        return
      }

      if (rules.includes(text)) {
        setAddError('This exact instruction already exists.')

        return
      }

      const ok = adapters.rules.add(text)

      if (ok) {
        setDraft('')
        setAddError(null)
        toast('Rule added to local workspace rules', 'mint')
      } else {
        setAddError('Failed to add rule.')
      }
    },
    [draft, rules, toast]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const targetRule = rules[index]
      const ok = adapters.rules.remove(index)

      if (ok) {
        if (targetRule && disabledRules.has(targetRule)) {
          const next = new Set(disabledRules)
          next.delete(targetRule)
          setDisabledRules(next)
          writeDisabledRuleSet(next)
        }

        if (editingIndex === index) {
          setEditingIndex(null)
          setEditingDraft('')
          setEditError(null)
        } else if (editingIndex !== null && editingIndex > index) {
          setEditingIndex(editingIndex - 1)
        }

        toast('Rule removed', 'neutral')
      }
    },
    [rules, disabledRules, editingIndex, toast]
  )

  const handleToggle = useCallback(
    (ruleText: string) => {
      const next = new Set(disabledRules)
      const willBeDisabled = !next.has(ruleText)

      if (willBeDisabled) {
        next.add(ruleText)
      } else {
        next.delete(ruleText)
      }

      setDisabledRules(next)
      writeDisabledRuleSet(next)
      toast(willBeDisabled ? 'Rule disabled' : 'Rule enabled', willBeDisabled ? 'amber' : 'mint')
    },
    [disabledRules, toast]
  )

  const startEdit = useCallback(
    (index: number) => {
      setEditingIndex(index)
      setEditingDraft(rules[index] ?? '')
      setEditError(null)
    },
    [rules]
  )

  const cancelEdit = useCallback(() => {
    setEditingIndex(null)
    setEditingDraft('')
    setEditError(null)
  }, [])

  const saveEdit = useCallback(
    (index: number) => {
      const text = editingDraft.trim()

      if (!text) {
        setEditError('Instruction cannot be empty.')

        return
      }

      const existingAtOtherIndex = rules.findIndex((r, i) => i !== index && r === text)

      if (existingAtOtherIndex !== -1) {
        setEditError('Another rule already has this exact instruction.')

        return
      }

      const oldText = rules[index]

      if (oldText === text) {
        cancelEdit()

        return
      }

      const nextRules = [...rules]
      nextRules[index] = text
      $rules.set(nextRules)

      if (oldText && disabledRules.has(oldText)) {
        const nextDisabled = new Set(disabledRules)
        nextDisabled.delete(oldText)
        nextDisabled.add(text)
        setDisabledRules(nextDisabled)
        writeDisabledRuleSet(nextDisabled)
      }

      cancelEdit()
      toast('Rule updated and saved', 'mint')
    },
    [editingDraft, rules, disabledRules, cancelEdit, toast]
  )

  const filteredRules = useMemo(() => {
    return rules
      .map((text, originalIndex) => ({
        text,
        originalIndex,
        disabled: disabledRules.has(text)
      }))
      .filter(item => {
        if (filter === 'enabled' && item.disabled) {return false}

        if (filter === 'disabled' && !item.disabled) {return false}

        if (search.trim()) {
          return item.text.toLowerCase().includes(search.trim().toLowerCase())
        }

        return true
      })
  }, [rules, disabledRules, filter, search])

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
                local adapter
              </Badge>
              <Badge mono tone="neutral">
                conductor.workspace.v3.rules
              </Badge>
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-aro-ink">
              Global Rules
            </h1>
            <p className="text-[12px] text-aro-ink-3">
              Global instructions you write. Stored locally to guide agent responses and workflows across sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedEdits && (
              <Badge dot mono tone="amber">
                Unsaved edits pending
              </Badge>
            )}
            <Badge dot mono tone="mint">
              {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        {/* Stats Row */}
        <section aria-label="Rule Statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Total Rules"
            sub="Persisted locally on device"
            tone="iris"
            value={rules.length}
          />
          <Stat
            label="Active Rules"
            sub="Passed to agent sessions"
            tone="mint"
            value={enabledCount}
          />
          <Stat
            label="Disabled Rules"
            sub="Toggled off without deletion"
            tone={disabledCount > 0 ? 'amber' : 'neutral'}
            value={disabledCount}
          />
        </section>

        {/* Add Rule Card */}
        <section
          aria-label="Add Instruction Rule"
          className="rounded-[10px] border border-aro-line-soft bg-aro-raise p-4 shadow-aro-e1 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-aro-ink">Add New Rule</h2>
            <span className="font-aro-mono text-[10px] text-aro-ink-4">Global scope</span>
          </div>

          <form className="space-y-2" onSubmit={handleAdd}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  className="font-aro-mono text-[12px]"
                  onChange={e => {
                    setDraft(e.target.value)

                    if (addError) {setAddError(null)}
                  }}
                  placeholder="e.g., Always write TypeScript with explicit return types and no any."
                  value={draft}
                />
              </div>
              <Button
                disabled={!draft.trim()}
                icon={IconPlus}
                size="sm"
                type="submit"
                variant="primary"
              >
                Add Rule
              </Button>
            </div>

            {addError && (
              <div
                className="flex items-center gap-1.5 font-aro-mono text-[11px] text-aro-rose"
                role="alert"
              >
                <IconWarning size={13} />
                <span>{addError}</span>
              </div>
            )}
          </form>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Segmented
              items={[
                { value: 'all', label: `All (${rules.length})` },
                { value: 'enabled', label: `Active (${enabledCount})` },
                { value: 'disabled', label: `Disabled (${disabledCount})` }
              ]}
              onChange={v => setFilter(v as 'all' | 'enabled' | 'disabled')}
              value={filter}
            />
          </div>

          <div className="relative w-full max-w-xs">
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aro-ink-4"
              size={13}
            />
            <Input
              className="pl-8 text-[12px]"
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rules..."
              value={search}
            />
          </div>
        </div>

        {/* Rules List */}
        <section aria-label="Rules List" className="space-y-2">
          {rules.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-aro-line-strong p-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-aro-hover text-aro-ink-3">
                <IconSliders size={20} />
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-aro-ink">
                No global rules added
              </h3>
              <p className="mx-auto mt-1 max-w-md text-[12px] text-aro-ink-3">
                Global instructions steer agent behavior across all sessions. Write your first rule above to establish workspace standards.
              </p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="rounded-[10px] border border-aro-line-soft bg-aro-raise/50 p-6 text-center text-[12px] text-aro-ink-3">
              No rules matching &ldquo;{search}&rdquo; in {filter} rules.
            </div>
          ) : (
            filteredRules.map(({ text, originalIndex, disabled }) => {
              const isEditing = editingIndex === originalIndex
              const isDirty = isEditing && editingDraft.trim() !== text

              return (
                <div
                  className={cn(
                    'group relative rounded-[8px] border bg-aro-raise p-3.5 transition-all shadow-aro-e1',
                    isEditing
                      ? 'border-aro-iris/60 bg-aro-raise'
                      : disabled
                        ? 'border-aro-line-soft/60 bg-aro-sunken/40 opacity-75'
                        : 'border-aro-line-soft hover:border-aro-line-strong'
                  )}
                  data-testid={`rule-row-${originalIndex}`}
                  key={`${originalIndex}-${text}`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-aro-mono text-[10px] font-bold text-aro-iris">
                            EDITING RULE #{originalIndex + 1}
                          </span>
                          {isDirty ? (
                            <Badge dot mono tone="amber">
                              Unsaved edits
                            </Badge>
                          ) : (
                            <Badge mono tone="neutral">
                              Saved state
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-aro-ink-4">
                          Esc to cancel · Enter to save
                        </span>
                      </div>

                      <Input
                        autoFocus
                        className="font-aro-mono text-[12px]"
                        onChange={e => {
                          setEditingDraft(e.target.value)

                          if (editError) {setEditError(null)}
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveEdit(originalIndex)
                          } else if (e.key === 'Escape') {
                            cancelEdit()
                          }
                        }}
                        value={editingDraft}
                      />

                      {editError && (
                        <div
                          className="flex items-center gap-1.5 font-aro-mono text-[11px] text-aro-rose"
                          role="alert"
                        >
                          <IconWarning size={12} />
                          <span>{editError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          icon={IconX}
                          onClick={cancelEdit}
                          size="xs"
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={!editingDraft.trim() || !isDirty}
                          icon={IconCheck}
                          onClick={() => saveEdit(originalIndex)}
                          size="xs"
                          variant="primary"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-aro-mono text-[10px] text-aro-ink-4">
                            #{originalIndex + 1}
                          </span>
                          {disabled ? (
                            <Badge mono tone="neutral">
                              Disabled
                            </Badge>
                          ) : (
                            <Badge dot mono tone="mint">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-[12.5px] leading-relaxed break-words',
                            disabled
                              ? 'text-aro-ink-4 line-through decoration-aro-ink-4/50'
                              : 'font-medium text-aro-ink'
                          )}
                        >
                          {text}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-90 transition-opacity group-hover:opacity-100">
                        <Button
                          onClick={() => handleToggle(text)}
                          size="xs"
                          title={disabled ? 'Enable rule' : 'Disable rule'}
                          variant={disabled ? 'secondary' : 'ghost'}
                        >
                          {disabled ? 'Enable' : 'Disable'}
                        </Button>

                        <IconButton
                          icon={IconPencil}
                          label="Edit rule"
                          onClick={() => startEdit(originalIndex)}
                          size={24}
                        />

                        <IconButton
                          className="text-aro-ink-4 hover:text-aro-rose"
                          icon={IconTrash}
                          label="Remove rule"
                          onClick={() => handleRemove(originalIndex)}
                          size={24}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </section>
      </main>

      <ToastHost items={toastItems} />
    </div>
  )
}
