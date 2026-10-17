/**
 * ARO APPEARANCE SETTINGS & PREFERENCES INTEGRATION (Area 11)
 *
 * Integrates the prototype's Design System profiles, density, motion,
 * voice orb visibility, and git merge preference into the Hermes Settings
 * architecture via the sanctioned `APPEARANCE_AREAS.extra` seam.
 *
 * Resolves the deferred theme-profile coupling:
 * - Recommends compatible themes (Obsidian, Ember, Nous) without clobbering stored user preferences.
 * - Provides an explicit auto-sync option (persisted in `conductor.design.syncTheme`).
 * - Quick-links to A10 dedicated surfaces (/aro-rules, /aro-agents, /aro-doctor).
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Pill } from '@/app/settings/primitives'
import { triggerHaptic } from '@/lib/haptics'
import { Book, ChevronRight, Users } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useTheme } from '@/themes/context'

import {
  type Density,
  DENSITY_VALUES,
  type DesignProfile,
  getDensity,
  getDesignProfile,
  getMergeStrategy,
  getMotion,
  getThemeSyncEnabled,
  getVoiceOrbVisible,
  MERGE_STRATEGIES,
  type MergeStrategy,
  type Motion,
  MOTION_VALUES,
  RECOMMENDED_THEMES,
  setDensity,
  setDesignProfile,
  setMergeStrategy,
  setMotion,
  setThemeSyncEnabled,
  setVoiceOrbVisible
} from './design-axes'
import {
  IconCheck,
  IconGit,
  IconLayers,
  IconMic,
  IconPalette,
  IconPulse
} from './Icons'
import {
  ARO_AGENTS_ROUTE,
  ARO_DESIGN_ROUTE,
  ARO_DOCTOR_ROUTE,
  ARO_RULES_ROUTE
} from './register'

interface DesignProfileItem {
  id: DesignProfile
  label: string
  source: string
  summary: string
  swatch: [string, string, string, string] // [baseBg, panelBg, text/accent, highlight]
  recommendedTheme: string
}

const DESIGN_PROFILE_ITEMS: readonly DesignProfileItem[] = [
  {
    id: 'aro',
    label: 'Aro',
    source: 'Aro Standard',
    summary: 'Balanced dark control surface. Violet signal, cyan state, generous context panel, soft elevation.',
    swatch: ['#0c0e14', '#12151d', '#8f82ff', '#35d6c4'],
    recommendedTheme: 'obsidian'
  },
  {
    id: 'codex',
    label: 'Codex',
    source: 'Codex Desktop',
    summary: 'Project-first, quiet monochrome, tight rows, review-forward diff layout.',
    swatch: ['#0a0a0b', '#111214', '#d6d6d2', '#8f8f88'],
    recommendedTheme: 'obsidian'
  },
  {
    id: 'claude',
    label: 'Claude Code',
    source: 'Claude Code Desktop',
    summary: 'Session-centric warm graphite. Conversation first, generous corners, status clarity.',
    swatch: ['#181614', '#25211e', '#e29a68', '#a9c7ad'],
    recommendedTheme: 'ember'
  },
  {
    id: 'editorial',
    label: 'Editorial',
    source: 'Editorial Reference',
    summary: 'Magazine rhythm: serif display, squared panels, hard rules, high contrast.',
    swatch: ['#f8f3ea', '#fffdf8', '#17130e', '#df5e2e'],
    recommendedTheme: 'ink'
  },
  {
    id: 'cursor',
    label: 'Cursor',
    source: 'Cursor 2.x Lineage',
    summary: 'VS Code lineage: compact, keyboard-first, small type, dense rows, subtle blue signal.',
    swatch: ['#0d1117', '#161b22', '#58a6ff', '#3fb950'],
    recommendedTheme: 'obsidian'
  }
]

const PROTOTYPE_THEMES = [
  { id: 'obsidian', label: 'Obsidian', desc: 'Deep neutral dark · violet accent', swatch: ['#0c0e14', '#12151d', '#7c6bff', '#35d6c4'] },
  { id: 'daylight', label: 'Daylight', desc: 'Clean light · high legibility', swatch: ['#ffffff', '#f4f5f8', '#5b4ce6', '#0f9f90'] },
  { id: 'nord', label: 'Nord', desc: 'Arctic blue-grey · frost accent', swatch: ['#2a303b', '#313845', '#88c0d0', '#a3be8c'] },
  { id: 'ember', label: 'Ember', desc: 'Warm charcoal · copper accent', swatch: ['#171210', '#1f1815', '#ff8a4c', '#4fd1b5'] },
  { id: 'paper', label: 'Paper', desc: 'Warm light · ink on paper', swatch: ['#faf7f0', '#f4f0e6', '#8a5cf6', '#0f8f86'] },
  { id: 'ink', label: 'Ink', desc: 'Editorial dark · serif on near-black', swatch: ['#14110d', '#1c1813', '#e2e8e0', '#e8663a'] },
] as const

const DESIGN_SPECS: Record<DesignProfile, {
  label: string
  type: { display: string; body: string; meta: string; mono: string }
  panels: { sidebar: number; context: number }
  shape: { radiusPanel: string; radiusControl: string }
}> = {
  aro: {
    label: 'Aro',
    type: { display: 'Space Grotesk · 23–30px', body: 'Inter · 13.5px', meta: 'Inter · 11–12px', mono: 'JetBrains Mono · 11–11.5px' },
    panels: { sidebar: 272, context: 368 },
    shape: { radiusPanel: '10px', radiusControl: '7px' }
  },
  codex: {
    label: 'Codex',
    type: { display: 'Inter · 19–22px', body: 'Inter · 13px', meta: 'Inter · 11.5px', mono: 'JetBrains Mono · 11px' },
    panels: { sidebar: 292, context: 400 },
    shape: { radiusPanel: '8px', radiusControl: '6px' }
  },
  claude: {
    label: 'Claude Code',
    type: { display: 'Inter · 21–26px', body: 'Inter · 13.5px', meta: 'Inter · 12px', mono: 'JetBrains Mono · 11.5px' },
    panels: { sidebar: 284, context: 382 },
    shape: { radiusPanel: '12px', radiusControl: '8px' }
  },
  editorial: {
    label: 'Editorial',
    type: { display: 'Newsreader · 34–44px', body: 'DM Sans · 13.5px', meta: 'DM Sans · 11.5px', mono: 'JetBrains Mono · 11.5px' },
    panels: { sidebar: 304, context: 420 },
    shape: { radiusPanel: '4px', radiusControl: '3px' }
  },
  cursor: {
    label: 'Cursor',
    type: { display: 'Inter · 17–20px', body: 'Inter · 12.5px', meta: 'Inter · 11px', mono: 'JetBrains Mono · 10.5px' },
    panels: { sidebar: 248, context: 352 },
    shape: { radiusPanel: '6px', radiusControl: '5px' }
  }
}

export function AroAppearanceSettings() {
  const navigate = useNavigate()
  const { themeName, setTheme } = useTheme()

  const [currentProfile, setCurrentProfile] = useState<DesignProfile>(getDesignProfile)
  const [currentDensity, setCurrentDensity] = useState<Density>(getDensity)
  const [currentMotion, setCurrentMotion] = useState<Motion>(getMotion)
  const [syncTheme, setSyncTheme] = useState<boolean>(getThemeSyncEnabled)
  const [voiceOrb, setVoiceOrb] = useState<boolean>(getVoiceOrbVisible)
  const [mergeStrategy, setMergeStrategyState] = useState<MergeStrategy>(getMergeStrategy)
  const [themeFeedback, setThemeFeedback] = useState<string | null>(null)

  // Listen for storage events (e.g. from peer windows)
  useEffect(() => {
    const handleStorage = () => {
      setCurrentProfile(getDesignProfile())
      setCurrentDensity(getDensity())
      setCurrentMotion(getMotion())
      setSyncTheme(getThemeSyncEnabled())
      setVoiceOrb(getVoiceOrbVisible())
      setMergeStrategyState(getMergeStrategy())
    }

    window.addEventListener('storage', handleStorage)

    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleSelectProfile = useCallback(
    (profile: DesignProfile) => {
      setCurrentProfile(profile)
      setDesignProfile(profile)
      triggerHaptic('selection')

      const rawRecommended = RECOMMENDED_THEMES[profile]
      const recommended = rawRecommended === 'nous' ? 'ink' : rawRecommended

      if (syncTheme && recommended && recommended !== themeName) {
        setTheme(recommended)
        try {
          localStorage.setItem('aro.theme', recommended)
          document.documentElement.dataset.theme = recommended
          const isLight = recommended === 'daylight' || recommended === 'paper'
          document.documentElement.classList.toggle('dark', !isLight)
          document.documentElement.style.setProperty('color-scheme', isLight ? 'light' : 'dark')
          window.dispatchEvent(new CustomEvent('aro:theme', { detail: recommended }))
        } catch {}
        setThemeFeedback(`Switched theme to ${recommended}`)
        setTimeout(() => setThemeFeedback(null), 3000)
      }
    },
    [syncTheme, themeName, setTheme]
  )

  const handleApplyRecommendedTheme = useCallback(
    (recommended: string) => {
      setTheme(recommended)
      try {
        localStorage.setItem('aro.theme', recommended)
        document.documentElement.dataset.theme = recommended
        const isLight = recommended === 'daylight' || recommended === 'paper'
        document.documentElement.classList.toggle('dark', !isLight)
        document.documentElement.style.setProperty('color-scheme', isLight ? 'light' : 'dark')
        window.dispatchEvent(new CustomEvent('aro:theme', { detail: recommended }))
      } catch {}
      triggerHaptic('success')
      setThemeFeedback(`Applied recommended theme: ${recommended}`)
      setTimeout(() => setThemeFeedback(null), 3000)
    },
    [setTheme]
  )

  const handleToggleSyncTheme = useCallback((checked: boolean) => {
    setSyncTheme(checked)
    setThemeSyncEnabled(checked)
    triggerHaptic('selection')
  }, [])

  const handleSelectDensity = useCallback((density: Density) => {
    setCurrentDensity(density)
    setDensity(density)
    triggerHaptic('selection')
  }, [])

  const handleSelectMotion = useCallback((motion: Motion) => {
    setCurrentMotion(motion)
    setMotion(motion)
    triggerHaptic('selection')
  }, [])

  const handleToggleVoiceOrb = useCallback((checked: boolean) => {
    setVoiceOrb(checked)
    setVoiceOrbVisible(checked)
    triggerHaptic('selection')
  }, [])

  const handleSelectMergeStrategy = useCallback((strategy: MergeStrategy) => {
    setMergeStrategyState(strategy)
    setMergeStrategy(strategy)
    triggerHaptic('selection')
  }, [])

  const selectedItem = DESIGN_PROFILE_ITEMS.find(p => p.id === currentProfile) ?? DESIGN_PROFILE_ITEMS[0]
  const isRecommendedActive = selectedItem.recommendedTheme === themeName

  return (
    <div className="mt-8 space-y-6 border-t border-(--ui-border-soft) pt-8" id="aro-appearance-settings">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <IconPalette className="text-accent" size={18} />
            <h3 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
              Aro Design System & Preferences
            </h3>
            <Pill tone="primary">Aro UI</Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Structural design profiles, layout density, animation motion, and local workspace preferences.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-control border border-(--ui-border-soft) bg-card/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
          onClick={() => navigate(ARO_DESIGN_ROUTE)}
          type="button"
        >
          <IconLayers size={14} />
          <span>Design Spec & Tokens</span>
          <ChevronRight className="size-3" />
        </button>
      </div>

      {/* 1. Design System Profiles Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Design System Profile
          </h4>
          <span className="font-mono text-xs text-muted-foreground">
            Active: <strong className="text-foreground">{selectedItem.label}</strong>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DESIGN_PROFILE_ITEMS.map(item => {
            const isSelected = currentProfile === item.id

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  'group flex flex-col overflow-hidden rounded-overlay border text-left transition-colors',
                  isSelected
                    ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-(--aro-shadow-e1)'
                    : 'border-(--ui-border-soft) bg-card/40 hover:border-border hover:bg-card/70'
                )}
                key={item.id}
                onClick={() => handleSelectProfile(item.id)}
                type="button"
              >
                {/* Mockup preview */}
                <div
                  className="h-20 w-full p-2.5 transition-opacity"
                  style={{ background: item.swatch[0], color: item.swatch[2] }}
                >
                  <div
                    className="flex h-full gap-1.5 rounded-control border p-1.5"
                    style={{ background: item.swatch[1], borderColor: `${item.swatch[2]}33` }}
                  >
                    {/* Mini Sidebar */}
                    <div className="w-1/4 space-y-1 border-r border-current/15 pr-1">
                      <div className="h-1 w-3/4 rounded-full bg-current opacity-75" />
                      <div className="h-0.5 w-full rounded-full bg-current opacity-25" />
                      <div className="h-0.5 w-4/5 rounded-full bg-current opacity-25" />
                      <div className="h-0.5 w-1/2 rounded-full bg-current opacity-25" />
                    </div>
                    {/* Mini Workspace Content */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="space-y-1">
                        <div className="h-1 w-2/3 rounded-full bg-current opacity-70" />
                        <div className="h-0.5 w-full rounded-full bg-current opacity-25" />
                        <div className="h-0.5 w-4/5 rounded-full bg-current opacity-20" />
                      </div>
                      <div className="flex h-3.5 items-center justify-end gap-1 rounded-control border border-current/20 px-1">
                        <div className="h-0.5 w-5 rounded-full bg-current opacity-40" />
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ background: item.swatch[3] }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                        {item.label}
                      </span>
                      {isSelected && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <IconCheck className="stroke-[3]" size={11} />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-aro-xs text-muted-foreground line-clamp-1">
                      {item.source}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-(--ui-text-tertiary) line-clamp-2">
                      {item.summary}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-(--ui-border-soft)/60 pt-2 text-[var(--aro-text-2xs,10px)] text-muted-foreground">
                    <span>Theme: {item.recommendedTheme}</span>
                    <span className="font-mono">data-design="{item.id}"</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Theme Coupling Resolution & Recommendation */}
        <div className="rounded-panel border border-(--ui-border-soft) bg-card/50 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Theme Recommendation:</span>
                <span className="capitalize font-semibold text-accent">{selectedItem.recommendedTheme}</span>
                {isRecommendedActive ? (
                  <Pill tone="success">In Sync</Pill>
                ) : (
                  <Pill tone="muted">Active: {themeName}</Pill>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Hermes themes are preserved per-profile. Auto-sync is opt-in so your saved skin is never silently overwritten.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isRecommendedActive && (
                <button
                  className="rounded-control bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground shadow-xs hover:bg-accent/90 transition-colors"
                  onClick={() => handleApplyRecommendedTheme(selectedItem.recommendedTheme)}
                  type="button"
                >
                  Apply {selectedItem.recommendedTheme}
                </button>
              )}
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                <input
                  checked={syncTheme}
                  className="size-3.5 rounded-control border-(--ui-border-soft) text-accent focus:ring-accent"
                  onChange={e => handleToggleSyncTheme(e.target.checked)}
                  type="checkbox"
                />
                <span>Auto-sync theme</span>
              </label>
            </div>
          </div>

          {themeFeedback && (
            <div className="mt-2 text-xs font-medium text-accent animate-aro-fade">
              ✓ {themeFeedback}
            </div>
          )}
        </div>
      </section>

      {/* 2. Color Themes (Prototype canonical palette) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Color Theme
          </h4>
          <span className="font-mono text-xs text-muted-foreground">
            Active: <strong className="text-foreground capitalize">{themeName}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {PROTOTYPE_THEMES.map(item => {
            const isActive = themeName === item.id

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'flex min-w-[130px] items-center gap-2.5 rounded-control border px-3 py-2 text-xs font-medium transition-colors select-none',
                  isActive
                    ? 'border-accent bg-accent/10 text-foreground ring-1 ring-accent shadow-xs'
                    : 'border-(--ui-border-soft) bg-card/50 text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground'
                )}
                key={item.id}
                onClick={() => handleApplyRecommendedTheme(item.id)}
                type="button"
              >
                <span className="flex overflow-hidden rounded-control border border-black/20 dark:border-white/10 shrink-0">
                  {item.swatch.map(color => (
                    <i className="h-4 w-2" key={color} style={{ background: color }} />
                  ))}
                </span>
                <span className="truncate">{item.label}</span>
                {isActive && <IconCheck className="ml-auto size-3 shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. Density & Motion Controls */}
      <section className="divide-y divide-(--ui-border-soft) rounded-overlay border border-(--ui-border-soft) bg-card/40">
        {/* Density */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-foreground">Layout Density</span>
            <p className="text-xs text-muted-foreground">
              Adjusts sidebar navigation item heights (28px vs 34px), padding, and transcript row spacing.
            </p>
          </div>
          <div className="inline-flex rounded-panel border border-(--ui-border-soft) bg-background/80 p-0.5">
            {DENSITY_VALUES.map(density => {
              const active = currentDensity === density

              return (
                <button
                  className={cn(
                    'rounded-control px-3 py-1 text-xs font-medium capitalize transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  key={density}
                  onClick={() => handleSelectDensity(density)}
                  type="button"
                >
                  {density}
                </button>
              )
            })}
          </div>
        </div>

        {/* Motion */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-foreground">Animation Motion</span>
            <p className="text-xs text-muted-foreground">
              Follow system accessibility preferences or suppress non-essential animations.
            </p>
          </div>
          <div className="inline-flex rounded-panel border border-(--ui-border-soft) bg-background/80 p-0.5">
            {MOTION_VALUES.map(motion => {
              const active = currentMotion === motion

              return (
                <button
                  className={cn(
                    'rounded-control px-3 py-1 text-xs font-medium capitalize transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  key={motion}
                  onClick={() => handleSelectMotion(motion)}
                  type="button"
                >
                  {motion}
                </button>
              )
            })}
          </div>
        </div>

        {/* Voice Orb Visibility */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <IconMic className="text-accent" size={14} />
              <span className="text-xs font-medium text-foreground">Voice Assistant Orb</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Show the hands-free voice orb overlay on screen (Task 7 / Area 9 portal integration).
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              checked={voiceOrb}
              className="sr-only peer"
              onChange={e => handleToggleVoiceOrb(e.target.checked)}
              type="checkbox"
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-accent"></div>
          </label>
        </div>

        {/* Git Merge Strategy Preference */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <IconGit className="text-muted-foreground" size={14} />
              <span className="text-xs font-medium text-foreground">Preferred Git Merge Strategy</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Default branch integration strategy (local preference record in conductor.pref.merge).
            </p>
          </div>
          <div className="inline-flex rounded-panel border border-(--ui-border-soft) bg-background/80 p-0.5">
            {MERGE_STRATEGIES.map(strategy => {
              const active = mergeStrategy === strategy

              return (
                <button
                  className={cn(
                    'rounded-control px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  key={strategy}
                  onClick={() => handleSelectMergeStrategy(strategy)}
                  type="button"
                >
                  {strategy}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. Quick Links to Aro Local Surfaces */}
      <section className="space-y-2.5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Aro Local Surfaces & Tools
        </h4>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            className="flex items-center justify-between gap-2 rounded-panel border border-(--ui-border-soft) bg-card/30 p-3 text-left hover:border-border hover:bg-card/70 transition-colors"
            onClick={() => navigate(ARO_RULES_ROUTE)}
            type="button"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Book className="size-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">Global Rules</span>
              </div>
              <p className="text-aro-xs text-muted-foreground">Workspace instructions</p>
            </div>
            <ChevronRight className="size-3 text-muted-foreground" />
          </button>

          <button
            className="flex items-center justify-between gap-2 rounded-panel border border-(--ui-border-soft) bg-card/30 p-3 text-left hover:border-border hover:bg-card/70 transition-colors"
            onClick={() => navigate(ARO_AGENTS_ROUTE)}
            type="button"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">Agent Adapters</span>
              </div>
              <p className="text-aro-xs text-muted-foreground">Custom catalog & subagents</p>
            </div>
            <ChevronRight className="size-3 text-muted-foreground" />
          </button>

          <button
            className="flex items-center justify-between gap-2 rounded-panel border border-(--ui-border-soft) bg-card/30 p-3 text-left hover:border-border hover:bg-card/70 transition-colors"
            onClick={() => navigate(ARO_DOCTOR_ROUTE)}
            type="button"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <IconPulse className="text-accent" size={14} />
                <span className="text-xs font-medium text-foreground">Aro Doctor</span>
              </div>
              <p className="text-aro-xs text-muted-foreground">Readiness & diagnostics</p>
            </div>
            <ChevronRight className="size-3 text-muted-foreground" />
          </button>

          <button
            className="flex items-center justify-between gap-2 rounded-panel border border-(--ui-border-soft) bg-card/30 p-3 text-left hover:border-border hover:bg-card/70 transition-colors"
            onClick={() => navigate(ARO_DESIGN_ROUTE)}
            type="button"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <IconLayers className="text-accent" size={14} />
                <span className="text-xs font-medium text-foreground">Design Spec</span>
              </div>
              <p className="text-aro-xs text-muted-foreground">Tokens & primitives</p>
            </div>
            <ChevronRight className="size-3 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* 4. Specifications */}
      <section className="border-t border-(--ui-border-soft) pt-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {DESIGN_SPECS[currentProfile]?.label ?? selectedItem.label} Specifications
        </h4>
        <div className="mt-2.5 grid gap-x-6 gap-y-1.5 font-mono text-aro-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Display</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.type.display}</span>
          </div>
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Body</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.type.body}</span>
          </div>
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Meta</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.type.meta}</span>
          </div>
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Mono</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.type.mono}</span>
          </div>
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Sidebar / Context</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.panels.sidebar}px / {DESIGN_SPECS[currentProfile]?.panels.context}px</span>
          </div>
          <div className="flex justify-between border-b border-(--ui-border-soft)/40 pb-1">
            <span>Panel / Control Radius</span>
            <span className="text-foreground">{DESIGN_SPECS[currentProfile]?.shape.radiusPanel} / {DESIGN_SPECS[currentProfile]?.shape.radiusControl}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
