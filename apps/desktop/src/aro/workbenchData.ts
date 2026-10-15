/**
 * ARO WORKBENCH PATTERN DATA — seed shapes for the ported prototype pages.
 *
 * These are the SAME seed shapes the Aro Workbench prototype uses (see
 * `prototype/src/workbench/data/`), trimmed to what the three desktop
 * pattern pages need: transcript (tool timeline + approvals + diffs),
 * hunk-level review, and the tasks work-graph board.
 *
 * R2 (done — see `live.tsx`) folds the real gateway stores into these
 * shapes: $messages → Step[], the git review bridge → DiffFile[], and
 * $todosBySession → Task[]. The arrays below are the DEMO fallback shown
 * when no live session/workspace/todo data exists (behind a DEMO badge);
 * the types stay the wire contract between live data and the pages.
 */

/* ============================== types ============================== */

export type DiffLine = { t: 'hunk' | 'ctx' | 'add' | 'del'; text: string; o?: number; n?: number }
export type DiffFile = { path: string; adds: number; dels: number; lang?: string; lines: DiffLine[] }

export type ToolName = 'read' | 'edit' | 'write' | 'bash' | 'grep' | 'mcp' | 'browser' | 'test' | 'plan'

export type Step =
  | { type: 'user'; text: string; at: string; attachments?: string[] }
  | { type: 'text'; text: string; agentId: string }
  | { type: 'thinking'; text: string; ms: number }
  | { type: 'tool'; tool: ToolName; target?: string; status: 'running' | 'done' | 'error'; ms?: number; lines?: string[]; output?: string[]; diff?: DiffFile }
  | { type: 'approval'; command: string; reason: string; risk: 'low' | 'medium' | 'high'; state: 'open' | 'allowed' | 'denied' }
  | { type: 'checkpoint'; hash: string; label: string }

export type TaskStatus = 'backlog' | 'ready' | 'running' | 'review' | 'done'
export type Task = {
  id: string
  key: string
  title: string
  status: TaskStatus
  priority: 'p0' | 'p1' | 'p2' | 'p3'
  source: 'linear' | 'github' | 'manual' | 'agent'
  assignee?: string
  human?: boolean
  estimate: string
  deps?: string[]
  criteria: string[]
  tags: string[]
  cost?: string
}

export type Hunk = { header: string; lines: DiffLine[]; adds: number; dels: number }

/** Split a unified diff file into reviewable hunks (P3 core). */
export function splitHunks(file: DiffFile): Hunk[] {
  const hunks: Hunk[] = []

  for (const ln of file.lines) {
    let cur = hunks[hunks.length - 1]

    if (ln.t === 'hunk' || !cur) {
      cur = { header: ln.t === 'hunk' ? ln.text : '@@', lines: [], adds: 0, dels: 0 }
      hunks.push(cur)
    }

    cur.lines.push(ln)

    if (ln.t === 'add') {cur.adds++}
    else if (ln.t === 'del') {cur.dels++}
  }

  return hunks
}

/* ============================== agents ============================== */

export const AGENTS: Record<string, { name: string; glyph: string; from: string; to: string }> = {
  aro: { name: 'Aro Agent', glyph: 'AR', from: '#6ee7b7', to: '#10b981' },
  'claude-code': { name: 'Claude Code', glyph: 'CL', from: '#d97757', to: '#c3553b' },
  codex: { name: 'Codex', glyph: 'CX', from: '#10a37f', to: '#0d8a6a' },
  cursor: { name: 'Cursor', glyph: 'CU', from: '#f1f5f9', to: '#94a3b8' },
  'glm-code': { name: 'GLM Code', glyph: 'GL', from: '#7c6bff', to: '#4a3ec2' },
}
export const agentById = (id: string) => AGENTS[id] ?? AGENTS.aro

/* ============================ review diff ============================ */

export const REVIEW_FILES: DiffFile[] = []
export const REVIEW_HUNKS: Record<string, Hunk[]> = {}
export const REVIEW_TOTAL_HUNKS = 0
export const REVIEW_CHECKPOINTS: { hash: string; label: string; at: string }[] = []

/* ============================ transcript ============================ */

export const TRANSCRIPT: Step[] = []

/* ============================== tasks ============================== */

export const TASKS: Task[] = []

