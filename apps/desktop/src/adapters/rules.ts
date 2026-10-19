/**
 * RULES ADAPTER (local) — the prototype's global instruction rules.
 *
 * Contract refs:
 * - Feature id: `rules` (port/FEATURE_MAP.md — local).
 * - Glossary row: Rule (global instruction) — deliberately NOT merged with
 *   Hermes SOULs/profiles (D-0017: medium-confidence pair, different
 *   semantics — rules are editor-style global instructions, SOULs are the
 *   Hermes persona system; both surfaces survive independently).
 * - Backend-todo shape: `rules.list/add/remove` → future profile/rules
 *   endpoint (port/FEATURE_MAP.md `rules` row).
 *
 * Interface = prototype names (rules are plain strings, prototype
 * `Settings.tsx` `Rules()` section). Persistence = the prototype's own
 * storage key `conductor.workspace.v3.rules`, adopted as-is.
 */

import { atom } from 'nanostores'

import { readLocalRecord, WORKSPACE_KEY, writeLocalRecord } from './storage'

export interface RulesAdapter {
  /** All global rules, in the order the user added them. */
  list(): string[]
  /** Append a rule (trimmed); duplicate texts are ignored. */
  add(rule: string): boolean
  /** Remove the rule at `index`; returns whether one was removed. */
  remove(index: number): boolean
}

/* ============================ persistence ============================ */

export function sanitizeRules(value: unknown): string[] {
  if (!Array.isArray(value)) {return []}

  return value.filter((item): item is string => typeof item === 'string')
}

/* ============================== adapter ============================== */

// BACKEND-TODO(rules): [D-10, research/11 §4] local persistence only — the future backend call is
// `rules.add/remove` against a profile/rules endpoint.
export const localRulesAdapter: RulesAdapter = {
  list() {
    return $rules.get()
  },

  add(rule) {
    const text = rule.trim()

    if (!text) {return false}

    const rules = $rules.get()

    if (rules.includes(text)) {return false}

    $rules.set([...rules, text])

    return true
  },

  remove(index) {
    const rules = $rules.get()

    if (index < 0 || index >= rules.length) {return false}

    $rules.set([...rules.slice(0, index), ...rules.slice(index + 1)])

    return true
  }
}

/* ============================== store ============================== */

/** Reactive store behind the adapter (see tasks.ts for the pattern). */
export const $rules = atom<string[]>(readLocalRecord(WORKSPACE_KEY.rules, [], sanitizeRules))

$rules.subscribe(rules => {
  // BACKEND-TODO(rules): [D-10, research/11 §4] replace with the real `rules.list` sync when the
  // backend lands; until then this is the persistence point.
  writeLocalRecord(WORKSPACE_KEY.rules, rules)
})
