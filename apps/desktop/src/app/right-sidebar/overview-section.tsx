import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'

import {
  IconBranch,
  IconCheck,
  IconChevronRight,
  IconFile,
  IconFilePlus,
  IconFolder,
  IconGit,
  IconList,
  IconRefresh,
  IconSpark,
  IconTerminal,
  IconUndo,
  IconX
} from '@/aro/Icons'
import { fmtClock, messagesToSteps, SourceBadge, useAroCheckpoints } from '@/aro/live'
import { ToastHost, useToasts } from '@/aro/toasts'
import { Badge, Bar, Button, Panel } from '@/aro/ui'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { displayPath } from '@/lib/display-path'
import { cn } from '@/lib/utils'
import { repoStatusForCwd } from '@/store/coding-status'
import { activeGateway } from '@/store/gateway'
import { notifyError } from '@/store/notifications'
import { $reviewFiles, refreshReview, reviewRepoCwd, selectReviewFile } from '@/store/review'
import { $activeSessionId, $messages, $selectedStoredSessionId, $sessions } from '@/store/session'
import { $focusedWorkspaceCwd } from '@/store/session-states'
import { $todosBySession } from '@/store/todos'

import { openWorkspaceTab } from './store'

function getFileBadge(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'tsx' || ext === 'ts') {
    return <span className="rounded-control bg-sky-500/15 px-1 py-0.5 font-mono text-[var(--aro-text-2xs,10px)] font-bold text-sky-400 shrink-0">TS</span>
  }
  if (ext === 'jsx' || ext === 'js') {
    return <span className="rounded-control bg-amber-500/15 px-1 py-0.5 font-mono text-[var(--aro-text-2xs,10px)] font-bold text-amber-400 shrink-0">JS</span>
  }
  if (ext === 'md') {
    return <span className="rounded-control bg-emerald-500/15 px-1 py-0.5 font-mono text-[var(--aro-text-2xs,10px)] font-bold text-emerald-400 shrink-0">MD</span>
  }
  if (ext === 'css' || ext === 'scss') {
    return <span className="rounded-control bg-cyan-500/15 px-1 py-0.5 font-mono text-[var(--aro-text-2xs,10px)] font-bold text-cyan-400 shrink-0">CSS</span>
  }
  if (ext === 'json' || ext === 'yaml' || ext === 'yml') {
    return <Codicon name="json" size="0.8rem" className="text-amber-400 shrink-0" />
  }
  if (['py', 'rs', 'go', 'cpp', 'c', 'java'].includes(ext || '')) {
    return <Codicon name="file-code" size="0.8rem" className="text-indigo-400 shrink-0" />
  }
  return <IconFile size={13} className="text-aro-ink-4 shrink-0" />
}

export function OverviewSection() {
  const { items, toast } = useToasts()

  const activeSessionId = useStore($activeSessionId)
  const selectedStoredId = useStore($selectedStoredSessionId)
  const sessionId = activeSessionId || selectedStoredId
  const sessions = useStore($sessions)
  const messages = useStore($messages)
  const targetCwd = useStore($focusedWorkspaceCwd)
  const files = useStore($reviewFiles)

  const cwd = reviewRepoCwd() || targetCwd || ''
  const repoStatus = useStore(repoStatusForCwd(cwd))
  const currentBranch = repoStatus?.branch || 'main'

  const liveCheckpoints = useAroCheckpoints(sessionId, Boolean(sessionId))
  const checkpoints = liveCheckpoints ?? []

  const sessionObj = useMemo(() => {
    return sessions.find(s => s.id === sessionId)
  }, [sessions, sessionId])

  const sessionTitle = sessionObj?.title?.trim() || 'Active Session'
  const steps = useMemo(() => messagesToSteps(messages), [messages])

  // Count metrics
  const totalAdded = useMemo(() => files.reduce((acc, f) => acc + (f.added || 0), 0), [files])
  const totalRemoved = useMemo(() => files.reduce((acc, f) => acc + (f.removed || 0), 0), [files])

  const toolSteps = useMemo(() => {
    return steps.filter(s => s.type === 'tool')
  }, [steps])

  const todosMap = useStore($todosBySession)
  const todos = useMemo(() => (sessionId ? todosMap[sessionId] ?? [] : []), [sessionId, todosMap])
  const completedTodos = useMemo(() => todos.filter(t => t.status === 'completed').length, [todos])

  const [restoringHash, setRestoringHash] = useState<string | null>(null)

  const handleRestoreCheckpoint = async (hash: string) => {
    if (!sessionId) {
      toast('No active session for rollback', 'rose')
      return
    }

    const gateway = activeGateway()
    if (!gateway) {
      toast('Gateway not connected', 'rose')
      return
    }

    try {
      setRestoringHash(hash)
      await gateway.request('rollback.restore', { session_id: sessionId, hash })
      toast(`Restored checkpoint ${hash.slice(0, 7)} — working tree rolled back`, 'mint')
      void refreshReview()
    } catch (err) {
      notifyError(err, 'Checkpoint rollback failed')
      toast('Restore rejected by gateway', 'rose')
    } finally {
      setRestoringHash(null)
    }
  }

  const handleSelectFile = (file: typeof files[0]) => {
    void selectReviewFile(file)
    openWorkspaceTab('changes')
  }

  return (
    <div className="aro-scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto bg-aro-base p-3.5 space-y-4">
      {/* 1. Header Overview Card */}
      <Panel className="p-3.5 border-aro-line-soft bg-aro-raise/70 shadow-aro-e1 relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-aro-mono text-[var(--aro-text-2xs,10px)] font-semibold uppercase tracking-wider text-aro-ink-4">
              <IconSpark size={11} className="text-aro-iris-soft" />
              <span>Turn Overview</span>
              <span>·</span>
              <span className="text-aro-cyan font-bold">{currentBranch}</span>
            </div>
            <h2 className="mt-1 font-aro-display text-sm font-semibold text-aro-ink truncate" title={sessionTitle}>
              {sessionTitle}
            </h2>
          </div>
          <SourceBadge live={Boolean(sessionId)} />
        </div>

        {/* Churn & Progress KPI stats */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-aro-line-soft/80 pt-3 text-center">
          <div className="rounded-control bg-aro-sunken/60 p-2">
            <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 uppercase">Touched</div>
            <div className="mt-0.5 font-aro-mono text-sm font-bold text-aro-ink">
              {files.length} <span className="text-aro-xs font-normal text-aro-ink-3">files</span>
            </div>
          </div>
          <div className="rounded-control bg-aro-sunken/60 p-2">
            <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 uppercase">Net Churn</div>
            <div className="mt-0.5 font-aro-mono text-xs font-bold">
              <span className="text-emerald-500 font-bold">+{totalAdded}</span>{' '}
              <span className="text-rose-500 font-bold">−{totalRemoved}</span>
            </div>
          </div>
          <div className="rounded-control bg-aro-sunken/60 p-2">
            <div className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 uppercase">Steps</div>
            <div className="mt-0.5 font-aro-mono text-sm font-bold text-aro-iris-soft">
              {toolSteps.length} <span className="text-aro-xs font-normal text-aro-ink-3">runs</span>
            </div>
          </div>
        </div>

        {/* Plan bar if todos exist */}
        {todos.length > 0 && (
          <div className="mt-3 border-t border-aro-line-soft/80 pt-2.5">
            <div className="flex items-center justify-between font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 mb-1.5">
              <span>Plan Progress</span>
              <span className="text-aro-ink-2 font-semibold">{completedTodos}/{todos.length} done</span>
            </div>
            <Bar value={Math.round((completedTodos / todos.length) * 100)} tone="iris" height={3} />
          </div>
        )}
      </Panel>

      {/* 2. Touched Files Ledger (Codex Review Interaction) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <IconFile size={13} className="text-aro-ink-3" />
            <span className="font-aro-mono text-xs font-semibold text-aro-ink uppercase tracking-wide">
              Changed Files ({files.length})
            </span>
          </div>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => openWorkspaceTab('changes')}
              className="flex items-center gap-1 text-[var(--aro-text-2xs,10px)] font-aro-mono text-aro-iris-soft hover:text-aro-iris transition-colors cursor-pointer"
            >
              <span>Review diffs</span>
              <span className="rounded-control border border-aro-line px-1 text-aro-xs text-aro-ink-3">Ctrl+Shift+G</span>
              <IconChevronRight size={11} />
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div className="rounded-control border border-dashed border-aro-line-soft p-5 text-center bg-aro-sunken/30">
            <IconFilePlus size={24} className="mx-auto text-aro-ink-4 opacity-50 mb-1.5" />
            <p className="text-xs text-aro-ink-3 font-medium">Working tree clean</p>
            <p className="text-[var(--aro-text-2xs,10px)] text-aro-ink-4 mt-0.5">Files changed by the agent in this session will appear here.</p>
          </div>
        ) : (
          <div className="rounded-control border border-aro-line-soft bg-aro-raise/40 divide-y divide-aro-line-soft/60 overflow-hidden shadow-aro-e1">
            {files.map(f => {
              const fileName = f.path.split(/[\\/]+/).pop() || f.path
              const parentDir = f.path.includes('/') || f.path.includes('\\')
                ? f.path.slice(0, f.path.lastIndexOf(f.path.includes('/') ? '/' : '\\'))
                : ''

              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => handleSelectFile(f)}
                  className="flex items-center justify-between w-full p-2.5 text-left hover:bg-aro-hover/70 transition-colors cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileBadge(f.path)}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-medium text-aro-ink truncate group-hover:text-aro-iris-soft transition-colors">
                        {fileName}
                      </p>
                      {parentDir && (
                        <p className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 truncate" title={displayPath(f.path)}>
                          {parentDir}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[var(--aro-text-2xs,10px)] pl-2">
                    <span className="text-emerald-500 font-bold">+{f.added}</span>
                    <span className="text-rose-500 font-bold">−{f.removed}</span>
                    <IconChevronRight size={11} className="text-aro-ink-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Turn Steps / Tool Execution Ledger */}
      {toolSteps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <IconTerminal size={13} className="text-aro-ink-3" />
              <span className="font-aro-mono text-xs font-semibold text-aro-ink uppercase tracking-wide">
                Recent Actions ({toolSteps.length})
              </span>
            </div>
          </div>

          <div className="rounded-control border border-aro-line-soft bg-aro-raise/40 divide-y divide-aro-line-soft/60 overflow-hidden shadow-aro-e1">
            {toolSteps.slice(-5).reverse().map((step, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'size-2 rounded-full shrink-0',
                    step.status === 'done' ? 'bg-emerald-500' : step.status === 'error' ? 'bg-rose-500' : 'bg-cyan-400 animate-pulse'
                  )} />
                  <span className="font-mono font-medium text-aro-ink-2 truncate">
                    {step.tool || 'action'}
                  </span>
                  {step.target && (
                    <span className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 truncate max-w-[140px]" title={step.target}>
                      {step.target}
                    </span>
                  )}
                </div>
                {step.ms != null && (
                  <span className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 shrink-0">
                    {step.ms}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Checkpoints & Rollback Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <IconUndo size={13} className="text-aro-ink-3" />
            <span className="font-aro-mono text-xs font-semibold text-aro-ink uppercase tracking-wide">
              Checkpoints ({checkpoints.length})
            </span>
          </div>
          <span className="font-aro-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4">auto-saved</span>
        </div>

        {checkpoints.length === 0 ? (
          <div className="rounded-control border border-aro-line-soft/60 bg-aro-sunken/30 p-3 text-center">
            <p className="text-[var(--aro-text-2xs,10px)] text-aro-ink-4">No checkpoints recorded for this turn.</p>
          </div>
        ) : (
          <div className="rounded-control border border-aro-line-soft bg-aro-raise/40 divide-y divide-aro-line-soft/60 overflow-hidden shadow-aro-e1">
            {checkpoints.slice(0, 4).map((cp, idx) => {
              const isRestoring = restoringHash === cp.hash

              return (
                <div key={cp.hash + idx} className="p-2.5 flex items-center justify-between gap-2 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('size-1.5 rounded-full shrink-0', idx === 0 ? 'bg-aro-iris' : 'bg-aro-line-strong')} />
                    <div className="min-w-0">
                      <p className="text-xs text-aro-ink-2 font-medium truncate">{cp.label}</p>
                      <p className="font-mono text-[var(--aro-text-2xs,10px)] text-aro-ink-4 truncate">
                        {cp.hash.slice(0, 7)} {cp.at ? `· ${cp.at}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={isRestoring}
                    onClick={() => void handleRestoreCheckpoint(cp.hash)}
                    className="shrink-0"
                  >
                    {isRestoring ? (
                      <IconRefresh size={9} className="animate-spin mr-1" />
                    ) : (
                      <IconUndo size={9} className="mr-1" />
                    )}
                    Restore
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Bottom Quick Review Bar */}
      {files.length > 0 && (
        <div className="pt-2">
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2 text-xs h-8"
            onClick={() => openWorkspaceTab('changes')}
          >
            <IconCheck size={13} />
            <span>Open Changes Review ({files.length})</span>
          </Button>
        </div>
      )}

      <ToastHost items={items} />
    </div>
  )
}
