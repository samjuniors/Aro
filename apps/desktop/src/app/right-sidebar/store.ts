import { atom } from 'nanostores'

import { persistBoolean, readKey, storedBoolean, writeKey } from '@/lib/storage'
import { modeBound } from '@/store/interface-mode'

const TAKEOVER_KEY = 'hermes.desktop.terminalTakeover'

// Simple mode rests the terminal closed without touching this preference; ⌃`
// still brings it up for the session.
const $terminalTakeoverPref = atom(storedBoolean(TAKEOVER_KEY, false))

$terminalTakeoverPref.subscribe(active => persistBoolean(TAKEOVER_KEY, active))

export const $terminalTakeover = modeBound('terminalOpen', $terminalTakeoverPref, active =>
  $terminalTakeoverPref.set(active)
)

export const setTerminalTakeover = (active: boolean) => $terminalTakeover.set(active)

/** A command queued to run in the embedded terminal. The terminal pane flushes
 *  (and clears) it once its session is live, so a value set before the pane
 *  mounts still runs. Cleared after flush so a later remount can't replay it. */
export const $terminalInjection = atom<null | string>(null)

/** Open the terminal pane and run a command in it. Used to disconnect external
 *  (CLI-managed) providers, which Hermes can't clear via the API — the user
 *  sees exactly what runs instead of Hermes silently deleting their creds. */
export const runInTerminal = (command: string) => {
  const trimmed = command.trim()

  if (!trimmed) {
    return
  }

  setTerminalTakeover(true)
  $terminalInjection.set(trimmed)
}

export type ContextSectionId =
  | 'files'
  | 'changes'
  | 'terminal'
  | 'search'
  | 'browser'
  | 'plan'
  | 'context'
  | 'git'
  | 'launchpad'

export const PANEL_SECTION_STORAGE_KEY = 'conductor.workspace.panel.section'

const VALID_SECTIONS = new Set<ContextSectionId>([
  'files',
  'changes',
  'terminal',
  'search',
  'browser',
  'plan',
  'context',
  'git',
  'launchpad'
])

function readInitialSection(): ContextSectionId {
  const stored = readKey(PANEL_SECTION_STORAGE_KEY)

  if (stored && VALID_SECTIONS.has(stored as ContextSectionId)) {
    return stored as ContextSectionId
  }

  return 'files'
}

export const $rightSidebarSection = atom<ContextSectionId>(readInitialSection())

export const WORKSPACE_OPEN_TABS_STORAGE_KEY = 'conductor.workspace.panel.openTabs'

function includeActiveSection(tabs: ContextSectionId[]): ContextSectionId[] {
  const activeSection = $rightSidebarSection.get()

  if (activeSection === 'launchpad' || tabs.includes(activeSection)) {
    return tabs
  }

  return [activeSection, ...tabs]
}

function readInitialOpenTabs(): ContextSectionId[] {
  const stored = readKey(WORKSPACE_OPEN_TABS_STORAGE_KEY)

  if (stored) {
    try {
      const parsed = JSON.parse(stored)

      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(s => VALID_SECTIONS.has(s as ContextSectionId) && s !== 'launchpad') as ContextSectionId[]

        if (valid.length > 0) {
          return includeActiveSection(valid)
        }
      }
    } catch {
      // fallback
    }
  }

  return includeActiveSection(['changes', 'terminal'])
}

export const $workspaceOpenTabs = atom<ContextSectionId[]>(readInitialOpenTabs())

export const openWorkspaceTab = (section: ContextSectionId) => {
  if (section !== 'launchpad') {
    const current = $workspaceOpenTabs.get()

    if (!current.includes(section)) {
      const next = [...current, section]
      $workspaceOpenTabs.set(next)
      writeKey(WORKSPACE_OPEN_TABS_STORAGE_KEY, JSON.stringify(next))
    }
  }

  setRightSidebarSection(section)
}

export const closeWorkspaceTab = (section: ContextSectionId) => {
  const current = $workspaceOpenTabs.get()
  const next = current.filter(s => s !== section)
  $workspaceOpenTabs.set(next)
  writeKey(WORKSPACE_OPEN_TABS_STORAGE_KEY, JSON.stringify(next))

  if ($rightSidebarSection.get() === section) {
    if (next.length > 0) {
      setRightSidebarSection(next[next.length - 1])
    } else {
      setRightSidebarSection('launchpad')
    }
  }
}

export const setRightSidebarSection = (section: ContextSectionId) => {
  writeKey(PANEL_SECTION_STORAGE_KEY, section)
  $rightSidebarSection.set(section)

  if (section !== 'launchpad') {
    const current = $workspaceOpenTabs.get()

    if (!current.includes(section)) {
      const next = [...current, section]
      $workspaceOpenTabs.set(next)
      writeKey(WORKSPACE_OPEN_TABS_STORAGE_KEY, JSON.stringify(next))
    }
  }
}
