import { group, mirrorTreeHorizontal, split } from '@/components/pane-shell/tree/model'
import { registerBundledPresets } from '@/components/pane-shell/tree/presets'

// ---------------------------------------------------------------------------
// Layout presets — Aro's primary workspace grammar.
// ---------------------------------------------------------------------------
//
// The Aro default is intentionally a three-panel workbench:
//   sessions/context | live Hermes conversation | workspace context
//
// Hermes still owns every pane's data and actions. This preset only changes
// where those real surfaces live; it does not introduce prototype state.

export const DEFAULT_TREE = split(
  'row',
  [
    group(['sessions'], { id: 'grp-sessions' }),
    group(['workspace'], { id: 'grp-main' }),
    group(['files', 'review'], { id: 'grp-context' })
  ],
  [1, 3.2, 2.2],
  'spl-root'
)

// Focus keeps the same Aro conversation grammar while giving the center
// workspace maximum width. Tooling stays behind the main conversation.
const FOCUS_TREE = split(
  'row',
  [group(['sessions']), split('column', [group(['workspace', 'files', 'review']), group(['terminal'])], [3, 1])],
  [1, 4.8]
)

// Basic is the fallback compact workbench. The terminal remains a resting
// surface rather than taking over the first screen.
export const BASIC_TREE = split(
  'row',
  [
    group(['sessions']),
    split('column', [group(['workspace']), group(['terminal'])], [3, 1]),
    group(['files', 'review'])
  ],
  [1, 3.8, 1.2]
)

const BASIC_RESTING = ['terminal', 'files', 'review'] as const

const TERMINAL_TREE = split(
  'column',
  [
    split('row', [group(['sessions']), group(['workspace']), group(['files', 'review'])], [1, 3.2, 1.2]),
    group(['terminal'])
  ],
  [3, 1]
)

const QUAD_TREE = split(
  'column',
  [
    split('row', [group(['sessions', 'files']), group(['workspace'])], [1, 3]),
    split('row', [group(['terminal']), group(['review'])], [1.4, 1])
  ],
  [3, 1]
)

export function registerLayoutPresets() {
  return registerBundledPresets([
    { id: 'sidebar-left', title: 'Sidebar left', order: 0, tree: BASIC_TREE, resting: BASIC_RESTING, tier: 'simple' },
    {
      id: 'sidebar-right',
      title: 'Sidebar right',
      order: 1,
      tree: mirrorTreeHorizontal(BASIC_TREE),
      resting: BASIC_RESTING,
      tier: 'simple'
    },
    { id: 'default', title: 'Default', order: 0, tree: DEFAULT_TREE, tier: 'advanced' },
    { id: 'basic', title: 'Basic', order: 5, tree: BASIC_TREE, resting: BASIC_RESTING, tier: 'advanced' },
    { id: 'focus', title: 'Focus', order: 10, tree: FOCUS_TREE, resting: ['terminal'], tier: 'advanced' },
    { id: 'terminal-deck', title: 'Terminal deck', order: 20, tree: TERMINAL_TREE, tier: 'advanced' },
    { id: 'quad', title: 'Quad', order: 30, tree: QUAD_TREE, tier: 'advanced' }
  ])
}