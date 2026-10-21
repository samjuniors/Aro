/**
 * Aro design axes — the three presentation-only axes from the prototype's
 * AppearanceSettings: `data-design` (5 structural profiles), `data-density`
 * (comfortable | compact) and `data-motion` (system | reduced).
 *
 * Prototype source: `prototype/src/workbench/lib/app.tsx` (attribute boot),
 * `prototype/src/workbench/components/AppearanceSettings.tsx` (setters),
 * `prototype/src/app/globals.css` "DESIGN SYSTEM PROFILES" (tokens).
 *
 * Persistence stays in the prototype's `conductor.*` namespace (DECISIONS
 * D-0011) — renderer-internal presentation state, excluded from
 * WIRE_BASELINE by design. The theme axis is NOT here: the port's theme
 * source of truth is the Hermes theme store (`hermes-desktop-theme-v2`,
 * `themes/context.tsx` `skinPref`) — see FEATURE_MAP `themes`.
 *
 * The prototype's "switching a design profile also switches its default
 * theme" coupling is deferred to the A11 settings fold-in: the port's theme
 * store is per-profile Hermes state, and A0 must not couple the axes to it
 * before the settings surface that explains the coupling exists.
 */

export const DESIGN_PROFILES = ['aro', 'codex', 'claude', 'editorial', 'cursor'] as const
export type DesignProfile = (typeof DESIGN_PROFILES)[number]

export const DENSITY_VALUES = ['comfortable', 'compact'] as const
export type Density = (typeof DENSITY_VALUES)[number]

export const MOTION_VALUES = ['system', 'reduced'] as const
export type Motion = (typeof MOTION_VALUES)[number]

/** Storage keys — prototype namespace, kept as-is (D-0011). */
export const DESIGN_AXIS_KEYS = {
  design: 'conductor.design',
  density: 'conductor.density',
  motion: 'conductor.motion'
} as const

const DEFAULT_DESIGN: DesignProfile = 'aro'
const DEFAULT_DENSITY: Density = 'comfortable'
const DEFAULT_MOTION: Motion = 'system'

const readPref = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writePref = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // storage unavailable — the axis just stops persisting
  }
}

const oneOf = <T extends string>(allowed: readonly T[], fallback: T, raw: string | null): T =>
  raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback

export function getDesignProfile(): DesignProfile {
  return oneOf(DESIGN_PROFILES, DEFAULT_DESIGN, readPref(DESIGN_AXIS_KEYS.design))
}

export function getDensity(): Density {
  return oneOf(DENSITY_VALUES, DEFAULT_DENSITY, readPref(DESIGN_AXIS_KEYS.density))
}

export function getMotion(): Motion {
  return oneOf(MOTION_VALUES, DEFAULT_MOTION, readPref(DESIGN_AXIS_KEYS.motion))
}

/**
 * Apply all three axes to a root element, reading persisted values and
 * normalizing anything invalid to the defaults — the prototype's boot
 * effect (`app.tsx:131–136`) on the port's opt-in root.
 */
export function applyDesignAxes(root: HTMLElement = document.documentElement): void {
  root.dataset.design = getDesignProfile()
  root.dataset.density = getDensity()
  root.dataset.motion = getMotion()
}

export function setDesignProfile(profile: DesignProfile): void {
  writePref(DESIGN_AXIS_KEYS.design, profile)
  document.documentElement.dataset.design = profile
}

export function setDensity(density: Density): void {
  writePref(DESIGN_AXIS_KEYS.density, density)
  document.documentElement.dataset.density = density
}

export function setMotion(motion: Motion): void {
  writePref(DESIGN_AXIS_KEYS.motion, motion)
  document.documentElement.dataset.motion = motion
}

/**
 * Recommended Hermes built-in themes per design profile.
 * Resolves the deferred A11 theme-profile coupling:
 * - Aro, Codex, Cursor default to Obsidian (deep dark surface).
 * - Claude Code defaults to Ember (warm graphite).
 * - Editorial defaults to Nous (classic high-contrast).
 */
export const RECOMMENDED_THEMES: Record<DesignProfile, string> = {
  aro: 'obsidian',
  codex: 'obsidian',
  claude: 'ember',
  editorial: 'nous',
  cursor: 'obsidian'
} as const

export const THEME_SYNC_KEY = 'conductor.design.syncTheme'

export function getThemeSyncEnabled(): boolean {
  return readPref(THEME_SYNC_KEY) === 'true'
}

export function setThemeSyncEnabled(enabled: boolean): void {
  writePref(THEME_SYNC_KEY, enabled ? 'true' : 'false')
}

export const VOICE_ORB_KEY = 'conductor.voice.orb'

export function getVoiceOrbVisible(): boolean {
  const stored = readPref(VOICE_ORB_KEY)

  if (stored !== null) {
    return stored !== 'false'
  }

  try {
    const hermesVal = window.localStorage.getItem('hermes.desktop.voice.orb.visible')

    if (hermesVal !== null) {
      return hermesVal !== 'false'
    }
  } catch {
    // storage error
  }

  return true
}

export function setVoiceOrbVisible(visible: boolean): void {
  writePref(VOICE_ORB_KEY, visible ? 'true' : 'false')

  try {
    window.localStorage.setItem('hermes.desktop.voice.orb.visible', visible ? 'true' : 'false')
  } catch {
    // storage error
  }

  window.dispatchEvent(new CustomEvent('conductor:voice:orb', { detail: visible }))
}

export const MERGE_STRATEGY_KEY = 'conductor.pref.merge'
export const MERGE_STRATEGIES = ['merge', 'rebase', 'squash'] as const
export type MergeStrategy = (typeof MERGE_STRATEGIES)[number]

export function getMergeStrategy(): MergeStrategy {
  return oneOf(MERGE_STRATEGIES, 'merge', readPref(MERGE_STRATEGY_KEY))
}

export function setMergeStrategy(strategy: MergeStrategy): void {
  writePref(MERGE_STRATEGY_KEY, strategy)
}

export const AMBIENT_STARS_KEY = 'conductor.ambient.stars'

export function getAmbientStarsEnabled(): boolean {
  const stored = readPref(AMBIENT_STARS_KEY)

  if (stored !== null) {
    return stored !== 'false'
  }

  return true
}

export function setAmbientStarsEnabled(enabled: boolean): void {
  writePref(AMBIENT_STARS_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent('conductor:ambient:stars', { detail: enabled }))
}

