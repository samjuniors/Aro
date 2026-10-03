/**
 * ARO LIVE WIRING (R2/R3) — real agent data into the ported pattern pages.
 *
 * The pages in this folder shipped as pattern ports driven by the seed shapes
 * in `workbenchData.ts`. This module replaces the seeds with the host app's
 * own live stores — the same nanostores the chat thread, review pane and
 * composer already consume — folded into the Aro `Step`/`DiffFile`/`Task`
 * wire shapes so the proven components render unchanged:
 *
 *   · useAroTranscript — $messages (active session) → Step[] tool timeline,
 *     live approvals from the prompt queue answered through the real
 *     gateway (`approval.respond` / server-request reply), checkpoints
 *     from `rollback.list`, plus a session picker over $sessions (R3).
 *   · useAroReview     — $reviewFiles + per-file `review/diff` git calls →
 *     DiffFile[] for the hunk-level accept/reject/comment page.
 *   · useAroTasks      — $todosBySession (the agent's todo_list state) →
 *     the work-graph Task shape.
 *
 * Every hook reports `live`: when the backend has no data yet (no session,
 * empty workspace, no todos) the page falls back to the seed shapes and the
 * header shows a DEMO DATA badge instead of LIVE — nothing is faked as real.
 */

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { openSessionFromPicker } from '@/app/open-session'
import type { ChatMessage, ChatMessagePart } from '@/lib/chat-messages/types'
import { desktopGit } from '@/lib/desktop-git'
import { parseTodos, type TodoItem } from '@/lib/todos'
import { cn } from '@/lib/utils'
import { activeGateway } from '@/store/gateway'
import { $approvalRequests, answerApproval, type ApprovalRequest } from '@/store/prompts'
import { $reviewFiles, refreshReview, reviewRepoCwd, stageReviewFile, unstageReviewFile } from '@/store/review'
import { $activeSessionId, $busy, $messages, $sessions } from '@/store/session'
import { $sessionStates } from '@/store/session-states'
import { $retainedTodosBySession, $todosBySession } from '@/store/todos'
import { $workspaceChangeTick } from '@/store/workspace-events'
import type { SessionInfo } from '@/types/hermes'

import { type DiffFile, type DiffLine, REVIEW_CHECKPOINTS, type Step, type Task, TASKS, type ToolName, TRANSCRIPT } from './workbenchData'

/* ============================ pure adapters ============================ */

const MAX_TOOL_LINES = 60

/** Hermes tool names → the ToolName union the timeline cards render. */
const TOOL_NAME_MAP: Record<string, ToolName> = {
  read: 'read', view: 'read', ls: 'read',
  edit: 'edit', apply_patch: 'edit', patch: 'edit', apply: 'edit',
  write: 'write', create: 'write', save: 'write',
  bash: 'bash', shell: 'bash', execute: 'bash', run_command: 'bash', execute_code: 'bash',
  grep: 'grep', search: 'grep', find: 'grep', glob: 'grep', ripgrep: 'grep',
  'todo_list': 'plan', todo: 'plan', plan: 'plan', task: 'plan', update_plan: 'plan',
  browser: 'browser', open_url: 'browser', web_search: 'browser', browser_navigate: 'browser', browse: 'browser'
}

export function mapToolName(name: string): ToolName {
  const n = name.toLowerCase()

  if (TOOL_NAME_MAP[n]) {return TOOL_NAME_MAP[n]}

  if (n.startsWith('mcp__') || n.startsWith('mcp.') || n.startsWith('mcp-')) {return 'mcp'}

  if (n.startsWith('browser_') || n.startsWith('web_') || n.startsWith('preview_')) {return 'browser'}

  if (/(^|_)(test|pytest|vitest|jest)/.test(n)) {return 'test'}

  return 'mcp'
}

/** Short, single-line target for a tool card header (path / command / query). */
export function toolTarget(args: unknown): string | undefined {
  if (args == null) {return undefined}

  if (typeof args === 'string') {return clip(args.replace(/\s+/g, ' '), 72)}

  if (typeof args !== 'object' || Array.isArray(args)) {return undefined}
  const a = args as Record<string, unknown>

  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = a[k]

      if (typeof v === 'string' && v.trim()) {return v}
    }

    return undefined
  }

  const target =
    pick('command') ?? pick('file_path') ?? pick('path') ?? pick('file') ?? pick('filename') ??
    pick('pattern') ?? pick('query') ?? pick('url') ?? pick('name')

  return target ? clip(target.replace(/\s+/g, ' '), 72) : undefined
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

type ToolCallPart = Extract<ChatMessagePart, { type: 'tool-call' }>

/** Body of a finished tool call: `lines` for reads/plans, `output` for shells. */
function toolBody(tool: ToolName, result: unknown, meta: ToolCallPart['toolResultMetadata']): { lines?: string[]; output?: string[] } {
  if (tool === 'plan' && meta?.todos != null) {
    const todos = parseTodos(meta.todos)

    if (todos && todos.length > 0) {
      const mark = (s: TodoItem['status']) => (s === 'completed' ? '[x]' : s === 'in_progress' ? '[~]' : s === 'cancelled' ? '[-]' : '[ ]')

      return { lines: todos.map(t => `${mark(t.status)} ${t.content}`) }
    }
  }

  let text = ''

  if (typeof result === 'string') {text = result}
  else if (typeof meta?.summary === 'string' && meta.summary) {text = meta.summary}
  else if (result != null) {
    try { text = JSON.stringify(result, null, 2) } catch { text = String(result) }
  }

  const clean = text.replace(/\n+$/, '')

  if (!clean) {return {}}
  const all = clean.split('\n')

  const lines = all.length > MAX_TOOL_LINES
    ? [...all.slice(0, MAX_TOOL_LINES), `… ${all.length - MAX_TOOL_LINES} more lines`]
    : all

  return tool === 'bash' || tool === 'test' ? { output: lines } : { lines }
}

function toolStepFromPart(part: ToolCallPart): Step | null {
  const name = part.toolName || 'tool'
  const tool = mapToolName(name)
  const meta = part.toolResultMetadata
  const running = part.result === undefined && part.completedAt === undefined
  const status: 'running' | 'done' | 'error' = running ? 'running' : part.isError ? 'error' : 'done'
  const ms = meta?.duration_s != null ? Math.round(meta.duration_s * 1000) : undefined
  const diffText = typeof meta?.inline_diff === 'string' && meta.inline_diff.trim() ? meta.inline_diff : undefined
  const diff = diffText ? parseUnifiedDiff(diffText) ?? undefined : undefined

  return {
    type: 'tool',
    tool,
    target: toolTarget(part.args),
    status,
    ms,
    diff,
    ...toolBody(tool, part.result, meta),
  }
}

const asMs = (t: number): number => (t > 1e12 ? t : t * 1000)

export function fmtClock(unixSeconds?: number): string {
  if (!unixSeconds) {return ''}

  try {
    return new Date(asMs(unixSeconds)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function textOfParts(parts: readonly ChatMessagePart[]): string {
  let text = ''

  for (const p of parts) {if (p.type === 'text' && typeof p.text === 'string') {text += p.text}}

  return text
}

/** Fold the active session's ChatMessage[] into the timeline Step[] story. */
export function messagesToSteps(messages: readonly ChatMessage[]): Step[] {
  const steps: Step[] = []

  for (const msg of messages) {
    if (msg.hidden || msg.systemNotice) {continue}

    if (msg.role === 'user') {
      const text = textOfParts(msg.parts).trim()

      if (text) {steps.push({ type: 'user', text, at: fmtClock(msg.timestamp) })}

      continue
    }

    if (msg.role !== 'assistant') {continue}
    let pendingText = ''

    for (const part of msg.parts) {
      if (part.type === 'reasoning') {
        const text = (part.text ?? '').trim()
        const ms = part.timestamp && part.completedAt ? Math.max(0, Math.round((part.completedAt - part.timestamp) * 1000)) : 0

        if (text) {steps.push({ type: 'thinking', text, ms })}
      } else if (part.type === 'text') {
        pendingText += part.text ?? ''
      } else if (part.type === 'tool-call') {
        const step = toolStepFromPart(part)

        if (step) {steps.push(step)}
      }
    }

    const text = pendingText.trim()

    if (text) {steps.push({ type: 'text', text, agentId: 'aro' })}
  }

  return steps
}

/* ======================== unified diff parser ======================== */

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

function normDiffPath(raw: string): string | null {
  const first = raw.trim().split(/\t/)[0] ?? ''
  const unquoted = first.replace(/^"|"$/g, '')

  if (!unquoted || unquoted === '/dev/null') {return null}

  return unquoted.replace(/^[ab]\//, '')
}

/** Parse a unified diff string into DiffFiles (marker-stripped, numbered). */
export function parseUnifiedDiffs(diff: string): DiffFile[] {
  const files: DiffFile[] = []
  let cur: DiffFile | null = null
  let o = 0
  let n = 0

  const ensure = (path: string): DiffFile => {
    if (!cur) {
      cur = { path, adds: 0, dels: 0, lines: [] }
      files.push(cur)
    }

    return cur
  }

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git') || raw.startsWith('Index: ') || raw.startsWith('Binary files') || raw.startsWith('rename ') || raw.startsWith('old mode') || raw.startsWith('new mode')) {
      cur = null

      continue
    }

    if (raw.startsWith('--- ') || raw.startsWith('+++ ')) {
      const path = normDiffPath(raw.slice(4))

      if (path && raw.startsWith('+++ ')) {
        if (cur && cur.path === 'file') {cur.path = path}
        else if (!cur || cur.path !== path) {
          cur = { path, adds: 0, dels: 0, lines: [] }
          files.push(cur)
        }
      }

      continue
    }

    const hm = HUNK_RE.exec(raw)

    if (hm) {
      ensure('file')
      o = Number(hm[1])
      n = Number(hm[2])
      cur!.lines.push({ t: 'hunk', text: raw, o, n })

      continue
    }

    if (!cur) {continue}

    if (raw.startsWith('+')) {
      cur.lines.push({ t: 'add', text: raw.slice(1), n })
      cur.adds++
      n++
    } else if (raw.startsWith('-')) {
      cur.lines.push({ t: 'del', text: raw.slice(1), o })
      cur.dels++
      o++
    } else if (raw.startsWith(' ')) {
      cur.lines.push({ t: 'ctx', text: raw.slice(1), o, n })
      o++
      n++
    }
  }

  return files.filter(f => f.lines.some(l => l.t !== 'hunk'))
}

/** Parse a (single-file) unified diff; falls back to the first file found. */
export function parseUnifiedDiff(diff: string, pathHint?: string): DiffFile | null {
  const files = parseUnifiedDiffs(diff)

  if (files.length === 0) {return null}

  return (pathHint && files.find(f => f.path === pathHint)) || files[0] || null
}

/* ============================ todos → tasks ============================ */

const TODO_STATUS_TO_TASK: Record<TodoItem['status'], Task['status']> = {
  pending: 'ready',
  in_progress: 'running',
  completed: 'done',
  cancelled: 'backlog',
}

/** The agent's live todo_list → the work-graph Task shape. */
export function todosToTasks(todos: readonly TodoItem[]): Task[] {
  return todos.map((t, i) => ({
    id: t.id || `t${i + 1}`,
    key: `TODO-${String(i + 1).padStart(2, '0')}`,
    title: t.content,
    status: TODO_STATUS_TO_TASK[t.status] ?? 'backlog',
    priority: t.status === 'in_progress' ? 'p1' : 'p2',
    source: 'agent' as const,
    estimate: t.status === 'in_progress' ? 'now' : '—',
    deps: t.parent && t.parent !== t.id ? [t.parent] : undefined,
    criteria: [],
    tags: t.status === 'cancelled' ? ['cancelled'] : ['todo'],
  }))
}

/* ============================ risk heuristic ============================ */

function approvalRisk(command: string): 'low' | 'medium' | 'high' {
  const c = command.toLowerCase()

  if (/(rm\s+-rf|sudo|mkfs|dd\s+if=|chmod\s+777|curl[^|]*\|\s*(ba)?sh|wget[^|]*\|\s*(ba)?sh|git\s+push\s+(-f|--force))/.test(c)) {return 'high'}

  if (/(git\s+(push|reset|clean)|npm\s+(publish|install)|pnpm\s+install|yarn\s+add|pip\s+install|apt(-get)?|brew\s+install|systemctl|docker\s+(run|rm)|kill(all)?\s)/.test(c)) {return 'medium'}

  return 'low'
}

/* ============================ source badge ============================ */

export function SourceBadge({ live, demoLabel }: { live: boolean; demoLabel?: string }) {
  return live ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-aro-mint/30 bg-aro-mint-tint px-2 py-px font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-mint uppercase">
      <i className="size-[5px] animate-aro-breathe rounded-full bg-aro-mint" />
      live
    </span>
  ) : (
    <span
      className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-aro-amber/30 bg-aro-amber-tint px-2 py-px font-aro-mono text-[9.5px] font-semibold tracking-[.12em] text-aro-amber uppercase"
      title="No live data yet — the seed shapes from the prototype are shown. Start a session (or open one) and this page goes live on its own."
    >
      <i className="size-[5px] rounded-full bg-aro-amber" />
      {demoLabel ?? 'demo data'}
    </span>
  )
}

/* ============================ checkpoints ============================ */

export interface AroCheckpoint { hash: string; label: string; at: string }

type RollbackListReply = { enabled?: boolean; checkpoints?: { hash?: string; message?: string; timestamp?: string }[] }

/** Checkpoints via the real `rollback.list` RPC; empty (and the page falls
 *  back to the seed strip) when the backend is offline or has none. */
export function useAroCheckpoints(sessionId: string | null, live: boolean): AroCheckpoint[] {
  const [checkpoints, setCheckpoints] = useState<AroCheckpoint[]>([])
  useEffect(() => {
    if (!live || !sessionId) {
      setCheckpoints([])

      return
    }

    let cancelled = false
    activeGateway()
      ?.request<RollbackListReply>('rollback.list', { session_id: sessionId })
      .then(reply => {
        if (cancelled) {return}
        setCheckpoints(
          (reply?.checkpoints ?? [])
            .filter((c): c is { hash: string; message?: string; timestamp?: string } => typeof c.hash === 'string' && c.hash.length > 0)
            .slice(0, 8)
            .map(c => ({
              hash: c.hash.slice(0, 7),
              label: c.message?.trim() || 'checkpoint',
              at: c.timestamp ? fmtClock(Date.parse(c.timestamp) / 1000) : '',
            })),
        )
      })
      .catch(() => undefined)

    return () => { cancelled = true }
  }, [live, sessionId])

  return live && checkpoints.length > 0 ? checkpoints : live ? [] : REVIEW_CHECKPOINTS
}

/* ============================ transcript ============================ */

export interface AroLiveApproval {
  request: ApprovalRequest
  step: Extract<Step, { type: 'approval' }>
}

export function useAroTranscript() {
  const messages = useStore($messages)
  const sessionId = useStore($activeSessionId)
  const busy = useStore($busy)
  const approvalsMap = useStore($approvalRequests)
  const states = useStore($sessionStates)
  const sessions = useStore($sessions)

  const state = sessionId ? states[sessionId] : undefined
  const live = messages.length > 0 || busy

  const steps = useMemo<Step[]>(() => (live ? messagesToSteps(messages) : TRANSCRIPT), [live, messages])

  const approvals = useMemo<AroLiveApproval[]>(() => {
    if (!live) {return []}

    return Object.values(approvalsMap)
      .filter((r): r is ApprovalRequest => Boolean(r) && (!sessionId || !r.sessionId || r.sessionId === sessionId))
      .map(r => ({
        request: r,
        step: {
          type: 'approval',
          command: r.command || '(command unavailable)',
          reason: r.description || 'The agent needs your approval before continuing.',
          risk: approvalRisk(r.command),
          state: 'open',
        },
      }))
  }, [live, approvalsMap, sessionId])

  const decide = useCallback(async (request: ApprovalRequest, choice: 'once' | 'always' | 'deny') => {
    await answerApproval(activeGateway(), request, choice, false)
  }, [])

  const title = useMemo(() => {
    const storedId = state?.storedSessionId

    if (!storedId) {return ''}

    return sessions.find(s => s.id === storedId)?.title?.trim() ?? ''
  }, [sessions, state?.storedSessionId])

  const checkpoints = useAroCheckpoints(live ? sessionId : null, live)

  return {
    steps,
    live,
    busy: live ? busy : false,
    approvals,
    decide,
    sessionId,
    model: live ? state?.model ?? '' : '',
    title,
    checkpoints,
    sessions,
    storedSessionId: state?.storedSessionId ?? null,
  }
}

/* ============================ review ============================ */

export interface AroReviewData {
  files: DiffFile[]
  live: boolean
  loading: boolean
  stagedSet: ReadonlySet<string>
  toggleStaged: (path: string) => void
  refresh: () => void
}

export function useAroReview(): AroReviewData {
  const liveFiles = useStore($reviewFiles)
  const tick = useStore($workspaceChangeTick)
  const [diffs, setDiffs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const seq = useRef(0)

  const live = liveFiles.length > 0

  // Keep the host's changed-file store fresh (it also refreshes on its own
  // workspace ticks; this primes it when our page is the open surface).
  useEffect(() => {
    void refreshReview()
  }, [tick])

  // Fetch the unified diff per changed file (uncommitted scope) — the same
  // git bridge the host review pane uses. Re-runs when the agent edits files.
  useEffect(() => {
    if (!live) {return}
    const mine = ++seq.current
    const git = desktopGit()
    const cwd = reviewRepoCwd()

    if (!git || !cwd) {
      setDiffs({})

      return
    }

    setLoading(true)
    void Promise.all(
      liveFiles.slice(0, 40).map(async (f): Promise<[string, string]> => {
        try {
          return [f.path, await git.review.diff(cwd, f.path, 'uncommitted', undefined, f.staged)]
        } catch {
          return [f.path, '']
        }
      }),
    ).then(entries => {
      if (mine !== seq.current) {return}
      setDiffs(Object.fromEntries(entries.filter(([, d]) => d && d.trim().length > 0)))
      setLoading(false)
    })
  }, [live, liveFiles])

  const files = useMemo<DiffFile[]>(() => {
    if (!live) {return []}

    return liveFiles.map(f => {
      const parsed = parseUnifiedDiff(diffs[f.path] ?? '', f.path)

      return parsed
        ? { ...parsed, path: f.path, adds: f.added || parsed.adds, dels: f.removed || parsed.dels }
        : { path: f.path, adds: f.added, dels: f.removed, lines: [] as DiffLine[] }
    })
  }, [live, liveFiles, diffs])

  const stagedSet = useMemo(() => new Set(live ? liveFiles.filter(f => f.staged).map(f => f.path) : []), [live, liveFiles])

  const toggleStaged = useCallback(
    (path: string) => {
      const staged = liveFiles.find(f => f.path === path)?.staged
      void (staged ? unstageReviewFile(path) : stageReviewFile(path))
    },
    [liveFiles],
  )

  const refresh = useCallback(() => {
    void refreshReview()
  }, [])

  return { files, live, loading, stagedSet, toggleStaged, refresh }
}

/* ============================ tasks ============================ */

export function useAroTasks() {
  const sessionId = useStore($activeSessionId)
  const todosMap = useStore($todosBySession)
  const retainedMap = useStore($retainedTodosBySession)

  const todos = useMemo(() => {
    if (!sessionId) {return []}

    return todosMap[sessionId] ?? retainedMap[sessionId] ?? []
  }, [sessionId, todosMap, retainedMap])

  const live = todos.length > 0

  const tasks = useMemo<Task[]>(() => (live ? todosToTasks(todos) : TASKS), [live, todos])

  return { tasks, live, hasSession: sessionId != null }
}

/* ============================ session picker ============================ */

const relativeTime = (unix: number | null | undefined): string => {
  if (!unix) {return ''}
  const ms = asMs(unix)
  const delta = Math.round((Date.now() - ms) / 1000)

  if (delta < 60) {return 'now'}

  if (delta < 3600) {return `${Math.floor(delta / 60)}m ago`}

  if (delta < 86400) {return `${Math.floor(delta / 3600)}h ago`}

  return `${Math.floor(delta / 86400)}d ago`
}

/** Compact R3 session picker: latest sessions from the store, switched
 *  through the host's own openSession flow (same path the sidebar rows use). */
export function SessionPicker({ sessions, activeStoredId }: { sessions: SessionInfo[]; activeStoredId: string | null }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const sorted = [...sessions]
      .filter(s => !s.archived)
      .sort((a, b) => (b.ended_at ?? b.started_at ?? 0) - (a.ended_at ?? a.started_at ?? 0))

    const needle = q.trim().toLowerCase()

    const filtered = needle
      ? sorted.filter(s => (s.title ?? '').toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle))
      : sorted

    return filtered.slice(0, 8)
  }, [sessions, q])

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Switch session"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-aro-line bg-aro-raise px-2.5 py-1 font-aro-mono text-[10px] text-aro-ink-2 transition-colors hover:border-aro-line-strong hover:text-aro-ink"
        onClick={() => setOpen(o => !o)}
      >
        <span className="size-[5px] rounded-full bg-aro-iris" />
        sessions
        <span className="text-aro-ink-4">({list.length})</span>
      </button>
      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-aro-rise absolute right-0 top-[calc(100%+6px)] z-40 w-[300px] overflow-hidden rounded-[10px] border border-aro-line-soft bg-aro-raise shadow-aro-e3">
            <div className="border-b border-aro-line-soft p-2">
              <input
                aria-label="Search sessions"
                autoFocus
                className="h-[26px] w-full rounded-[6px] border border-aro-line-soft bg-aro-well px-2 font-aro-mono text-[11px] text-aro-ink-2 outline-none placeholder:text-aro-ink-4 focus:border-aro-iris/50"
                onChange={e => setQ(e.target.value)}
                placeholder="Search sessions…"
                value={q}
              />
            </div>
            <div className="aro-scroll-thin max-h-[280px] overflow-y-auto p-1">
              {list.map(s => {
                const on = s.id === activeStoredId

                return (
                  <button
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-0.5 rounded-[7px] px-2 py-1.5 text-left transition-colors',
                      on ? 'bg-aro-iris-tint' : 'hover:bg-aro-hover/60',
                    )}
                    key={s.id}
                    onClick={() => {
                      setOpen(false)
                      openSessionFromPicker(s.id, () => undefined, 'in-place')
                    }}
                  >
                    <span className="truncate text-[11.5px] text-aro-ink">{s.title?.trim() || 'Untitled session'}</span>
                    <span className="flex items-center gap-2 font-aro-mono text-[9.5px] text-aro-ink-4">
                      <span className={cn('size-[5px] rounded-full', s.ended_at ? 'bg-aro-line-strong' : 'bg-aro-mint')} />
                      {relativeTime(s.ended_at ?? s.started_at)}
                      {s.model ? <span className="truncate">{s.model}</span> : null}
                    </span>
                  </button>
                )
              })}
              {list.length === 0 && (
                <div className="px-2 py-4 text-center text-[11px] text-aro-ink-4">no sessions match</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Shared empty-state slot for live pages before data lands. */
export function InlineHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[9px] border border-dashed border-aro-line bg-aro-well/60 px-3 py-2 text-[11.5px] text-aro-ink-4">
      {children}
    </div>
  )
}
