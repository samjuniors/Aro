import { beforeEach, describe, expect, it } from 'vitest'

import {
  $aroFeatures,
  ARO_FEATURE_METADATA,
  ARO_FLAGS_STORAGE_KEY,
  DEFAULT_ARO_FLAGS,
  isAroFeatureEnabled,
  resetAroFeatures,
  setAroFeature
} from './flags'

describe('Aro Feature Flags (flags.ts)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAroFeatures()
  })

  it('exposes expected defaults for all 5 Phase 13 vertical slices', () => {
    const flags = $aroFeatures.get()
    expect(flags).toEqual(DEFAULT_ARO_FLAGS)
    expect(flags.reviewHunks).toBe(true)
    expect(flags.ambientCostHud).toBe(true)
    expect(flags.parallelTasksBoard).toBe(true)
    expect(flags.inAppBrowserPreview).toBe(true)
    expect(flags.editorDeepLink).toBe(true)
  })

  it('provides feature metadata with slice markers', () => {
    expect(ARO_FEATURE_METADATA.reviewHunks.slice).toBe('13.S1')
    expect(ARO_FEATURE_METADATA.ambientCostHud.slice).toBe('13.S2')
    expect(ARO_FEATURE_METADATA.parallelTasksBoard.slice).toBe('13.S3')
    expect(ARO_FEATURE_METADATA.inAppBrowserPreview.slice).toBe('13.S4')
    expect(ARO_FEATURE_METADATA.editorDeepLink.slice).toBe('13.S5')
  })

  it('toggles a feature flag and persists to localStorage', () => {
    expect(isAroFeatureEnabled('reviewHunks')).toBe(true)

    setAroFeature('reviewHunks', false)

    expect(isAroFeatureEnabled('reviewHunks')).toBe(false)
    expect($aroFeatures.get().reviewHunks).toBe(false)

    const stored = JSON.parse(window.localStorage.getItem(ARO_FLAGS_STORAGE_KEY) || '{}')
    expect(stored.reviewHunks).toBe(false)
  })

  it('resets feature flags back to defaults', () => {
    setAroFeature('reviewHunks', false)
    setAroFeature('ambientCostHud', false)
    expect(isAroFeatureEnabled('reviewHunks')).toBe(false)
    expect(isAroFeatureEnabled('ambientCostHud')).toBe(false)

    resetAroFeatures()

    expect(isAroFeatureEnabled('reviewHunks')).toBe(true)
    expect(isAroFeatureEnabled('ambientCostHud')).toBe(true)
    expect(window.localStorage.getItem(ARO_FLAGS_STORAGE_KEY)).toBeNull()
  })
})
