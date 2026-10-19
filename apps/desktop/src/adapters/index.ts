/**
 * ARO PORT — ADAPTER REGISTRY (Phase 3 boundary module).
 *
 * One place decides, per feature area, whether the UI talks to the real
 * Hermes backend or to a persisted local implementation. UI components
 * import ONLY these interfaces (or the reactive stores the adapters
 * export) — never IPC, REST, or backend modules directly. Moving a
 * feature from `local` to `hermes` later is a one-line registry change
 * (plus the new adapter file); component code does not change.
 *
 * ── Naming layers (skill rule; port/GLOSSARY.md) ─────────────────────────
 * Interface + entity names are the PROTOTYPE's. Hermes names live only
 * inside `hermes` implementations. Wire/persisted names the backend owns
 * (IPC channels, RPC methods, `/api/*` routes, config keys, storage keys)
 * are never renamed by this layer — see port/WIRE_BASELINE.md §A–F.
 *
 * ── Area map (port/FEATURE_MAP.md statuses) ───────────────────────────────
 * `wired` areas (60 rows) already run through the host's own adopted
 * layer — `src/api/*` + `src/sdk/*` + `src/store/*` + `lib/desktop-fs.ts`
 * (byte-identical to merge-base, D-0022). In resume mode those modules ARE
 * the hermes implementation; wrapping them again here would be a rewrite
 * of working code, so the registry lists them by reference:
 *
 *   chat core / composer / sessions ……… @/store/* + @/sdk/* (gateway RPC)
 *   files tree / git review ………………………… lib/desktop-fs.ts, lib/desktop-git.ts
 *   capabilities (skills/tools/connectors) …… @/api/{skills,toolsets,mcp}.ts
 *   projects / workspace ……………………………… @/store/projects.ts (fork §G wires)
 *   voice / STT / TTS ………………………………………… /api/audio/* (host adoption)
 *   aro bridge ………………………………………………… preload aroBridge (§G.3/G.4)
 *
 * The registry entries below are the areas with NO Hermes counterpart
 * (`local` rows) — each persists under the prototype's `conductor.*`
 * namespace (D-0011) and carries a BACKEND-TODO marker at its future
 * backend seam.
 */

import { $customAgents, localAgentsAdapter } from './agents'
import { $previewTabs, $previewViewport, localBrowserPreviewAdapter } from './browser-preview'
import { localCodeSearchAdapter } from './code-search'
import { localDoctorAdapter } from './doctor'
import { $preferredIde, EDITOR_CATALOG, localEditorsAdapter } from './editors'
import { $rules, localRulesAdapter } from './rules'
import { $userTasks, localTasksAdapter } from './tasks'

export const adapters = {
  /** local — BACKEND-TODO(tasks): `tasks.list/create/update` per project. */
  tasks: localTasksAdapter,
  /** local — BACKEND-TODO(rules): `rules.list/add/remove`. */
  rules: localRulesAdapter,
  /** local — BACKEND-TODO(agents): `agents.list/register`. */
  agents: localAgentsAdapter,
  /** local — BACKEND-TODO(editors): [D-10, research/11 §1] `editors.list/detect`; open = OS protocol launch. */
  editors: localEditorsAdapter,
  /** local — BACKEND-TODO(code-search): [D-10, research/11 §2] future `search` RPC. */
  codeSearch: localCodeSearchAdapter,
  /** local — BACKEND-TODO(browser-preview): [D-10, research/11 §3] future `preview.*` events. */
  browserPreview: localBrowserPreviewAdapter,
  /** local — BACKEND-TODO(onboarding-doctor): `ops.doctor` summary. */
  doctor: localDoctorAdapter
} satisfies Record<string, unknown>

export type Adapters = typeof adapters

export type { AgentAdapterEntry, AgentKind, AgentModelRef, AgentsAdapter, AgentStatus } from './agents'
export type { BrowserPreviewAdapter, BrowserTab, ViewportId } from './browser-preview'
export type { CodeSearchAdapter, CodeSearchQuery, CodeSearchResult, SearchHit } from './code-search'
export type { DoctorAdapter, DoctorCheck, DoctorCheckState } from './doctor'
export type { EditorInstall, ExternalEditorsAdapter, SupportedIde } from './editors'
export type { RulesAdapter } from './rules'
/* Re-exports: components import interface types and stores from here. */
export type { NewTaskInput, TasksAdapter, WorkspaceTask, WorkspaceTaskStatus } from './tasks'
export {
  $customAgents,
  $preferredIde,
  $previewTabs,
  $previewViewport,
  $rules,
  $userTasks,
  EDITOR_CATALOG
}
