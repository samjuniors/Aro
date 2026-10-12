import { cleanup, render, screen } from '@testing-library/react'
import { atom } from 'nanostores'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { APP_ROUTES, isOverlayView } from '../routes'

import { ChatRoutesSurface } from './surfaces'
import type { WiringActions } from './types'

vi.mock('@/contrib/react/use-contributions', () => ({ useContributions: vi.fn() }))
vi.mock('@/store/connections', () => ({ $activeConnectionId: atom('local') }))
// The hand-written gateway mock predates the AroSidebar import chain: pulling
// the sidebar in (module scope) reaches src/store/projects, whose module-level
// $gateway.subscribe(syncReposScanning) calls activeGateway() while the file
// evaluates. The real store exports it (src/store/gateway.ts); the mock has to
// answer it so projects.ts can finish loading, and keep it null so every
// repo-scan subscription treats "no gateway" exactly as the tests intend.
vi.mock('@/store/gateway', () => ({ $gateway: atom<unknown>(null), activeGateway: () => null }))
vi.mock('@/store/profile', async importOriginal => ({
  // Same reason as the session mock: the Aro model menu's controller chain
  // reads more of this store at module scope than the old mock provided.
  ...(await importOriginal()),
  $activeGatewayProfile: atom('default')
}))
vi.mock('@/store/session', async importOriginal => ({
  // The Aro model menu (rendered by ChatRoutesSurface) pulls the real
  // model-controller chain, whose transitive imports read more of this
  // store than the old hand-written mock provided. Spread the actual
  // module and pin only what these tests need deterministic.
  ...(await importOriginal()),
  $freshDraftReady: atom(false),
  $gatewayState: atom('open')
}))
vi.mock('../chat', () => ({ ChatView: () => <div data-testid="chat-view" /> }))
vi.mock('../capabilities', () => ({ CapabilitiesView: () => null }))
vi.mock('../messaging', () => ({ MessagingView: () => null }))
vi.mock('../artifacts', () => ({ ArtifactsView: () => null }))
vi.mock('../chat/sidebar', () => ({ ChatSidebar: () => null }))
vi.mock('../right-sidebar/terminal/chrome', () => ({ TerminalPaneChrome: () => null }))
vi.mock('../shell/hooks/use-status-snapshot', () => ({ useStatusSnapshot: () => ({}) }))
vi.mock('../shell/hooks/use-statusbar-items', () => ({
  useStatusbarItems: () => ({ leftStatusbarItems: [], statusbarItems: [] })
}))
vi.mock('../shell/statusbar-controls', () => ({ StatusbarControls: () => null }))
vi.mock('./latest-actions', () => ({ latestChatActions: () => ({}), latestSidebarActions: () => ({}) }))
vi.mock('./panes', () => ({ setStatusbarItemGroup: vi.fn(), useStatusbarContributions: () => [] }))
vi.mock('../shell/model-menu-panel', () => ({ ModelMenuPanel: () => null }))
vi.mock('../shell/reasoning-menu-panel', () => ({ ReasoningMenuPanel: () => null }))

afterEach(cleanup)

// The route table (`APP_ROUTES`) and the `<Route>` list are kept by hand in two
// files. A workspace page whose path is missing from the `<Route>` list matches
// `:sessionId`, so the app opens a chat for a session named after the page.
// Overlays are exempt: they are modal cards over whatever the shell shows.
describe('ChatRoutesSurface and APP_ROUTES', () => {
  const pages = APP_ROUTES.filter(route => route.view !== 'chat' && !isOverlayView(route.view))

  it.each(pages.map(route => [route.path]))('%s has its own route and never opens as a session', path => {
    const actions = { getGateway: () => null } as unknown as WiringActions

    render(
      <MemoryRouter initialEntries={[path]}>
        <ChatRoutesSurface actions={actions} />
      </MemoryRouter>
    )

    expect(screen.queryByTestId('chat-view')).toBeNull()
  })
})
