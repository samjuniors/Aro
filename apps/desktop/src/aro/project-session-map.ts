/**
 * ARO PROJECT-SESSION ASSOCIATION STORE
 *
 * Provides bidirectional session-to-project assignment that satisfies both:
 * 1. The Aro Workbench Prototype contract (direct session.projectId assignment,
 *    instant drag & drop re-homing, and new session grouping).
 * 2. The Hermes backend contract (mapping session cwd to project folders via
 *    session.workspace.move and projects.add_folder).
 */

import { atom } from 'nanostores'

import { liveSessionProjectId } from '@/app/chat/sidebar/projects/workspace-groups'
import { ALL_PROJECTS, exitProjectScope } from '@/store/project-scope'
import {
  $activeProjectId,
  $projects,
  $projectTree,
  addProjectFolder,
  followEnteredProjectCwd,
  moveSessionToProject,
  projectRootCwd,
  refreshProjects,
  refreshProjectTree,
  setActiveProject
} from '@/store/projects'
import {
  $configuredDefaultProjectDir,
  $selectedStoredSessionId,
  $sessions,
  commitWorkspaceCwdForSelectedSession,
  getConfiguredDefaultProjectDir,
  setCurrentCwd,
  setNewChatWorkspaceTarget,
  setSessions
} from '@/store/session'
import type { SessionInfo } from '@/types/hermes'

const STORAGE_KEY = 'aro.session.projectMap'

function readInitialMap(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {return {}}
    const parsed = JSON.parse(raw)

    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function persistMap(map: Record<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) {return}

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage quota/security errors
  }
}

/** Atom holding explicit sessionId -> projectId mappings */
export const $aroSessionProjectMap = atom<Record<string, string>>(readInitialMap())

/** Atom holding the target projectId for a newly drafted session */
export const $aroDraftProjectId = atom<string | null>(null)

export function setAroDraftProject(projectId: string | null): void {
  $aroDraftProjectId.set(projectId)
}

/** Resolve a draft's visible project from its explicit target or sidebar scope. */
export function resolveAroDraftProjectId(draftProjectId: null | string, projectScope: string): null | string {
  if (draftProjectId) {
    return draftProjectId
  }

  return projectScope === ALL_PROJECTS ? null : projectScope
}

/**
 * Assign a session to a project.
 * Immediately persists in Aro store, then coordinates with Hermes backend.
 */
export async function assignSessionToProject(
  sessionId: string,
  targetProjectId: string
): Promise<void> {
  if (!sessionId || !targetProjectId) {return}

  // 1. Update local atom and localStorage immediately (instant UI response)
  const current = { ...$aroSessionProjectMap.get(), [sessionId]: targetProjectId }
  $aroSessionProjectMap.set(current)
  persistMap(current)

  // 2. Synchronize with Hermes backend
  const allProjects = $projects.get()
  const project = allProjects.find(p => p.id === targetProjectId)
  const treeNode = $projectTree.get().find(n => n.id === targetProjectId)

  const projectCwd =
    projectRootCwd(treeNode) ||
    project?.primary_path ||
    project?.folders?.[0]?.path ||
    ''

  const session = $sessions.get().find((s: SessionInfo) => s.id === sessionId)

  // `draft_*` rows are renderer-only; there is no backend session to move yet.
  if (sessionId.startsWith('draft_')) {
    return
  }

  try {
    if (projectCwd) {
      // Backend has a root folder for this project: move the session's workspace
      await moveSessionToProject(sessionId, targetProjectId, session?.profile)
    } else if (session?.cwd && session.cwd.trim()) {
      // Project had no folder, but session has one: add it to the project
      await addProjectFolder(targetProjectId, session.cwd.trim())
      await moveSessionToProject(sessionId, targetProjectId, session?.profile)
    }
  } catch (err) {
    // Backend move might fail if cwd is offline or detached, but local Aro
    // mapping keeps the session properly filed in the project.
    console.warn('[Aro] Backend workspace move note:', err)
  }
}

/** Remove explicit project mapping for a session */
export function unassignSessionFromProject(sessionId: string): void {
  const current = { ...$aroSessionProjectMap.get() }
  delete current[sessionId]
  $aroSessionProjectMap.set(current)
  persistMap(current)
}

/**
 * Clear the selected project, unassign session, exit project scope,
 * and revert the session and workspace location to the configured default directory (or empty).
 */
export async function clearAroProjectAndRevertToDefault(sessionId?: string | null): Promise<void> {
  exitProjectScope()
  setAroDraftProject(null)
  $activeProjectId.set(null)
  void setActiveProject(null).catch(() => {})

  if (sessionId) {
    unassignSessionFromProject(sessionId)
  }

  const configured = getConfiguredDefaultProjectDir() || $configuredDefaultProjectDir.get() || ''
  setNewChatWorkspaceTarget(configured || null)
  setCurrentCwd(configured)
  followEnteredProjectCwd(configured)

  if (sessionId) {
    commitWorkspaceCwdForSelectedSession(configured)
    setSessions((prev: SessionInfo[]) =>
      prev.map(item => (item.id === sessionId ? { ...item, cwd: configured || null } : item))
    )
  } else {
    setSessions((prev: SessionInfo[]) =>
      prev.map(item => (item.id.startsWith('draft_') ? { ...item, cwd: configured || null } : item))
    )
  }

  void Promise.all([refreshProjects().catch(() => {}), refreshProjectTree().catch(() => {})])
}

/** Clean up mappings when a project is deleted */
export function removeProjectFromMap(projectId: string): void {
  const current = { ...$aroSessionProjectMap.get() }
  let changed = false

  for (const [sId, pId] of Object.entries(current)) {
    if (pId === projectId) {
      delete current[sId]
      changed = true
    }
  }

  if (changed) {
    $aroSessionProjectMap.set(current)
    persistMap(current)
  }
}

/**
 * Resolve the project ID a session belongs to.
 * Prefers explicit Aro mapping, falling back to Hermes live folder matching.
 */
export function resolveAroSessionProjectId(
  session: SessionInfo,
  projects: Array<{ id: string; name?: string; color?: string | null; archived?: boolean; primary_path?: string | null; folders?: Array<{ path: string }> }>,
  owners?: ReadonlyMap<string, string>,
  aroMap: Record<string, string> = $aroSessionProjectMap.get()
): string | null {
  // 1. Explicit user assignment in Aro
  const explicitPid = aroMap[session.id]

  if (explicitPid) {
    const targetProject = projects.find(p => p.id === explicitPid)

    if (targetProject && !targetProject.archived) {
      return explicitPid
    }
  }

  // 2. Authoritative Hermes backend matching (checks project folders)
  const backendPid = liveSessionProjectId(session, projects as any, owners)

  if (backendPid && backendPid !== '__no_project__') {
    const matchingProject = projects.find(p => p.id === backendPid)

    if (matchingProject && !matchingProject.archived) {
      return matchingProject.id
    }
  }

  return null
}

// ── Auto-bind new sessions created while scoped to a draft project ─────────
if (typeof window !== 'undefined') {
  // Track previous session IDs so we can detect when a fresh session row appears
  let knownSessionIds = new Set<string>($sessions.get().map((s: SessionInfo) => s.id))

  $sessions.subscribe((sessions: readonly SessionInfo[]) => {
    const draftPid = $aroDraftProjectId.get()

    if (!draftPid) {
      knownSessionIds = new Set(sessions.map((s: SessionInfo) => s.id))

      return
    }

    // Find any newly created session that wasn't in knownSessionIds
    const freshSession = sessions.find((s: SessionInfo) => !knownSessionIds.has(s.id))

    if (freshSession) {
      void assignSessionToProject(freshSession.id, draftPid)
      $aroDraftProjectId.set(null)
    }

    knownSessionIds = new Set(sessions.map((s: SessionInfo) => s.id))
  })

  // Also watch $selectedStoredSessionId for immediate binding on send and draft cleanup
  $selectedStoredSessionId.subscribe((selectedId: string | null) => {
    if (!selectedId || selectedId.startsWith('draft_')) {return}

    const draftPid = $aroDraftProjectId.get()
    const allSessions = $sessions.get()
    const draft = allSessions.find((s: SessionInfo) => s.id.startsWith('draft_'))

    if (draft) {
      const explicitProject = $aroSessionProjectMap.get()[draft.id] || draftPid

      if (explicitProject) {
        void assignSessionToProject(selectedId, explicitProject)
      }

      unassignSessionFromProject(draft.id)
      setSessions((prev: SessionInfo[]) => prev.filter((s: SessionInfo) => s.id !== draft.id))
    } else if (draftPid) {
      void assignSessionToProject(selectedId, draftPid)
    }

    if (draftPid) {
      $aroDraftProjectId.set(null)
    }
  })
}
