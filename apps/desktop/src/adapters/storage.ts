/**
 * ARO LOCAL-ADAPTER STORAGE — persistence for the port's local-only features.
 *
 * Contract (port/FEATURE_MAP.md `local` rows + skill "Local adapters"):
 * every feature with no Hermes counterpart persists HERE, under the
 * PROTOTYPE's storage namespace (`conductor.*`), never under
 * `hermes.desktop.*` / `hermes:desktop:*` (namespaces are disjoint —
 * port/DECISIONS.md D-0011). Keys are the prototype's own names, adopted
 * as-is where the prototype already persisted the same data
 * (`conductor.workspace.v3.*`).
 *
 * All reads/writes funnel through the host's storage choke point
 * (`@/lib/storage` readKey/writeKey) so the existing persistence
 * observer sees local-adapters traffic too. Storage is best-effort: a full
 * or restricted store must never break the UI (same contract as the
 * prototype's `readStored`/`writeStored` helpers).
 */

import { readKey, writeKey } from '@/lib/storage'

/** Read a JSON record; returns `fallback` on absence or malformed data. */
export function readLocalRecord<T>(key: string, fallback: T, sanitize: (value: unknown) => T): T {
  const raw = readKey(key)

  if (raw === null) {return fallback}

  try {
    return sanitize(JSON.parse(raw) as unknown)
  } catch {
    return fallback
  }
}

/** Best-effort JSON write. A null value removes the key. */
export function writeLocalRecord(key: string, value: unknown): void {
  try {
    writeKey(key, value === null ? null : JSON.stringify(value))
  } catch {
    // Best-effort only — quota/permission errors must not break the UI.
  }
}

/** Storage namespace for workspace-scoped user data (prototype key family). */
export const WORKSPACE_KEY = {
  /** User tasks per project — prototype `lib/workspace.tsx` key, adopted. */
  tasks: 'conductor.workspace.v3.tasks',
  /** Global instruction rules — prototype `lib/workspace.tsx` key, adopted. */
  rules: 'conductor.workspace.v3.rules',
  /** User-registered agent adapters (prototype kept a static catalog only). */
  agents: 'conductor.workspace.v3.agents',
  /** Browser-preview tab strip (prototype kept tabs in React state; the
   * skill's local-adapter rules require restart survival). */
  browserTabs: 'conductor.workspace.v3.browser.tabs',
  /** Browser-preview viewport (desktop/tablet/mobile). */
  browserViewport: 'conductor.workspace.v3.browser.viewport'
} as const
