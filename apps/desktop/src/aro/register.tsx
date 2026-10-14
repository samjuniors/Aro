/**
 * ARO DESIGN SYSTEM — REGISTRATION (desktop port wiring)
 *
 * Side-effect module: mounts the Aro pages and the design-system
 * reference through the host's own contribution registry, exactly the
 * way first-party surfaces and the Kanban plugin register theirs —
 *
 *   · ROUTES_AREA        → a full page in the workspace pane at `data.path`
 *   · SIDEBAR_NAV_AREA   → a data row in the sidebar's top nav
 *
 * Imported once from src/main.tsx (`import './aro/register'`). Because
 * every page is a contributed route, the rest of the app needs zero
 * changes: the router reserves the path, the sidebar renders + highlights
 * the row, and nothing about existing screens is touched.
 *
 * Pages (prototype pattern ports, P2–P3):
 *   /aro-transcript — tool timeline: tool cards, approvals, inline diffs
 *   /aro-review     — hunk-level accept/reject/comment review (the gap-closer)
 *   /aro-tasks      — work-graph board (agents + humans, costs, deps)
 *   /aro-design     — the design-system reference page (tokens + primitives)
 *
 * Plus the live bridge session (R4):
 *   /aro-agent      — the aro_bridge daemon's own event stream (useAroBridge)
 */

import { type RouteContribution, ROUTES_AREA, SIDEBAR_NAV_AREA, type SidebarNavContribution } from '@/app/routes'
import { registry } from '@/contrib/registry'

import { AroAgentsPage } from './AgentsView'
import { AroBridgeView } from './AroBridgeView'
import { AroDesignSystemPage } from './DesignSystemAro'
import { AroDoctorPage } from './OnboardingDoctorView'
import { AroReviewPage } from './ReviewHunks'
import { AroRulesPage } from './RulesView'
import { AroTasksPage } from './TasksBoard'
import { AroTranscriptPage } from './ToolTimeline'

/** Contributed routes (one segment each, reserved by the host router). */
export const ARO_DESIGN_ROUTE = '/aro-design'
export const ARO_TRANSCRIPT_ROUTE = '/aro-transcript'
export const ARO_REVIEW_ROUTE = '/aro-review'
export const ARO_TASKS_ROUTE = '/aro-tasks'
export const ARO_AGENT_ROUTE = '/aro-agent'
export const ARO_RULES_ROUTE = '/aro-rules'
export const ARO_AGENTS_ROUTE = '/aro-agents'
export const ARO_DOCTOR_ROUTE = '/aro-doctor'

registry.registerMany([
  /* ── pages ─────────────────────────────────────────────────────── */
  {
    id: 'aro-transcript',
    area: ROUTES_AREA,
    title: 'Aro Transcript',
    data: { path: ARO_TRANSCRIPT_ROUTE } satisfies RouteContribution,
    render: () => <AroTranscriptPage />,
  },
  {
    id: 'aro-review',
    area: ROUTES_AREA,
    title: 'Aro Review',
    data: { path: ARO_REVIEW_ROUTE } satisfies RouteContribution,
    render: () => <AroReviewPage />,
  },
  {
    id: 'aro-tasks',
    area: ROUTES_AREA,
    title: 'Aro Tasks',
    data: { path: ARO_TASKS_ROUTE } satisfies RouteContribution,
    render: () => <AroTasksPage />,
  },
  {
    id: 'aro-design',
    area: ROUTES_AREA,
    title: 'Aro Design',
    data: { path: ARO_DESIGN_ROUTE } satisfies RouteContribution,
    render: () => <AroDesignSystemPage />,
  },
  {
    id: 'aro-agent',
    area: ROUTES_AREA,
    title: 'Aro Bridge',
    data: { path: ARO_AGENT_ROUTE } satisfies RouteContribution,
    render: () => <AroBridgeView />,
  },
  {
    id: 'aro-rules',
    area: ROUTES_AREA,
    title: 'Aro Rules',
    data: { path: ARO_RULES_ROUTE } satisfies RouteContribution,
    render: () => <AroRulesPage />,
  },
  {
    id: 'aro-agents',
    area: ROUTES_AREA,
    title: 'Aro Agents',
    data: { path: ARO_AGENTS_ROUTE } satisfies RouteContribution,
    render: () => <AroAgentsPage />,
  },
  {
    id: 'aro-doctor',
    area: ROUTES_AREA,
    title: 'Aro Doctor',
    data: { path: ARO_DOCTOR_ROUTE } satisfies RouteContribution,
    render: () => <AroDoctorPage />,
  },

  /* ── sidebar nav rows ──────────────────────────────────────────── */
  {
    id: 'aro-transcript',
    area: SIDEBAR_NAV_AREA,
    order: 50,
    data: { codicon: 'comment-discussion', label: 'Aro Transcript', path: ARO_TRANSCRIPT_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-agent',
    area: SIDEBAR_NAV_AREA,
    order: 50.5,
    data: { codicon: 'rocket', label: 'Aro Bridge', path: ARO_AGENT_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-review',
    area: SIDEBAR_NAV_AREA,
    order: 51,
    data: { codicon: 'diff', label: 'Aro Review', path: ARO_REVIEW_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-tasks',
    area: SIDEBAR_NAV_AREA,
    order: 52,
    data: { codicon: 'checklist', label: 'Aro Tasks', path: ARO_TASKS_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-design',
    area: SIDEBAR_NAV_AREA,
    order: 53,
    data: { codicon: 'symbol-color', label: 'Aro Design', path: ARO_DESIGN_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-rules',
    area: SIDEBAR_NAV_AREA,
    order: 54,
    data: { codicon: 'book', label: 'Aro Rules', path: ARO_RULES_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-agents',
    area: SIDEBAR_NAV_AREA,
    order: 55,
    data: { codicon: 'hubot', label: 'Aro Agents', path: ARO_AGENTS_ROUTE } satisfies SidebarNavContribution,
  },
  {
    id: 'aro-doctor',
    area: SIDEBAR_NAV_AREA,
    order: 56,
    data: { codicon: 'pulse', label: 'Aro Doctor', path: ARO_DOCTOR_ROUTE } satisfies SidebarNavContribution,
  },
])
