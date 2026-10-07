import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { openSession } from '@/app/open-session'
import { NEW_CHAT_ROUTE } from '@/app/routes'
import { IconBranch, IconChevronDown, IconMore, IconPlus, IconSearch } from '@/aro/Icons'
import { Tip } from '@/components/ui/tooltip'
import { formatMessageTimestamp } from '@/components/assistant-ui/thread/timestamp'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n'
import { NEW_SESSION_TITLE, sessionTitle } from '@/lib/chat-runtime'
import { cn } from '@/lib/utils'
import { repoStatusForCwd } from '@/store/coding-status'
import { $pinnedSessionIds } from '@/store/layout'
import { $profiles } from '@/store/profile'
import { $sessions, sessionMatchesStoredId, sessionPinId } from '@/store/session'
import { isAuxiliaryWindow } from '@/store/windows'

import { ProfileTag } from './profile-tag'
import { SessionActionsMenu } from './sidebar/session-actions-menu'

export interface SessionHeaderProps {
  activeSessionId: null | string
  busy?: boolean
  cwd?: null | string
  isRoutedSessionView: boolean
  onDeleteSelectedSession: () => void
  onToggleSelectedPin: () => void
  selectedSessionId: null | string
}

export function SessionHeader({
  activeSessionId,
  busy,
  cwd,
  isRoutedSessionView,
  onDeleteSelectedSession,
  onToggleSelectedPin,
  selectedSessionId
}: SessionHeaderProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const sessions = useStore($sessions)
  const pinnedSessionIds = useStore($pinnedSessionIds)
  const profiles = useStore($profiles)
  const $repoStatus = repoStatusForCwd(cwd)
  const repoStatus = useStore($repoStatus)

  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const activeStoredSession =
    ((selectedSessionId || activeSessionId) &&
      sessions.find(session => sessionMatchesStoredId(session, selectedSessionId || activeSessionId || ''))) ||
    null

  const title = activeStoredSession ? sessionTitle(activeStoredSession) : NEW_SESSION_TITLE

  const showProfileTag = profiles.length > 1 && Boolean(activeStoredSession)

  const selectedIsPinned = activeStoredSession
    ? pinnedSessionIds.includes(sessionPinId(activeStoredSession))
    : selectedSessionId
      ? pinnedSessionIds.includes(selectedSessionId)
      : false

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions.slice(0, 15)
    const q = search.toLowerCase().trim()
    return sessions
      .filter(s => {
        const t = sessionTitle(s).toLowerCase()
        return t.includes(q) || s.id.toLowerCase().includes(q)
      })
      .slice(0, 20)
  }, [sessions, search])

  if (isAuxiliaryWindow() || (!selectedSessionId && !activeSessionId && !isRoutedSessionView)) {
    return null
  }

  const branch = repoStatus?.branch

  return (
    <header
      className="relative z-20 flex h-[44px] shrink-0 items-center justify-between border-b border-aro-line-soft bg-aro-base/85 px-2.5 backdrop-blur-xl"
      data-aro-session-header=""
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {showProfileTag && <ProfileTag className="mr-1 shrink-0" profile={activeStoredSession?.profile} />}

        {/* Prototype / Codex session switcher dropdown */}
        <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'group flex max-w-[420px] min-w-0 cursor-pointer items-center gap-2 rounded-[7px] px-1.5 py-1 transition-colors hover:bg-aro-hover',
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
              <span className="truncate font-aro-sans text-[13.5px] font-semibold tracking-[-0.015em] text-aro-ink">
                {title}
              </span>
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
                className="h-7 w-full rounded-[6px] border border-aro-line-soft bg-aro-sunken pr-2 pl-7 font-aro-mono text-[11px] text-aro-ink placeholder:text-aro-ink-4 focus:border-aro-iris/50 focus:outline-none"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search history…"
                value={search}
              />
            </div>

            <div className="px-2 py-1 font-aro-mono text-[9.5px] font-semibold tracking-wider text-aro-ink-4 uppercase">
              Recent Sessions
            </div>

            <div className="aro-scroll-thin max-h-[280px] overflow-y-auto">
              {filteredSessions.length === 0 ? (
                <div className="px-3 py-4 text-center font-aro-mono text-[11px] text-aro-ink-4">
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
                        'flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px] transition-colors',
                        isActive ? 'bg-aro-raise text-aro-ink font-medium' : 'text-aro-ink-2 hover:bg-aro-hover hover:text-aro-ink'
                      )}
                      key={s.id}
                      onClick={() => {
                        setDropdownOpen(false)
                        openSession(s.id, navigate)
                      }}
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', isActive ? 'bg-aro-cyan' : 'bg-aro-line-strong')} />
                      <span className="min-w-0 flex-1 truncate">{sTitle}</span>
                      {time && <span className="shrink-0 font-aro-mono text-[10px] text-aro-ink-4">{time}</span>}
                    </DropdownMenuItem>
                  )
                })
              )}
            </div>

            <DropdownMenuSeparator className="my-1 bg-aro-line-soft" />

            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11.5px] text-aro-iris-soft transition-colors hover:bg-aro-hover hover:text-aro-iris"
              onClick={() => {
                setDropdownOpen(false)
                navigate(NEW_CHAT_ROUTE)
              }}
            >
              <IconPlus className="shrink-0" size={12} />
              <span className="flex-1 font-medium">New session</span>
              <span className="font-aro-mono text-[10px] text-aro-ink-4 opacity-70">⌘N</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {branch && (
          <span className="hidden items-center gap-1 font-aro-mono text-[10px] text-aro-ink-4 lg:flex">
            <IconBranch size={10} />
            <span className="truncate max-w-[120px]">{branch}</span>
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tip label="New session (⌘N)">
          <button
            aria-label="New session"
            className="flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
            onClick={() => navigate(NEW_CHAT_ROUTE)}
            type="button"
          >
            <IconPlus size={13} />
          </button>
        </Tip>

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
            className="flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
            type="button"
          >
            <IconMore size={13} />
          </button>
        </SessionActionsMenu>
      </div>
    </header>
  )
}
