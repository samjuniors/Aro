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
