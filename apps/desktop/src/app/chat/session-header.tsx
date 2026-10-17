import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { openSession } from '@/app/open-session'
import { openWorkspaceTab } from '@/app/right-sidebar/store'
import { NEW_CHAT_ROUTE } from '@/app/routes'
import { ExternalIdeControl } from '@/app/shell/external-ide-control'
import {
  IconBrain,
  IconBranch,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconGit,
  IconList,
  IconMaximize,
  IconMore,
  IconPanelRight,
  IconPlus,
  IconSearch,
  IconTerminal
} from '@/aro/Icons'
import { formatMessageTimestamp } from '@/components/assistant-ui/thread/timestamp'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { NEW_SESSION_TITLE, sessionTitle } from '@/lib/chat-runtime'
import { isMacPlatform } from '@/lib/platform'
import { cn } from '@/lib/utils'
import { repoStatusForCwd } from '@/store/coding-status'
import { $backgroundStatusBySession } from '@/store/composer-status'
import { $fileBrowserOpen, $pinnedSessionIds, toggleRightSide } from '@/store/layout'
import { $profiles, requestFreshSession } from '@/store/profile'
import { $sessions, sessionMatchesStoredId, sessionPinId } from '@/store/session'
import { $subagentsBySession } from '@/store/subagents'
import { isAuxiliaryWindow } from '@/store/windows'

import { ProfileTag } from './profile-tag'
import { SessionActionsMenu } from './sidebar/session-actions-menu'

export interface SessionHeaderProps {
  activeSessionId: null | string
  busy?: boolean
  cwd?: null | string
  isRoutedSessionView: boolean
  messagesEmpty?: boolean
  onDeleteSelectedSession: () => void
  onToggleSelectedPin: () => void
  selectedSessionId: null | string
}

export function SessionHeader({
  activeSessionId,
  busy,
  cwd,
  isRoutedSessionView,
  messagesEmpty = true,
  onDeleteSelectedSession,
  onToggleSelectedPin,
  selectedSessionId
}: SessionHeaderProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const sessions = useStore($sessions)
  const pinnedSessionIds = useStore($pinnedSessionIds)
  const fileBrowserOpen = useStore($fileBrowserOpen)
  const profiles = useStore($profiles)
  const $repoStatus = repoStatusForCwd(cwd)
  const repoStatus = useStore($repoStatus)

  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const bgStatus = useStore($backgroundStatusBySession)
  const subagents = useStore($subagentsBySession)

  const sessionId = selectedSessionId || activeSessionId

  const backgroundTasksCount = useMemo(() => {
    let count = 0
    if (sessionId) {
      count += (bgStatus[sessionId] ?? []).filter(i => i.state === 'running').length
      count += (subagents[sessionId] ?? []).filter(i => i.status === 'running').length
    } else {
      for (const items of Object.values(bgStatus)) {
        count += items.filter(i => i.state === 'running').length
      }
      for (const items of Object.values(subagents)) {
        count += items.filter(i => i.status === 'running').length
      }
    }
    return count
  }, [sessionId, bgStatus, subagents])

  const activeStoredSession =
    ((selectedSessionId || activeSessionId) &&
      sessions.find(session => sessionMatchesStoredId(session, selectedSessionId || activeSessionId || ''))) ||
    null

  const hasChat = !messagesEmpty || Boolean(busy)
  const isEmptyDraft =
    (!activeStoredSession || activeStoredSession.id.startsWith('draft_')) &&
    [selectedSessionId, activeSessionId].filter(Boolean).every(id => id!.startsWith('draft_')) &&
    messagesEmpty &&
    !busy

  const [overviewOpen, setOverviewOpen] = useState(Boolean(busy))

  // Open when a task starts; a user close stays respected until busy changes.
  useEffect(() => {
    if (busy) {
      setOverviewOpen(true)
    }
  }, [busy])

  const title = activeStoredSession ? sessionTitle(activeStoredSession) : NEW_SESSION_TITLE
  const showSessionSwitcher = Boolean(activeStoredSession && !activeStoredSession.id.startsWith('draft_'))
  const newFullViewShortcut = isMacPlatform() ? '⌘N' : 'Ctrl+N'

  const showProfileTag = profiles.length > 1 && Boolean(activeStoredSession)

  const selectedIsPinned = activeStoredSession
    ? pinnedSessionIds.includes(sessionPinId(activeStoredSession))
    : selectedSessionId
      ? pinnedSessionIds.includes(selectedSessionId)
      : false

  const filteredSessions = useMemo(() => {
    if (!search.trim()) {
      return sessions.slice(0, 15)
    }
    const q = search.toLowerCase().trim()

    return sessions
      .filter(s => {
        const t = sessionTitle(s).toLowerCase()

        return t.includes(q) || s.id.toLowerCase().includes(q)
      })
      .slice(0, 20)
  }, [sessions, search])

  if (isAuxiliaryWindow()) {
    return null
  }

  const branch = repoStatus?.branch

  const openWorkspaceNewTab = () => {
    openWorkspaceTab('launchpad')
    if (!fileBrowserOpen) {
      toggleRightSide()
    }
  }

  return (
    <header
      className={cn(
        'z-20 flex items-center justify-between',
        isEmptyDraft
          ? 'pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible px-2.5'
          : 'relative h-[44px] shrink-0 border-b border-aro-line-soft bg-aro-base/85 px-2.5 backdrop-blur-xl'
      )}
      data-aro-session-header=""
      data-aro-session-header-mode={isEmptyDraft ? 'corner-tabs-only' : 'session'}
    >
      {!isEmptyDraft && (
        <div className="flex min-w-0 items-center gap-1.5">
          {showProfileTag && <ProfileTag className="mr-1 shrink-0" profile={activeStoredSession?.profile} />}

          {/* Keep the blank draft header clear; stored chats can switch history here. */}
          {showSessionSwitcher && (
            <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'group flex max-w-[420px] min-w-0 cursor-pointer items-center gap-2 rounded-control px-1.5 py-1 transition-colors hover:bg-aro-hover',
                    dropdownOpen && 'bg-aro-hover'
                  )}
                  type="button"
                >
                  <span
                    className={cn(
                      'size-[7px] shrink-0 rounded-full',
                      busy
                        ? 'animate-aro-breathe bg-aro-cyan'
                        : activeStoredSession
                          ? 'bg-aro-mint'
                          : 'bg-aro-line-strong'
                    )}
                  />
                  <span className="truncate font-aro-sans text-sm font-medium text-aro-ink">{title}</span>
                  <IconChevronDown
                    className="shrink-0 text-aro-ink-4 opacity-70 transition-transform group-hover:translate-y-px"
                    size={11}
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-[320px] p-1.5 sm:w-[360px]">
                <div className="relative mb-1 px-1 pt-1">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-3 -translate-y-1/2 text-aro-ink-4" />
                  <input
                    autoFocus
                    className="h-7 w-full rounded-control border border-aro-line-soft bg-aro-sunken pr-2 pl-7 font-aro-mono text-xs text-aro-ink placeholder:text-aro-ink-4 focus:border-aro-iris/50 focus:outline-none"
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search history…"
                    value={search}
                  />
                </div>

                <div className="px-2 py-1 font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold tracking-wider text-aro-ink-4 uppercase">
                  Recent Sessions
                </div>

                <div className="aro-scroll-thin max-h-[280px] overflow-y-auto">
                  {filteredSessions.length === 0 ? (
                    <div className="px-3 py-4 text-center font-aro-mono text-xs text-aro-ink-4">
                      No sessions found
                    </div>
                  ) : (
                    filteredSessions.map(s => {
                      const sTitle = sessionTitle(s)
                      const isActive = activeStoredSession && sessionMatchesStoredId(s, activeStoredSession.id)

                      const time = s.last_active
                        ? formatMessageTimestamp(new Date(s.last_active * 1000), t.assistant.thread)
                        : ''

                      return (
                        <DropdownMenuItem
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-xs transition-colors',
                            isActive
                              ? 'bg-aro-raise text-aro-ink font-medium'
                              : 'text-aro-ink-2 hover:bg-aro-hover hover:text-aro-ink'
                          )}
                          key={s.id}
                          onClick={() => {
                            setDropdownOpen(false)
                            openSession(s.id, navigate)
                          }}
                        >
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              isActive ? 'bg-aro-cyan' : 'bg-aro-line-strong'
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{sTitle}</span>
                          {time && <span className="shrink-0 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">{time}</span>}
                        </DropdownMenuItem>
                      )
                    })
                  )}
                </div>

                <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />

                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-xs text-aro-iris-soft transition-colors hover:bg-aro-hover hover:text-aro-iris"
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate(NEW_CHAT_ROUTE)
                  }}
                >
                  <IconPlus className="shrink-0" size={12} />
                  <span className="flex-1 font-medium">New session</span>
                  <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 opacity-70">⌘N</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {branch && (
            <span className="hidden items-center gap-1 font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 lg:flex">
              <IconBranch size={10} />
              <span className="truncate max-w-[120px]">{branch}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5 ml-auto">
        {!isEmptyDraft && hasChat && (
          <>
            {cwd && <ExternalIdeControl compact />}

            {/* Overview Popover: automatically opens when agent task is running, otherwise toggled via icon */}
            <Popover modal={false} onOpenChange={setOverviewOpen} open={overviewOpen}>
              <Tip label={overviewOpen ? 'Close overview' : 'Overview'} side="bottom">
                <PopoverTrigger asChild>
                  <button
                    aria-label="Overview"
                    aria-pressed={overviewOpen}
                    className={cn(
                      'flex size-7 cursor-pointer items-center justify-center rounded-control text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink',
                      overviewOpen && 'bg-aro-hover text-aro-iris-soft'
                    )}
                    type="button"
                  >
                    <IconList size={14} />
                  </button>
                </PopoverTrigger>
              </Tip>
              <PopoverContent
                align="end"
                className="w-52 rounded-control border border-aro-line bg-aro-raise/95 p-1.5 shadow-aro-e4 backdrop-blur-xl z-50 text-aro-ink"
                onOpenAutoFocus={e => e.preventDefault()}
                side="bottom"
                sideOffset={6}
                variant="menu"
              >
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-aro-ink-3 tracking-wider">
                  <span>Overview</span>
                  <IconMore size={12} className="text-aro-ink-4 hover:text-aro-ink-2 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      openWorkspaceTab('changes')
                      if (!fileBrowserOpen) toggleRightSide()
                      setOverviewOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full py-1.5 px-2 text-xs text-aro-ink rounded-control cursor-pointer hover:bg-aro-hover transition-colors text-left"
                  >
                    <IconGit size={13} className="text-aro-ink-3 shrink-0" />
                    <span>Changes</span>
                    <span className="sr-only">Review</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openWorkspaceTab('files')
                      if (!fileBrowserOpen) toggleRightSide()
                      setOverviewOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full py-1.5 px-2 text-xs text-aro-ink rounded-control cursor-pointer hover:bg-aro-hover transition-colors text-left"
                  >
                    <IconFolder size={13} className="text-aro-ink-3 shrink-0" />
                    <span>Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openWorkspaceTab('terminal')
                      if (!fileBrowserOpen) toggleRightSide()
                      setOverviewOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full py-1.5 px-2 text-xs text-aro-ink rounded-control cursor-pointer hover:bg-aro-hover transition-colors text-left"
                  >
                    <IconTerminal size={13} className="text-aro-ink-3 shrink-0" />
                    <span>Terminal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openWorkspaceTab('context')
                      if (!fileBrowserOpen) toggleRightSide()
                      setOverviewOpen(false)
                    }}
                    className="flex items-center justify-between w-full py-1.5 px-2 text-xs text-aro-ink rounded-control cursor-pointer hover:bg-aro-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconBrain size={13} className="text-aro-ink-3 shrink-0" />
                      <span>Plugins</span>
                    </div>
                    <IconChevronRight size={11} className="text-aro-ink-4 shrink-0" />
                  </button>
                </div>
                <div className="my-1 border-t border-aro-line-soft" />
                <div className="flex items-center justify-between px-2 py-1 text-xs text-aro-ink-3">
                  <span>Background Tasks</span>
                  <span className="font-mono text-xs font-medium text-aro-ink-3">{backgroundTasksCount}</span>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {!isEmptyDraft && (
          <SessionActionsMenu
            align="end"
            onDelete={selectedSessionId ? onDeleteSelectedSession : undefined}
            onPin={selectedSessionId ? onToggleSelectedPin : undefined}
            pinned={selectedIsPinned}
            profile={activeStoredSession?.profile}
            sessionId={selectedSessionId || activeSessionId || ''}
            sideOffset={8}
            title={title}
          >
            <button
              aria-label="Session actions"
              className="flex size-7 cursor-pointer items-center justify-center rounded-control text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
              type="button"
            >
              <IconMore size={13} />
            </button>
          </SessionActionsMenu>
        )}

        {/* Unified New Tab / Workspace Panel Toggle Button in right-side corner */}
        <Tip
          label={fileBrowserOpen ? 'Close workspace panel · ⌘J' : t.zones.newTab}
          side="bottom"
        >
          <button
            aria-label={
              fileBrowserOpen
                ? 'Close workspace panel · Toggle workspace panel'
                : `${t.zones.newTab} · Toggle workspace panel`
            }
            aria-pressed={fileBrowserOpen}
            className={cn(
              'pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-control text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink',
              fileBrowserOpen && 'bg-aro-hover text-aro-iris-soft'
            )}
            data-aro-new-tab-menu=""
            onClick={() => {
              if (fileBrowserOpen) {
                toggleRightSide()
              } else {
                openWorkspaceTab('launchpad')
                toggleRightSide()
              }
            }}
            type="button"
          >
            {fileBrowserOpen ? <IconPanelRight size={14} /> : <IconPlus size={13} />}
          </button>
        </Tip>
      </div>
    </header>
  )
}
