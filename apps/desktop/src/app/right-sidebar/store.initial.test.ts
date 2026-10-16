import { beforeEach, describe, expect, it, vi } from 'vitest'

const SECTION_KEY = 'conductor.workspace.panel.section'
const OPEN_TABS_KEY = 'conductor.workspace.panel.openTabs'

describe('initial workspace tab state', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it('includes the default active Files section in the default open tabs', async () => {
    const { $rightSidebarSection, $workspaceOpenTabs } = await import('./store')

    expect($rightSidebarSection.get()).toBe('files')
    expect($workspaceOpenTabs.get()).toContain('files')
  })

  it('includes a persisted active section missing from an older open-tab list', async () => {
    window.localStorage.setItem(SECTION_KEY, 'context')
    window.localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(['changes', 'terminal']))

    const { $rightSidebarSection, $workspaceOpenTabs } = await import('./store')

    expect($rightSidebarSection.get()).toBe('context')
    expect($workspaceOpenTabs.get()).toEqual(['context', 'changes', 'terminal'])
  })
})
