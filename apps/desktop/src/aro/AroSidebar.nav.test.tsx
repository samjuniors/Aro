/**
 * A1 nav-stubs closure (D-0031/D-0035) — the sidebar's Skills and Connectors
 * rows must NAVIGATE to the capabilities page on their own tab instead of
 * toggling a highlight, and the active row must be derived from the current
 * route so `aria-current="page"` is truthful. The Projects row keeps its
 * highlight toggle (its destination is the in-sidebar projects tree, not a
 * routed view — D-0035), and the Settings row gains the same route-derived
 * active contract.
 *
 * The sidebar is rendered for real inside a MemoryRouter; only the IO-bearing
 * modules are mocked (same rationale as surfaces.test.tsx: the module-level
 * import chain of the sidebar reaches stores that talk to sockets at import
 * time). Stores render with their empty defaults — an empty sidebar is all
 * these assertions need.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { atom } from 'nanostores'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AroSidebar } from './AroSidebar'

vi.mock('@/contrib/react/use-contributions', () => ({ useContributions: vi.fn() }))
vi.mock('@/store/connections', () => ({ $activeConnectionId: atom('local') }))
// projects.ts runs $gateway.subscribe(syncReposScanning) at module scope,
// which calls activeGateway() — the mock must answer it (null = no gateway,
// the honest state for these tests).
vi.mock('@/store/gateway', () => ({ $gateway: atom<unknown>(null), activeGateway: () => null }))
vi.mock('@/store/profile', async importOriginal => ({
  ...(await importOriginal()),
  $activeGatewayProfile: atom('default'),
  $profiles: atom<Array<{ id: string }>>([])
}))
vi.mock('@/store/session', async importOriginal => ({
  ...(await importOriginal()),
  $freshDraftReady: atom(false),
  $gatewayState: atom('open'),
  $sessions: atom<Array<{ id: string }>>([])
}))
vi.mock('@/store/connection-registry-state', () => ({
  $connectionsRegistry: atom<Array<{ id: string; label: string }>>([])
}))
vi.mock('@/store/cron', () => ({ $cronJobs: atom<Array<{ id: string }>>([]) }))
vi.mock('@/store/session-dot-state', () => ({
  $sessionDotStateById: atom<Record<string, unknown>>({}),
  showsRunningArc: () => false
}))
// notifications is renderer-internal toast state; the sidebar's import chain
// reaches several of its emitters (projects/session stores call notifyError
// on RPC failures). Mock every export the chain can touch so a failure in a
// store's error path can never break module evaluation.
vi.mock('@/store/notifications', async importOriginal => ({
  ...(await importOriginal()),
  notify: vi.fn(),
  notifyError: vi.fn(),
  dismissNotification: vi.fn(),
  clearNotifications: vi.fn()
}))
vi.mock('@/api/sessions', () => ({ deleteSession: vi.fn(), renameSession: vi.fn() }))
vi.mock('./AroProjectDialog', () => ({ AroProjectDialog: () => null }))
vi.mock('@/app/chat/sidebar/projects/worktree-dialog', () => ({ WorktreeDialog: () => null }))
// workspace-groups is pure tree logic + one store-backed selector
// (projectOwnerBySessionId re-exported into @/store/projects). The real
// module would build a map from an empty projects list anyway — the mock
// keeps the exact same shape without pulling its render-facing imports.
vi.mock('@/app/chat/sidebar/projects/workspace-groups', () => ({
  liveSessionProjectId: () => null,
  projectOwnerBySessionId: () => new Map()
}))

/** Mirrors the router location into the DOM so assertions can read it. */
function LocationProbe() {
  const location = useLocation()

  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderSidebarAt(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <AroSidebar
        currentView="chat"
        onArchiveSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onNewSessionInWorkspace={vi.fn()}
      />
    </MemoryRouter>
  )
}

const rowNamed = (label: string) => screen.getByRole('button', { name: label })

afterEach(() => {
  cleanup()
})

describe('AroSidebar main navigation (D-0031 closure)', () => {
  it('routes the Skills row to the capabilities skills tab', () => {
    renderSidebarAt('/')

    fireEvent.click(rowNamed('Skills'))

    expect(screen.getByTestId('location').textContent).toBe('/capabilities?tab=skills')
  })

  it('routes the Connectors row to the capabilities connectors tab', () => {
    renderSidebarAt('/')

    fireEvent.click(rowNamed('Connectors'))

    expect(screen.getByTestId('location').textContent).toBe('/capabilities?tab=connectors')
  })

  it('derives the Skills row active state from the route (default tab is skills)', () => {
    renderSidebarAt('/capabilities')

    const skills = rowNamed('Skills')
    expect(skills.getAttribute('aria-current')).toBe('page')
    expect(skills.className).toContain('active')
    expect(rowNamed('Connectors').getAttribute('aria-current')).toBeNull()
  })

  it('derives the Connectors row active state from the route', () => {
    renderSidebarAt('/capabilities?tab=connectors')

    const connectors = rowNamed('Connectors')
    expect(connectors.getAttribute('aria-current')).toBe('page')
    expect(connectors.className).toContain('active')
    expect(rowNamed('Skills').getAttribute('aria-current')).toBeNull()
  })

  it('clears the route-derived highlights off the capabilities page', () => {
    renderSidebarAt('/capabilities?tab=toolsets')

    expect(rowNamed('Skills').getAttribute('aria-current')).toBeNull()
    expect(rowNamed('Connectors').getAttribute('aria-current')).toBeNull()
  })

  it('keeps the Projects row as a highlight toggle (not a routed view)', () => {
    renderSidebarAt('/')

    const projects = rowNamed('Projects')
    expect(projects.getAttribute('aria-current')).toBeNull()

    fireEvent.click(projects)
    expect(projects.getAttribute('aria-current')).toBe('page')
    expect(screen.getByTestId('location').textContent).toBe('/')

    fireEvent.click(projects)
    expect(projects.getAttribute('aria-current')).toBeNull()
  })

  it('derives the Settings row active state from the route', () => {
    renderSidebarAt('/settings')

    // The row's accessible name carries its ⌘, hint; match on the label part.
    const settings = screen.getByRole('button', { name: /^Settings/ })
    expect(settings.getAttribute('aria-current')).toBe('page')
    expect(settings.className).toContain('active')
  })
})
