/**
 * ARO SIDEBAR — Desktop Left Navigation & Session Roster (Prototype Parity)
 *
 * Implements 100% visual parity with the Aro Workbench prototype
 * (prototype/src/workbench/components/Sidebar.tsx), fully wired to the
 * Hermes Electron engine:
 *
 *  · Header: Brand logo + Aro wordmark + Collapse button (toggleLeftSide)
 *  · Primary Actions: New Session (⌘N) + Live Session Search
 *  · Main Navigation: Sessions | Projects | Skills | Connectors
 *  · Projects & Session Hierarchy:
 *      - Foldable projects with accent colors & item counts
 *      - Pinned sessions group
 *      - Project-assigned and unassigned sessions
 *      - Live execution status dots (breathing cyan for running, rose for error)
 *      - Context menus: Rename, Pin, Duplicate, Move to Project, Archive, Delete
 *  · Archive Mode: Toggle to view, restore, or purge archived sessions
 *  · Footer: Active Bot profile identity control + Settings link (⌘,)
 *  · Segregation & Audit:
 *      - Extra Hermes surfaces (Cron jobs, Messaging gateway channels,
 *        Remote connection switches, PR filters) are segregated into a
 *        frozen collapsible audit drawer so the prototype UI remains clean.
 */

import './sidebar.css'

import { useStore } from '@nanostores/react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { deleteSession, renameSession } from '@/api/sessions'
import { WorktreeDialog } from '@/app/chat/sidebar/projects/worktree-dialog'
import { openSession } from '@/app/open-session'
import {
  CAPABILITIES_ROUTE,
  navigateToWorkspacePage,
  NEW_CHAT_ROUTE,
  SETTINGS_ROUTE
} from '@/app/routes'
import { setWorkspaceScope } from '@/components/pane-shell/workspace-scope'
import { sessionTitle } from '@/lib/chat-runtime'
import { cn } from '@/lib/utils'
import { $connectionsRegistry } from '@/store/connection-registry-state'
import { $cronJobs } from '@/store/cron'
import {
  $pinnedSessionIds,
  $sidebarFiltersActive,
  $sidebarMessagingOpenIds,
  pinSession,
  toggleLeftSide,
  unpinSession
} from '@/store/layout'
import { notify } from '@/store/notifications'
import {
  $activeGatewayProfile,
  $profiles,
  profileLabel,
  selectProfile
} from '@/store/profile'
import {
  $projectOwnerBySessionId,
  $projects,
  $projectTree,
  deleteProject,
  enterProject,
  openProjectCreate,
  projectRootCwd,
  refreshProjects,
  refreshProjectTree,
  renameProject,
  scanAndRecordRepos,
  updateProject
} from '@/store/projects'
import {
  $activeSessionId,
  $gatewayState,
  $selectedStoredSessionId,
  $sessions,
  setActiveSessionId,
  setCurrentCwd,
  setMessages,
  setNewChatWorkspaceTarget,
  setSelectedStoredSessionId,
  setSessions
} from '@/store/session'
import { $sessionDotStateById, showsRunningArc } from '@/store/session-dot-state'
import { $botChatScopes } from '@/store/session-states'
import { $archivedSessions, loadArchivedSessions } from '@/store/sidebar-archive'
import type { SessionInfo } from '@/types/hermes'

import { AroProjectDialog } from './AroProjectDialog'
import {
  IconArchive,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconFolder,
  IconMore,
  IconPanelLeft,
  IconPencil,
  IconPin,
  IconPlug,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSpark,
  IconTrash,
  IconX,
  LogoMark
} from './Icons'
import { $aroProductMode } from './mode'
import {
  $aroSessionProjectMap,
  assignSessionToProject,
  removeProjectFromMap,
  resolveAroSessionProjectId,
  setAroDraftProject,
  unassignSessionFromProject
} from './project-session-map'
import { Button, IconButton, Input, Kbd, Menu, MenuItem, MenuLabel, MenuSep, Modal, Tip } from './ui'

export type ViewId = 'projects' | 'skills' | 'connectors' | 'settings'

export const NAV_ITEMS = [
  { id: 'projects' as ViewId, label: 'Projects', icon: IconFolder, key: '1' },
  { id: 'skills' as ViewId, label: 'Skills', icon: IconSpark, key: '2' },
  { id: 'connectors' as ViewId, label: 'Connectors', icon: IconPlug, key: '3' }
]

export const PROJECT_COLORS = [
  { value: '#818cf8', label: 'Iris' },
  { value: '#38bdf8', label: 'Sky' },
  { value: '#34d399', label: 'Mint' },
  { value: '#fbbf24', label: 'Amber' },
  { value: '#f472b6', label: 'Rose' },
  { value: '#a78bfa', label: 'Purple' },
  { value: '#fb923c', label: 'Orange' },
  { value: '#94a3b8', label: 'Slate' }
]

function getAvatarColor(name: string): string {
  const colors = ['#7c6bff', '#10b981', '#35d6c4', '#f97316', '#ec4899', '#3b82f6', '#8b5cf6']
  let hash = 0

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return (clean.slice(0, 2) || 'AR').toUpperCase()
}

export interface AroSidebarProps {
  currentView?: string
  onNewSessionInWorkspace?: (path: string | null) => void
  onDeleteSession?: (sessionId: string) => void
  onArchiveSession?: (sessionId: string) => void
}

export function AroSidebar({
  onNewSessionInWorkspace,
  onDeleteSession,
  onArchiveSession
}: AroSidebarProps) {
  const navigate = useNavigate()

  // Real Hermes stores
  const sessions = useStore($sessions)
  const selectedSessionId = useStore($selectedStoredSessionId)
  const activeSessionId = useStore($activeSessionId)
  const pinnedIds = useStore($pinnedSessionIds)
  const projects = useStore($projects)
  const projectTree = useStore($projectTree)
  const projectOwners = useStore($projectOwnerBySessionId)
  const dotStates = useStore($sessionDotStateById)
  const archivedSessions = useStore($archivedSessions)
  const profiles = useStore($profiles)
  const activeGatewayProfile = useStore($activeGatewayProfile)
  const botChatScopes = useStore($botChatScopes)

  // Frozen / Audit surfaces stores
  const cronJobs = useStore($cronJobs)
  const connectionsRegistry = useStore($connectionsRegistry)
  const messagingOpenIds = useStore($sidebarMessagingOpenIds)
  const filtersActive = useStore($sidebarFiltersActive)

  // Workspace Mode (Sessions = Code | Bots = Agents)
  const productMode = useStore($aroProductMode)

  // Route-derived active state for the nav rows that navigate (D-0031
  // closure): the "current" row is whichever destination the router is
  // actually on, so the highlight can never disagree with the location the
  // way the old pure-toggle state did. `activeNav` stays for the Projects
  // row — its destination is the in-sidebar projects tree, not a route.
  const location = useLocation()

  const capabilitiesTab = (() => {
    if (location.pathname !== CAPABILITIES_ROUTE) {return null}

    return new URLSearchParams(location.search).get('tab') ?? 'skills'
  })()

  const onSettings = location.pathname === SETTINGS_ROUTE

  const [activeNav, setActiveNav] = useState<ViewId | null>(null)
  const [search, setSearch] = useState('')
  const [archiveMode, setArchiveMode] = useState(false)

  const [folds, setFolds] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('aro.sidebar.folds') || '{}')
    } catch {
      return {}
    }
  })

  // Frozen surfaces drawer toggle
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)

  // Project colors overrides map (locally preserved)
  const [projectColors, setProjectColors] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('aro.project.colors') || '{}')
    } catch {
      return {}
    }
  })

  // Modals state
  const [renamingSession, setRenamingSession] = useState<SessionInfo | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [deletingSession, setDeletingSession] = useState<SessionInfo | null>(null)

  const [renamingProject, setRenamingProject] = useState<{ id: string; name: string } | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null)

  // Keyboard navigation cursor
  const [cursorId, setCursorId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Drag and Drop
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropProjectId, setDropProjectId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('aro.sidebar.folds', JSON.stringify(folds))
    } catch {
      // ignore
    }
  }, [folds])

  // Refresh archive when entering archive mode
  useEffect(() => {
    if (archiveMode) {
      void loadArchivedSessions()
    }
  }, [archiveMode])

  // Active Bot Identity Calculation
  const activeSession = sessions.find(s => s.id === selectedSessionId)
  const botScope = selectedSessionId ? botChatScopes[selectedSessionId] : undefined
  const currentProfileName = activeSession?.profile || activeGatewayProfile || 'default'
  const matchedProfile = profiles.find(p => p.name === currentProfileName)
  const profileDisplayName = matchedProfile ? profileLabel(matchedProfile) : (currentProfileName !== 'default' ? currentProfileName : '')

  const botName =
    botScope?.workspaceTabTitle ||
    profileDisplayName ||
    (activeSession?.model ? activeSession.model.split('/').pop() : 'Aro Bot')

  const botInitials = getInitials(profileDisplayName || botName || 'Aro')
  const botAvatarColor = getAvatarColor(profileDisplayName || botName || 'default')

  // Filtered session list
  const currentList = archiveMode ? archivedSessions : sessions

  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase()

    return currentList.filter(s => {
      const title = (s.title || sessionTitle(s) || '').toLowerCase()

      return !q || title.includes(q)
    })
  }, [currentList, search])

  // Pinned vs Unassigned vs Project-grouped
  const pinnedSessions = useMemo(() => {
    if (archiveMode) {return []}

    return visibleSessions.filter(s => pinnedIds.includes(s.id))
  }, [visibleSessions, pinnedIds, archiveMode])

  const gatewayState = useStore($gatewayState)
  const gatewayReady = gatewayState === 'open'

  // Refresh projects, authoritative tree, and discovered repos on load & whenever gateway connects or profile changes
  useEffect(() => {
    void refreshProjects()
    void refreshProjectTree().finally(() => void scanAndRecordRepos())
  }, [gatewayReady, activeGatewayProfile])

  // Unified authoritative projects combining explicit $projects, $projectTree, and child repos (matching Composer)
  const effectiveProjects = useMemo(() => {
    const list: Array<{
      id: string
      name: string
      color?: string | null
      path?: string | null
      folders?: Array<{ path: string }>
      archived?: boolean
    }> = []

    const seen = new Set<string>()

    // 1. Explicit projects from $projects
    for (const p of projects) {
      if (p.id && !p.archived) {
        seen.add(p.id)
        const pPath = p.primary_path || p.folders?.[0]?.path
        const pName = p.name || (pPath ? pPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() : '') || p.id
        const treeNode = projectTree.find(n => n.id === p.id)
        const mergedFolders: Array<{ path: string }> = [...(p.folders || [])]

        if (treeNode?.repos) {
          for (const r of treeNode.repos) {
            if (r.path && !mergedFolders.some(f => f.path === r.path)) {
              mergedFolders.push({ path: r.path })
            }
          }
        }

        list.push({
          id: p.id,
          name: pName,
          color: p.color,
          path: pPath,
          folders: mergedFolders,
          archived: p.archived
        })
      }
    }

    // 2. Authoritative project tree from $projectTree (covers auto-projects and explicit ones)
    for (const node of projectTree) {
      if (node.id && !node.isNoProject && !node.archived && !seen.has(node.id)) {
        seen.add(node.id)
        const rootPath = node.path || projectRootCwd(node) || node.repos?.[0]?.path || ''
        const label = node.label || (rootPath ? rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() : '') || node.id
        const nodeFolders: Array<{ path: string }> = rootPath ? [{ path: rootPath }] : []

        if (node.repos) {
          for (const r of node.repos) {
            if (r.path && !nodeFolders.some(f => f.path === r.path)) {
              nodeFolders.push({ path: r.path })
            }
          }
        }

        list.push({
          id: node.id,
          name: label,
          color: node.color,
          path: rootPath,
          folders: nodeFolders,
          archived: node.archived
        })
      }
    }

    return list
  }, [projects, projectTree])

  const aroSessionProjectMap = useStore($aroSessionProjectMap)

  // Grouped sessions by project using Aro + Hermes authoritative ownership
  const projectSessionsMap = useMemo(() => {
    const map: Record<string, SessionInfo[]> = {}

    for (const p of effectiveProjects) {
      map[p.id] = []
    }

    for (const s of visibleSessions) {
      if (!pinnedIds.includes(s.id)) {
        const pId = resolveAroSessionProjectId(s, effectiveProjects, projectOwners, aroSessionProjectMap)

        if (pId && map[pId]) {
          map[pId].push(s)
        }
      }
    }

    return map
  }, [visibleSessions, effectiveProjects, pinnedIds, projectOwners, aroSessionProjectMap])

  const unassignedSessions = useMemo(() => {
    return visibleSessions.filter(s => {
      if (pinnedIds.includes(s.id) && !archiveMode) {return false}
      const pId = resolveAroSessionProjectId(s, effectiveProjects, projectOwners, aroSessionProjectMap)

      return !pId
    })
  }, [visibleSessions, pinnedIds, archiveMode, effectiveProjects, projectOwners, aroSessionProjectMap])

  // Bot conversations (Bots / Agents mode)
  const botSessions = useMemo(() => {
    const q = search.trim().toLowerCase()

    return currentList.filter(s => {
      const isBotSession =
        Boolean(s.profile && s.profile !== 'default') ||
        Boolean(botChatScopes[s.id]) ||
        (currentProfileName !== 'default' && s.profile === currentProfileName)

      const matches = isBotSession || profiles.length <= 1

      if (!matches) {return false}
      const title = (s.title || sessionTitle(s) || '').toLowerCase()

      return !q || title.includes(q)
    })
  }, [currentList, search, botChatScopes, currentProfileName, profiles.length])

  // Handle New Session (anchored to project when projectId is provided)
  const handleNewSession = useCallback(
    (projectId?: string) => {
      setWorkspaceScope('sessions')
      const newSessionId = `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      const now = Date.now() / 1000

      const effectiveProfile =
        currentProfileName && currentProfileName !== 'all' ? currentProfileName : 'default'

      if (projectId) {
        const treeNode = projectTree.find(n => n.id === projectId)
        const proj = effectiveProjects.find(p => p.id === projectId)

        const cwd =
          projectRootCwd(treeNode) ||
          proj?.path ||
          proj?.folders?.[0]?.path ||
          null

        setAroDraftProject(projectId)
        enterProject(projectId)

        if (cwd) {
          setNewChatWorkspaceTarget(cwd)
          setCurrentCwd(cwd)

          if (onNewSessionInWorkspace) {
            onNewSessionInWorkspace(cwd)
          }
        } else {
          setNewChatWorkspaceTarget(null)

          if (onNewSessionInWorkspace) {
            onNewSessionInWorkspace(null)
          }
        }

        const draftSession: SessionInfo = {
          id: newSessionId,
          title: 'New session',
          started_at: now,
          last_active: now,
          ended_at: null,
          is_active: false,
          message_count: 0,
          input_tokens: 0,
          output_tokens: 0,
          tool_call_count: 0,
          preview: null,
          model: null,
          source: 'local',
          cwd: cwd || null,
          profile: effectiveProfile,
          is_default_profile: effectiveProfile === 'default'
        }

        void assignSessionToProject(newSessionId, projectId)
        setSessions(prev => [draftSession, ...prev.filter(s => s.id !== newSessionId)])
        setActiveSessionId(newSessionId)
        setSelectedStoredSessionId(newSessionId)
        setMessages([])
        navigate(NEW_CHAT_ROUTE)
      } else {
        setAroDraftProject(null)
        setNewChatWorkspaceTarget(null)

        if (onNewSessionInWorkspace) {
          onNewSessionInWorkspace(null)
        }

        const draftSession: SessionInfo = {
          id: newSessionId,
          title: 'New session',
          started_at: now,
          last_active: now,
          ended_at: null,
          is_active: false,
          message_count: 0,
          input_tokens: 0,
          output_tokens: 0,
          tool_call_count: 0,
          preview: null,
          model: null,
          source: 'local',
          cwd: null,
          profile: effectiveProfile,
          is_default_profile: effectiveProfile === 'default'
        }

        unassignSessionFromProject(newSessionId)
        setSessions(prev => [draftSession, ...prev.filter(s => s.id !== newSessionId)])
        setActiveSessionId(newSessionId)
        setSelectedStoredSessionId(newSessionId)
        setMessages([])
        navigate(NEW_CHAT_ROUTE)
      }
    },
    [onNewSessionInWorkspace, navigate, projectTree, effectiveProjects, currentProfileName]
  )

  // Handle Move Session to Project
  const handleMoveSessionToProject = useCallback(
    async (sessionId: string, targetProjectId: string) => {
      try {
        await assignSessionToProject(sessionId, targetProjectId)
        const proj = effectiveProjects.find(p => p.id === targetProjectId)
        notify({ kind: 'info', message: proj ? `Session moved to '${proj.name}'` : 'Session moved to project' })
      } catch (err) {
        console.error('Failed to move session to project:', err)
      }
    },
    [effectiveProjects]
  )

  // Handle Select Session
  const handleSelectSession = useCallback((sessionId: string) => {
    setAroDraftProject(null)
    setCursorId(sessionId)

    if (sessionId.startsWith('draft_')) {
      setSelectedStoredSessionId(sessionId)
      setActiveSessionId(sessionId)
      setMessages([])
      navigate(NEW_CHAT_ROUTE)

      return
    }

    openSession(sessionId, navigate)
  }, [navigate])

  // Handle Pin Toggle
  const handleTogglePin = useCallback(
    (sessionId: string) => {
      if (pinnedIds.includes(sessionId)) {
        unpinSession(sessionId)
      } else {
        pinSession(sessionId)
      }
    },
    [pinnedIds]
  )

  // Handle Rename Submit
  const handleSaveRename = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!renamingSession || !renameTitle.trim()) {return}

      if (renamingSession.id.startsWith('draft_')) {
        setSessions(prev =>
          prev.map(s => (s.id === renamingSession.id ? { ...s, title: renameTitle.trim() } : s))
        )
        setRenamingSession(null)

        return
      }

      try {
        await renameSession(renamingSession.id, renameTitle.trim())
      } catch {
        // handled
      }

      setRenamingSession(null)
    },
    [renamingSession, renameTitle]
  )

  // Handle Delete Confirm
  const handleConfirmDelete = useCallback(
    async () => {
      if (!deletingSession) {return}
      const id = deletingSession.id

      if (id.startsWith('draft_')) {
        setSessions(prev => prev.filter(s => s.id !== id))
        unassignSessionFromProject(id)

        if (selectedSessionId === id) {
          setActiveSessionId(null)
          setSelectedStoredSessionId(null)
        }

        setDeletingSession(null)

        return
      }

      if (onDeleteSession) {
        onDeleteSession(id)
      } else {
        try {
          await deleteSession(id)
        } catch {
          // ignore
        }
      }

      setDeletingSession(null)
    },
    [deletingSession, onDeleteSession, selectedSessionId]
  )

  // Handle Archive Session
  const handleArchive = useCallback(
    (sessionId: string) => {
      if (onArchiveSession) {
        onArchiveSession(sessionId)
      }
    },
    [onArchiveSession]
  )

  // Render a Single Session Row (Prototype Parity)
  const renderSessionRow = (session: SessionInfo) => {
    const isSelected = selectedSessionId === session.id || activeSessionId === session.id
    const isPinned = pinnedIds.includes(session.id)
    const dot = dotStates[session.id]
    const isRunning = dot ? showsRunningArc(dot) : false
    const title = sessionTitle(session) || 'Untitled Session'

    return (
      <div
        className={cn(
          'session-list-row group',
          isSelected && 'selected',
          cursorId === session.id && 'keyboard-selected',
          dragId === session.id && 'opacity-40'
        )}
        data-session={session.id}
        draggable
        key={session.id}
        onDragEnd={() => {
          setDragId(null)
          setDropProjectId(null)
        }}
        onDragStart={e => {
          setDragId(session.id)
          e.dataTransfer.setData('text/plain', session.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
      >
        <button
          className="min-w-0 flex-1 truncate text-left text-[13px] text-aro-ink-2"
          onClick={() => handleSelectSession(session.id)}
          title={title}
          type="button"
        >
          {title}
        </button>

        {/* Live Status Dots */}
        {isRunning && (
          <i
            className="size-[5.5px] shrink-0 animate-pulse rounded-full bg-aro-cyan"
            title="Running turn"
          />
        )}
        {session.ended_at && session.ended_at < 0 && (
          <i
            className="size-[5.5px] shrink-0 rounded-full bg-aro-rose"
            title="Session error"
          />
        )}
        {isPinned && !archiveMode && (
          <IconPin className="shrink-0 text-aro-ink-4" size={10} />
        )}

        {/* Context Menu Button */}
        <Menu
          align="right"
          trigger={open => (
            <button
              aria-label={`Actions for ${title}`}
              className={cn('session-row-more', open && 'opacity-100 bg-aro-hover text-aro-ink')}
              type="button"
            >
              <IconMore size={13} />
            </button>
          )}
          width={210}
        >
          {close => (
            <>
              <MenuItem
                icon={<IconPencil size={12} />}
                label="Rename"
                onClick={() => {
                  setRenamingSession(session)
                  setRenameTitle(title)
                  close()
                }}
              />
              <MenuItem
                icon={<IconPin size={12} />}
                label={isPinned ? 'Unpin' : 'Pin'}
                onClick={() => {
                  handleTogglePin(session.id)
                  close()
                }}
              />
              <MenuItem
                icon={<IconCopy size={12} />}
                label="Duplicate"
                onClick={() => {
                  handleNewSession()
                  close()
                }}
              />
              {effectiveProjects.length > 0 && (
                <>
                  <MenuSep />
                  <MenuLabel>Move to project</MenuLabel>
                  {effectiveProjects.map(p => {
                    const currentPid = resolveAroSessionProjectId(
                      session,
                      effectiveProjects,
                      projectOwners,
                      aroSessionProjectMap
                    )

                    const isCurrent = currentPid === p.id

                    return (
                      <MenuItem
                        active={isCurrent}
                        icon={
                          <IconFolder
                            size={12}
                            style={{ color: p.color || '#818cf8' }}
                          />
                        }
                        key={p.id}
                        label={p.name}
                        onClick={async () => {
                          if (!isCurrent) {
                            await handleMoveSessionToProject(session.id, p.id)
                          }

                          close()
                        }}
                      />
                    )
                  })}
                  {resolveAroSessionProjectId(
                    session,
                    effectiveProjects,
                    projectOwners,
                    aroSessionProjectMap
                  ) && (
                    <MenuItem
                      icon={<IconX size={12} />}
                      label="Remove from project"
                      onClick={() => {
                        unassignSessionFromProject(session.id)
                        notify({ kind: 'info', message: 'Session moved to Unassigned' })
                        close()
                      }}
                    />
                  )}
                </>
              )}
              <MenuSep />
              <MenuItem
                icon={<IconArchive size={12} />}
                label={archiveMode ? 'Restore session' : 'Archive session'}
                onClick={() => {
                  handleArchive(session.id)
                  close()
                }}
              />
              <MenuItem
                danger
                icon={<IconTrash size={12} />}
                label="Delete session"
                onClick={() => {
                  setDeletingSession(session)
                  close()
                }}
              />
            </>
          )}
        </Menu>
      </div>
    )
  }

  // Audit drawer component helper to preserve Hermes surfaces cleanly
  const renderAuditDrawer = () => (
    <div className="sidebar-audit-section">
      <button
        className="sidebar-audit-header"
        onClick={() => setAuditDrawerOpen(!auditDrawerOpen)}
        type="button"
      >
        <span>{auditDrawerOpen ? '[-] Audit Surfaces' : '[+] Hermes Surfaces (Audit)'}</span>
        <span className="font-mono text-[9px] text-aro-ink-4">
          {cronJobs.length + messagingOpenIds.length + (connectionsRegistry?.connections?.length || 0)} items
        </span>
      </button>

      {auditDrawerOpen && (
        <div className="sidebar-audit-content">
          <div className="sidebar-audit-item">
            <span>Cron Tasks</span>
            <span className="font-mono text-[10px]">{cronJobs.length} scheduled</span>
          </div>
          <div className="sidebar-audit-item">
            <span>Messaging Gateways</span>
            <span className="font-mono text-[10px]">{messagingOpenIds.length} open</span>
          </div>
          <div className="sidebar-audit-item">
            <span>Remote Connections</span>
            <span className="font-mono text-[10px]">
              {connectionsRegistry?.connections?.length || 1} registered
            </span>
          </div>
          <div className="sidebar-audit-item">
            <span>PR & Branch Filters</span>
            <span className="font-mono text-[10px]">
              {filtersActive ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <aside className="codex-sidebar overflow-x-hidden">
      {/* ── Brand Header: Logo + Collapse Button ── */}
      <div className="sidebar-brand">
        <LogoMark size={20} />
        <span className="rail-label font-aro-display text-[15px] font-semibold tracking-[-.025em] text-aro-ink">
          Aro
        </span>
        <IconButton
          className="ml-auto"
          icon={IconPanelLeft}
          label="Collapse sidebar"
          onClick={() => toggleLeftSide()}
          size={26}
        />
      </div>

      {productMode === 'code' ? (
        /* ══════════════════════════════════════════════════════════════
           CODE WORKSPACE: Sessions, Projects, Skills, Connectors
           ══════════════════════════════════════════════════════════════ */
        <>
          {/* Primary Action: New Session (⌘N) + Search Bar */}
          <div className="sidebar-primary-actions">
            <button
              className="new-session-action"
              onClick={() => handleNewSession()}
              type="button"
            >
              <IconPlus size={16} />
              <span className="rail-label">New session</span>
              <span className="rail-kbd ml-auto text-[9.5px] text-aro-ink-4">⌘N</span>
            </button>

            <div className="sidebar-search-wrap">
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2 text-aro-ink-4"
                size={13}
              />
              <input
                className="sidebar-search"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sessions"
                type="text"
                value={search}
              />
            </div>
          </div>

          {/* Main Navigation Strip (NAV_ITEMS: Projects, Skills, Connectors).
              Skills/Connectors close D-0031: both rows route to the live
              capabilities page on their own tab (the verified surface —
              FEATURE_MAP nav-stubs-*), with `navigateToWorkspacePage`
              covering the re-click case (already on the target → imperative
              workspace-pane reveal). Their active state is route-derived, so
              aria-current="page" is truthful. Projects keeps the highlight
              toggle: its destination is the projects tree directly below,
              not a routed view (not a contracted stub; see D-0035). */}
          <nav aria-label="Workspace navigation" className="sidebar-main-nav">
            {NAV_ITEMS.map(it => {
              const isStubRowClosed = it.id === 'skills' || it.id === 'connectors'

              const isActive = isStubRowClosed
                ? capabilitiesTab === it.id
                : activeNav === it.id

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={cn('sidebar-navigation-row', isActive && 'active')}
                  key={it.id}
                  onClick={() => {
                    if (it.id === 'skills') {
                      navigateToWorkspacePage(navigate, `${CAPABILITIES_ROUTE}?tab=skills`)
                    } else if (it.id === 'connectors') {
                      navigateToWorkspacePage(navigate, `${CAPABILITIES_ROUTE}?tab=connectors`)
                    } else {
                      setActiveNav(prev => (prev === it.id ? null : it.id))
                    }
                  }}
                  type="button"
                >
                  <it.icon size={15} />
                  <span className="rail-label">{it.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Projects / Archive Section Header (No Demo Toggle) */}
          <div className="sidebar-projects-heading">
            <span className="rail-label">{archiveMode ? 'Archive' : 'Projects'}</span>

            <Tip label="Create project">
              <button
                aria-label="Create project"
                className="ml-auto text-aro-ink-4 hover:text-aro-ink cursor-pointer"
                onClick={() => openProjectCreate()}
                type="button"
              >
                <IconPlus size={14} />
              </button>
            </Tip>

            <Menu
              align="right"
              trigger={open => (
                <button
                  aria-label="Session list options"
                  className={cn('text-aro-ink-4 hover:text-aro-ink cursor-pointer', open && 'text-aro-ink')}
                  type="button"
                >
                  <IconMore size={14} />
                </button>
              )}
              width={175}
            >
              {close => (
                <MenuItem
                  icon={<IconArchive size={12} />}
                  label={archiveMode ? 'Active sessions' : 'Archived sessions'}
                  onClick={() => {
                    setArchiveMode(!archiveMode)
                    close()
                  }}
                />
              )}
            </Menu>
          </div>

          {/* Session & Project Hierarchical List */}
          <div
            className="aro-scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3"
            ref={listRef}
          >
            {archiveMode ? (
              /* Archive View */
              <div>
                {visibleSessions.length > 0 ? (
                  visibleSessions.map(renderSessionRow)
                ) : (
                  <p className="py-6 text-center text-[11px] text-aro-ink-4">
                    Nothing archived yet.
                  </p>
                )}
              </div>
            ) : (
              /* Active Sessions & Projects Hierarchy */
              <>
                {/* Pinned Sessions */}
                {pinnedSessions.length > 0 && (
                  <div className="mb-2">
                    <p className="sidebar-section-label">Pinned</p>
                    {pinnedSessions.map(renderSessionRow)}
                  </div>
                )}

                {/* Project Folders */}
                {effectiveProjects.map(project => {
                  const items = projectSessionsMap[project.id] || []
                  const color = projectColors[project.id] || project.color || '#818cf8'
                  const isFolded = Boolean(folds[project.id])

                  return (
                    <section
                      className={cn(
                        'sidebar-project-group overflow-x-hidden',
                        dropProjectId === project.id && 'drop-target'
                      )}
                      key={project.id}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDropProjectId(null)
                        }
                      }}
                      onDragOver={e => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'

                        if (dropProjectId !== project.id) {
                          setDropProjectId(project.id)
                        }
                      }}
                      onDrop={async e => {
                        e.preventDefault()
                        const targetProjectId = project.id
                        const sessionId = e.dataTransfer.getData('text/plain') || dragId
                        setDropProjectId(null)
                        setDragId(null)

                        if (sessionId && targetProjectId) {
                          await handleMoveSessionToProject(sessionId, targetProjectId)
                        }
                      }}
                    >
                      <div
                        className="group flex items-center gap-1 py-1 cursor-grab active:cursor-grabbing select-none"
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('application/aro-project', project.id)
                          e.dataTransfer.setData('text/plain', project.name)
                          e.dataTransfer.effectAllowed = 'copyMove'
                        }}
                        title={`Drag ${project.name} to composer to attach`}
                      >
                        <button
                          aria-label={`${isFolded ? 'Expand' : 'Collapse'} ${project.name}`}
                          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[5px] px-1 py-0.5 text-left transition-colors hover:bg-aro-hover/60"
                          onClick={() =>
                            setFolds(prev => ({ ...prev, [project.id]: !prev[project.id] }))
                          }
                          type="button"
                        >
                          <IconChevronDown
                            className={cn(
                              'shrink-0 text-aro-ink-4 transition-transform duration-200',
                              isFolded && '-rotate-90'
                            )}
                            size={12}
                          />
                          <IconFolder
                            className="shrink-0"
                            size={14}
                            style={{ color, fill: `${color}25` }}
                          />
                          <span className="rail-label truncate text-[13px] font-medium text-aro-ink-2">
                            {project.name}
                          </span>
                          <span className="ml-auto shrink-0 font-aro-mono text-[10px] text-aro-ink-4 opacity-0 transition-opacity group-hover:opacity-100">
                            {items.length || ''}
                          </span>
                        </button>

                        <Tip label={`New session in ${project.name}`}>
                          <button
                            aria-label={`New session in ${project.name}`}
                            className="flex size-[20px] items-center justify-center rounded text-aro-ink-4 opacity-0 transition-all hover:bg-aro-hover hover:text-aro-ink group-hover:opacity-100"
                            onClick={() => handleNewSession(project.id)}
                            type="button"
                          >
                            <IconPlus size={12} />
                          </button>
                        </Tip>

                        <Menu
                          align="right"
                          trigger={open => (
                            <button
                              aria-label={`Project actions for ${project.name}`}
                              className={cn('session-row-more', open && 'opacity-100 bg-aro-hover text-aro-ink')}
                              type="button"
                            >
                              <IconMore size={12} />
                            </button>
                          )}
                          width={210}
                        >
                          {close => (
                            <>
                              <MenuItem
                                icon={<IconPencil size={12} />}
                                label="Rename project"
                                onClick={() => {
                                  setRenamingProject(project)
                                  setNewProjectName(project.name)
                                  close()
                                }}
                              />
                              <MenuItem
                                icon={<IconPlus size={12} />}
                                label="New session here"
                                onClick={() => {
                                  handleNewSession(project.id)
                                  close()
                                }}
                              />
                              <MenuSep />
                              <MenuLabel>Project Color</MenuLabel>
                              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
                                {PROJECT_COLORS.map(c => (
                                  <button
                                    className={cn(
                                      'relative flex size-[18px] cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110',
                                      color === c.value && 'ring-2 ring-aro-ink ring-offset-1'
                                    )}
                                    key={c.value}
                                    onClick={async () => {
                                      const updated = { ...projectColors, [project.id]: c.value }
                                      setProjectColors(updated)

                                      try {
                                        localStorage.setItem('aro.project.colors', JSON.stringify(updated))
                                        await updateProject(project.id, { color: c.value })
                                      } catch {
                                        // ignore
                                      }

                                      close()
                                    }}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                    type="button"
                                  >
                                    {color === c.value && (
                                      <IconCheck className="text-white drop-shadow-sm" size={9} />
                                    )}
                                  </button>
                                ))}
                              </div>
                              <MenuSep />
                              <MenuItem
                                danger
                                icon={<IconTrash size={12} />}
                                label="Delete project"
                                onClick={() => {
                                  setDeletingProject(project)
                                  close()
                                }}
                              />
                            </>
                          )}
                        </Menu>
                      </div>

                      {!isFolded && (
                        <div className="pl-3.5">
                          {items.map(renderSessionRow)}
                          {!items.length && (
                            <button
                              className="w-full py-1 pl-2 text-left text-[11.5px] text-aro-ink-4 hover:text-aro-ink-2"
                              onClick={() => handleNewSession(project.id)}
                              type="button"
                            >
                              Start a session
                            </button>
                          )}
                        </div>
                      )}
                    </section>
                  )
                })}

                {!effectiveProjects.length && !search && (
                  <div className="px-2 py-3">
                    <p className="text-[11.5px] leading-relaxed text-aro-ink-4">
                      Projects keep your sources and sessions together.
                    </p>
                    <button
                      className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-aro-ink-3 hover:text-aro-ink cursor-pointer"
                      onClick={() => openProjectCreate()}
                      type="button"
                    >
                      <IconPlus size={12} />
                      <span>Create project</span>
                    </button>
                  </div>
                )}

                {/* Unassigned sessions */}
                {unassignedSessions.length > 0 && (
                  <div className="mt-2">
                    <p className="sidebar-section-label">Unassigned sessions</p>
                    {unassignedSessions.map(renderSessionRow)}
                  </div>
                )}

                {search && !visibleSessions.length && (
                  <p className="py-6 text-center text-[11px] text-aro-ink-4">
                    No matching sessions.
                  </p>
                )}

                {/* Frozen & Segregated Audit Drawer */}
                {renderAuditDrawer()}
              </>
            )}
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           BOTS WORKSPACE: Agents, Bot Roster, Companion Conversations
           ══════════════════════════════════════════════════════════════ */
        <>
          {/* Primary Action: New Bot Chat (⌘N) + Search Bots */}
          <div className="sidebar-primary-actions">
            <button
              className="new-session-action"
              onClick={() => handleNewSession()}
              type="button"
            >
              <IconSpark size={15} />
              <span className="rail-label">New bot chat</span>
              <span className="rail-kbd ml-auto text-[9.5px] text-aro-ink-4">⌘N</span>
            </button>

            <div className="sidebar-search-wrap">
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2 text-aro-ink-4"
                size={13}
              />
              <input
                className="sidebar-search"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bots & chats"
                type="text"
                value={search}
              />
            </div>
          </div>

          {/* Bots List & Companion Chats */}
          <div
            className="aro-scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3"
            ref={listRef}
          >
            {/* Bot Roster Heading */}
            <div className="sidebar-projects-heading">
              <span className="rail-label">Bot Roster (Agents)</span>
              <span className="ml-auto font-aro-mono text-[9.5px] text-aro-ink-4">
                {profiles.length} {profiles.length === 1 ? 'bot' : 'bots'}
              </span>
            </div>

            {/* Profiles / Bots list */}
            <div className="space-y-0.5 mb-3">
              {profiles.map(p => {
                const isActive = p.name === currentProfileName
                const pColor = getAvatarColor(p.name)
                const pLabel = profileLabel(p)
                const pInitials = getInitials(pLabel)
                const pRole = p.role || (p.model ? p.model.split('/').pop() : 'Agent Bot')

                return (
                  <div
                    className={cn('bot-roster-row group', isActive && 'selected')}
                    key={p.name}
                    onClick={() => {
                      selectProfile(p.name)
                    }}
                    title={`Switch active bot to ${pLabel}`}
                  >
                    <span
                      className="relative flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: pColor }}
                    >
                      {pInitials}
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 size-[6px] rounded-full ring-1 ring-aro-sunken',
                          isActive ? 'bg-aro-mint' : 'bg-aro-ink-4'
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-medium text-aro-ink-2 group-hover:text-aro-ink">
                          {pLabel}
                        </span>
                        {isActive && (
                          <span className="rounded bg-aro-mint/15 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-aro-mint">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[10px] text-aro-ink-4">
                        {pRole}
                      </span>
                    </div>
                  </div>
                )
              })}
              {profiles.length === 0 && (
                <p className="py-3 text-center text-[11px] text-aro-ink-4">
                  No bot profiles configured.
                </p>
              )}
            </div>

            {/* Bot Conversations Heading */}
            <div className="sidebar-projects-heading">
              <span className="rail-label">Bot Conversations</span>
              <span className="ml-auto font-aro-mono text-[9.5px] text-aro-ink-4">
                {botSessions.length}
              </span>
            </div>

            {/* Bot Sessions */}
            {botSessions.length > 0 ? (
              <div className="space-y-0.5">
                {botSessions.map(renderSessionRow)}
              </div>
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-[12px] font-medium text-aro-ink-3">No bot conversations yet</p>
                <p className="mt-1 text-[11px] text-aro-ink-4">
                  Select a bot above or start a new chat.
                </p>
                <button
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] border border-aro-line bg-aro-raise px-3 py-1.5 text-[12px] font-medium text-aro-ink-2 hover:bg-aro-hover hover:text-aro-ink transition-colors cursor-pointer"
                  onClick={() => handleNewSession()}
                  type="button"
                >
                  <IconSpark size={13} />
                  <span>Start Bot Chat</span>
                </button>
              </div>
            )}

            {/* Frozen & Segregated Audit Drawer */}
            {renderAuditDrawer()}
          </div>
        </>
      )}

      {/* ── Footer: Profile Control + Settings ── */}
      <div className="sidebar-footer">
        {/* Profile Control */}
        <div className="mb-2">
          <Menu
            align="left"
            className="w-full"
            trigger={open => (
              <button
                aria-label={`Profile: ${profileDisplayName || botName}`}
                className={cn(
                  'group flex h-[36px] w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 text-[12px] text-aro-ink-2 transition-all hover:bg-aro-hover hover:text-aro-ink',
                  open && 'bg-aro-hover text-aro-ink'
                )}
                type="button"
              >
                <span
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: botAvatarColor }}
                >
                  {botInitials}
                  <span className="absolute -bottom-0.5 -right-0.5 size-[6px] rounded-full bg-aro-mint ring-1 ring-aro-sunken" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium text-aro-ink leading-tight text-[12.5px]">
                    {profileDisplayName || botName}
                  </span>
                  <span className="block truncate text-[10px] text-aro-ink-4 leading-tight">
                    {matchedProfile?.role || 'Aro Agent Bot'}
                  </span>
                </span>
                <IconChevronDown
                  className="text-aro-ink-4 shrink-0 transition-transform group-hover:text-aro-ink-2"
                  size={11}
                />
              </button>
            )}
            width={245}
          >
            {close => (
              <div className="p-1 space-y-1">
                <div className="flex items-center gap-2 rounded-[7px] bg-aro-sunken p-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: botAvatarColor }}
                  >
                    {botInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-aro-ink">
                      {profileDisplayName || botName}
                    </span>
                    <span className="block truncate text-[10px] text-aro-ink-4">
                      {matchedProfile?.role || 'Aro Agent Bot'}
                    </span>
                  </div>
                </div>

                {profiles.length > 0 && (
                  <>
                    <MenuLabel>Switch Profile</MenuLabel>
                    {profiles.map(p => (
                      <MenuItem
                        active={p.name === currentProfileName}
                        icon={
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: getAvatarColor(p.name) }}
                          />
                        }
                        key={p.name}
                        label={profileLabel(p)}
                        onClick={() => {
                          selectProfile(p.name)
                          close()
                        }}
                      />
                    ))}
                  </>
                )}

                <MenuSep />
                <MenuItem
                  icon={<IconSettings size={12} />}
                  label="Settings"
                  onClick={() => {
                    navigate(SETTINGS_ROUTE)
                    close()
                  }}
                />
              </div>
            )}
          </Menu>
        </div>

        {/* Settings row — same route-derived active contract as the closed
            nav rows: highlighted exactly while the router is on /settings. */}
        <button
          aria-current={onSettings ? 'page' : undefined}
          className={cn('sidebar-navigation-row', onSettings && 'active')}
          onClick={() => navigate(SETTINGS_ROUTE)}
          type="button"
        >
          <IconSettings size={15} />
          <span className="rail-label">Settings</span>
          <Kbd className="rail-kbd ml-auto">⌘,</Kbd>
        </button>

        <p className="mt-2 px-1 text-[9.5px] text-aro-ink-4">
          Code workspace · saved on this device
        </p>
      </div>

      {/* ── Modals: Rename & Delete Confirmation ── */}
      <Modal
        onClose={() => setRenamingSession(null)}
        open={Boolean(renamingSession)}
        title="Rename session"
        width={400}
      >
        <form className="space-y-4 p-4" onSubmit={handleSaveRename}>
          <Input
            autoFocus
            onChange={e => setRenameTitle(e.target.value)}
            value={renameTitle}
          />
          <div className="flex justify-end gap-2">
            {/* type="button" is load-bearing: inside this form an untyped
                button is type="submit", and Enter's implicit submission
                clicks the first submit button — Cancel — so pressing Enter
                to save would throw the rename away (found live in the A1
                harness verification). */}
            <Button onClick={() => setRenamingSession(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={!renameTitle.trim()} type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        onClose={() => setDeletingSession(null)}
        open={Boolean(deletingSession)}
        sub="This permanently removes this conversation from this device."
        title="Delete session?"
        width={420}
      >
        <div className="p-4">
          <p className="text-[12.5px] text-aro-ink-2">
            {deletingSession ? sessionTitle(deletingSession) : ''}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setDeletingSession(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} variant="danger">
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        onClose={() => setRenamingProject(null)}
        open={Boolean(renamingProject)}
        title="Rename project"
        width={400}
      >
        <form
          className="space-y-4 p-4"
          onSubmit={async e => {
            e.preventDefault()

            if (renamingProject && newProjectName.trim()) {
              try {
                await renameProject(renamingProject.id, newProjectName.trim())
              } catch (err) {
                console.error('Failed to rename project:', err)
              }
            }

            setRenamingProject(null)
          }}
        >
          <Input
            autoFocus
            maxLength={60}
            onChange={e => setNewProjectName(e.target.value)}
            value={newProjectName}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRenamingProject(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={!newProjectName.trim()} type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        onClose={() => setDeletingProject(null)}
        open={Boolean(deletingProject)}
        sub="This removes the project from this device."
        title="Delete project?"
        width={420}
      >
        <div className="p-4">
          <p className="text-[12.5px] text-aro-ink-2 font-medium">
            {deletingProject?.name}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setDeletingProject(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (deletingProject) {
                  try {
                    removeProjectFromMap(deletingProject.id)
                    await deleteProject(deletingProject.id)
                    notify({ kind: 'info', message: `Project '${deletingProject.name}' deleted` })
                  } catch (err) {
                    console.error('Failed to delete project:', err)
                  }

                  setDeletingProject(null)
                }
              }}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Aro Project Creation & Renaming Dialog */}
      <AroProjectDialog />
      {/* Git Worktree Branch Dialog */}
      <WorktreeDialog />
    </aside>
  )
}
