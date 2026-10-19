/**
 * ARO FEATURE FLAGS
 *
 * Client-side feature flag store for Phase 13 vertical slices:
 *  - reviewHunks: Diff-First Visual Review & Checkpoint Rollback (13.S1)
 *  - ambientCostHud: Ambient Cost HUD & Token Burn Forensics (13.S2)
 *  - parallelTasksBoard: Parallel Subagent Work-Graph & Tasks Board (13.S3)
 *  - inAppBrowserPreview: Live In-App Browser Preview (13.S4)
 *  - editorDeepLink: Bi-directional IDE Deep-Link (13.S5)
 *
 * Defaults to true in development/beta. Persisted in localStorage.
 */

import { atom } from 'nanostores'

export interface AroFeatureFlags {
  reviewHunks: boolean
  ambientCostHud: boolean
  parallelTasksBoard: boolean
  inAppBrowserPreview: boolean
  editorDeepLink: boolean
}

export const DEFAULT_ARO_FLAGS: Readonly<AroFeatureFlags> = Object.freeze({
  reviewHunks: true,
  ambientCostHud: true,
  parallelTasksBoard: true,
  inAppBrowserPreview: true,
  editorDeepLink: true,
})

export const ARO_FEATURE_METADATA: Record<keyof AroFeatureFlags, { title: string; description: string; slice: string }> = {
  reviewHunks: {
    title: 'Diff-First Visual Review',
    description: 'Hunk-level accept/reject/comment decisions and checkpoint rollback before changes land.',
    slice: '13.S1',
  },
  ambientCostHud: {
    title: 'Ambient Cost HUD',
    description: 'Real-time token burn forensics, model cost accumulation, and session budget warnings.',
    slice: '13.S2',
  },
  parallelTasksBoard: {
    title: 'Parallel Tasks Work-Graph',
    description: 'Multi-agent visual task graph with dependency tracking, assignee badges, and criteria checklists.',
    slice: '13.S3',
  },
  inAppBrowserPreview: {
    title: 'In-App Browser Preview',
    description: 'Interactive embedded web preview for agent-driven web applications and artifacts.',
    slice: '13.S4',
  },
  editorDeepLink: {
    title: 'IDE Deep-Linking',
    description: 'One-click hunk jump to VS Code, Cursor, Zed, or JetBrains at exact file and line coordinates.',
    slice: '13.S5',
  },
}

export const ARO_FLAGS_STORAGE_KEY = 'aro.features'

function getInitialFlags(): AroFeatureFlags {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_ARO_FLAGS }
  }

  try {
    const raw = window.localStorage.getItem(ARO_FLAGS_STORAGE_KEY)

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AroFeatureFlags>

      return {
        reviewHunks: typeof parsed.reviewHunks === 'boolean' ? parsed.reviewHunks : DEFAULT_ARO_FLAGS.reviewHunks,
        ambientCostHud: typeof parsed.ambientCostHud === 'boolean' ? parsed.ambientCostHud : DEFAULT_ARO_FLAGS.ambientCostHud,
        parallelTasksBoard: typeof parsed.parallelTasksBoard === 'boolean' ? parsed.parallelTasksBoard : DEFAULT_ARO_FLAGS.parallelTasksBoard,
        inAppBrowserPreview: typeof parsed.inAppBrowserPreview === 'boolean' ? parsed.inAppBrowserPreview : DEFAULT_ARO_FLAGS.inAppBrowserPreview,
        editorDeepLink: typeof parsed.editorDeepLink === 'boolean' ? parsed.editorDeepLink : DEFAULT_ARO_FLAGS.editorDeepLink,
      }
    }
  } catch {
    // Fall back to defaults on corrupt storage
  }

  return { ...DEFAULT_ARO_FLAGS }
}

export const $aroFeatures = atom<AroFeatureFlags>(getInitialFlags())

export function setAroFeature<K extends keyof AroFeatureFlags>(flag: K, value: boolean): void {
  const current = $aroFeatures.get()
  const next = { ...current, [flag]: value }
  $aroFeatures.set(next)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ARO_FLAGS_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('aro:features-changed', { detail: next }))
    } catch {
      // ignore write error
    }
  }
}

export function resetAroFeatures(): void {
  const reset = { ...DEFAULT_ARO_FLAGS }
  $aroFeatures.set(reset)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ARO_FLAGS_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('aro:features-changed', { detail: reset }))
    } catch {
      // ignore
    }
  }
}

export function isAroFeatureEnabled(flag: keyof AroFeatureFlags): boolean {
  return $aroFeatures.get()[flag] ?? false
}
