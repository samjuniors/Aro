/**
 * ARO WORKBENCH PATTERN DATA — seed shapes for the ported prototype pages.
 *
 * These are the SAME seed shapes the Aro Workbench prototype uses (see
 * `prototype/src/workbench/data/`), trimmed to what the three desktop
 * pattern pages need: transcript (tool timeline + approvals + diffs),
 * hunk-level review, and the tasks work-graph board.
 *
 * R3 replaces every array here with live data from the agent —
 * tui_gateway JSON-RPC for transcript/review state, SessionDB + cron
 * stores for tasks. Types stay: they are the wire contract.
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
    if (ln.t === 'add') cur.adds++
    else if (ln.t === 'del') cur.dels++
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
/* The ide-bridge change set — same story the transcript below tells, so
   /aro-transcript (how the diff was made) and /aro-review (how it is
   judged) are two views of one piece of work. */

export const REVIEW_FILES: DiffFile[] = [
  {
    path: 'packages/bridge/src/server.ts', adds: 20, dels: 6, lang: 'ts', lines: [
      { t: 'hunk', text: '@@ -4,9 +4,19 @@ export async function startBridge', o: 4, n: 4 }, { t: 'ctx', text: '  const store = new SessionStore(opts.root)', o: 5, n: 5 }, { t: 'del', text: '  const server = createServer({ port: opts.port })', o: 6 },
      { t: 'add', text: '  const channel = new SessionChannel(store, {', n: 6 }, { t: 'add', text: '    flushEveryMs: 12,', n: 7 }, { t: 'add', text: "    resume: 'cursor',", n: 8 }, { t: 'add', text: '  })', n: 9 },
      { t: 'ctx', text: "  server.on('connection', (socket) => {", o: 8, n: 12 }, { t: 'del', text: '    socket.send(store.snapshot())', o: 9 }, { t: 'add', text: '    const client = attachEditor(socket, channel, {', n: 13 }, { t: 'add', text: '      capabilities: socket.requested ?? [],', n: 14 }, { t: 'add', text: '      onEdit: (patch) => reviewer.enqueue(patch),', n: 15 }, { t: 'add', text: '    })', n: 16 }, { t: 'ctx', text: '  })', o: 10, n: 18 },
      { t: 'hunk', text: '@@ -38,7 +48,10 @@ export async function stopBridge', o: 38, n: 48 }, { t: 'ctx', text: "  server.on('close', () => {", o: 39, n: 49 }, { t: 'del', text: '    store.dispose()', o: 40 },
      { t: 'add', text: '    void channel.drain().then(() => {', n: 50 }, { t: 'add', text: '      store.dispose()', n: 51 }, { t: 'add', text: "      for (const s of sockets) s.close(1000, 'server-stop')", n: 52 }, { t: 'add', text: '    })', n: 53 }, { t: 'ctx', text: '  })', o: 42, n: 55 },
      { t: 'hunk', text: '@@ -60,4 +73,9 @@ export function describeBridge', o: 60, n: 73 }, { t: 'ctx', text: 'export function describeBridge(b: Bridge) {', o: 61, n: 74 }, { t: 'del', text: '  return `bridge:${b.port}`', o: 62 },
      { t: 'add', text: "  const caps = b.editors.map((e) => e.caps.join('+')).sort()", n: 75 }, { t: 'add', text: '  return `bridge:${b.port} editors=${caps.length}`', n: 76 }, { t: 'add', text: "    + ` caps=${caps.join(',')}`", n: 77 }, { t: 'add', text: '    + ` queue=${b.reviewer.size()}`', n: 78 }, { t: 'ctx', text: '}', o: 63, n: 80 },
    ],
  },
  {
    path: 'packages/editor-kit/src/attach.ts', adds: 47, dels: 9, lang: 'ts', lines: [
      { t: 'hunk', text: '@@ -12,6 +12,47 @@ export function attachEditor', o: 12, n: 12 }, { t: 'add', text: "export type EditorCaps = 'diff' | 'terminal' | 'worktree' | 'rules'", n: 12 }, { t: 'add', text: 'const BACKOFF = [0, 250, 500, 1_000, 2_500, 5_000]', n: 14 },
      { t: 'ctx', text: 'export function attachEditor(socket, channel, opts) {', o: 13, n: 16 }, { t: 'del', text: "  socket.on('message', (m) => channel.push(m))", o: 14 }, { t: 'add', text: '  const caps = negotiate(socket, opts.capabilities)', n: 17 }, { t: 'add', text: '  let cursor = channel.head', n: 18 }, { t: 'add', text: "  socket.on('ack', (n) => { cursor = n })", n: 19 }, { t: 'add', text: "  socket.on('edit', (patch) => reviewer.enqueue({ ...patch, origin: 'editor' }))", n: 24 }, { t: 'ctx', text: '  return { dispose }', o: 18, n: 30 },
      { t: 'hunk', text: '@@ -41,6 +76,13 @@ function dispose', o: 41, n: 76 }, { t: 'ctx', text: '  function dispose() {', o: 42, n: 77 }, { t: 'del', text: '    socket.close()', o: 43 },
      { t: 'add', text: '    clearTimeout(retryTimer)', n: 78 }, { t: 'add', text: '    for (const t of backoffTimers) clearTimeout(t)', n: 79 }, { t: 'add', text: "    socket.close(1000, 'client-dispose')", n: 80 }, { t: 'add', text: '    channel.release(cursor)', n: 81 }, { t: 'ctx', text: '  }', o: 45, n: 83 },
    ],
  },
  {
    path: 'packages/review/src/reviewer.ts', adds: 9, dels: 3, lang: 'ts', lines: [
      { t: 'hunk', text: '@@ -30,4 +30,12 @@ class DiffReviewer', o: 30, n: 30 }, { t: 'del', text: '  enqueue(patch: AgentPatch) {', o: 31 }, { t: 'add', text: '  enqueue(patch: Patch) {   // agent- or editor-originated', n: 31 }, { t: 'add', text: "    const entry = normalise(patch, patch.origin ?? 'agent')", n: 32 }, { t: 'add', text: "    if (entry.origin === 'editor') this.markHuman(entry)", n: 33 },
      { t: 'ctx', text: '    this.queue.push(entry)', o: 33, n: 34 }, { t: 'add', text: '    checkpoints.snapshot([entry.path])', n: 36 },
    ],
  },
]

export const REVIEW_HUNKS: Record<string, Hunk[]> = Object.fromEntries(REVIEW_FILES.map((f) => [f.path, splitHunks(f)]))
export const REVIEW_TOTAL_HUNKS = REVIEW_FILES.reduce((n, f) => n + REVIEW_HUNKS[f.path].length, 0)

export const REVIEW_CHECKPOINTS: { hash: string; label: string; at: string }[] = [
  { hash: 'a91f3c2', label: 'before bridge rewrite', at: '09:47' },
  { hash: '77bd0e4', label: 'channel + flush added', at: '09:44' },
  { hash: '1c3a9f8', label: 'session start', at: '09:41' },
]

/* ============================ transcript ============================ */

export const TRANSCRIPT: Step[] = [
  { type: 'user', text: 'Editors poll for state instead of subscribing. Make the bridge stream session frames to attached editors, and make sure human edits go through the same review queue as agent edits.', at: '09:41' },
  { type: 'thinking', text: 'Three surfaces already exist: CLI, daemon, web. The gap is that editors poll for state instead of subscribing. I should introduce a broadcast channel per session, version the frames, and let the editor be a dumb renderer so the agent stays the source of truth. Need to be careful: Cursor and VS Code have very different extension APIs, so the contract must be transport-only.', ms: 4200 },
  { type: 'checkpoint', hash: '1c3a9f8', label: 'session start' },
  { type: 'tool', tool: 'plan', status: 'done', ms: 310, lines: ['1. Add SessionChannel (broadcast + resumable cursor)', '2. Rework server.ts attach path to negotiate capabilities', '3. Route editor-originated patches into DiffReviewer', '4. Tests: reconnect, backpressure, provenance'] },
  { type: 'tool', tool: 'grep', target: 'session-store OR SessionStore packages/bridge', status: 'done', ms: 90, output: ['packages/bridge/src/server.ts:5:  const store = new SessionStore(opts.root)', 'packages/editor-kit/src/attach.ts:13: export function attachEditor(socket, channel, opts)', 'packages/review/src/reviewer.ts:30: class DiffReviewer'] },
  { type: 'tool', tool: 'read', target: 'packages/bridge/src/server.ts', status: 'done', ms: 40, lines: ['  const store = new SessionStore(opts.root)', '  const server = createServer({ port: opts.port })', "  server.on('connection', (socket) => {", '    socket.send(store.snapshot())', '  })'] },
  { type: 'tool', tool: 'edit', target: 'packages/bridge/src/server.ts', status: 'done', ms: 610, diff: REVIEW_FILES[0] },
  { type: 'tool', tool: 'edit', target: 'packages/editor-kit/src/attach.ts', status: 'done', ms: 540, diff: REVIEW_FILES[1] },
  { type: 'tool', tool: 'edit', target: 'packages/review/src/reviewer.ts', status: 'done', ms: 280, diff: REVIEW_FILES[2] },
  { type: 'approval', command: 'bun test packages/bridge packages/editor-kit packages/review --coverage', reason: 'Runs the bridge test matrix — spawns sockets, binds :4733, writes coverage to .aro/coverage. Rule: ask before binding ports outside the sandbox.', risk: 'medium', state: 'open' },
  { type: 'tool', tool: 'test', target: 'bun test packages/bridge packages/editor-kit packages/review', status: 'done', ms: 2840, output: [' ✓ session-channel.test.ts (14 tests) 284ms', ' ✓ attach.test.ts (9 tests) 96ms', ' ✓ reviewer.test.ts (11 tests) 141ms', ' ✓ reconnect.test.ts (6 tests) 210ms', '', ' 40 pass', '  0 fail', '  3ms teardown'] },
  { type: 'checkpoint', hash: '77bd0e4', label: 'channel + flush added' },
  { type: 'text', text: 'Bridge streams now. **SessionChannel** broadcasts versioned frames with a resumable cursor, so an editor that reconnects resumes at its ack instead of re-pulling a snapshot.\n\nEditor-originated patches enter the same DiffReviewer queue as agent patches — provenance is preserved, checkpoints snapshot both, and review behaves identically regardless of who made the edit.\n\n- 40 tests green, coverage 91% on the new paths\n- contract is transport-only: no editor SDK leaked into the bridge\n- reconnection uses a 6-step backoff ladder (0 → 5s)', agentId: 'aro' },
]

/* ============================== tasks ============================== */

export const TASKS: Task[] = [
  { id: 'k1', key: 'PLAT-482', title: 'Editor-originated edits must carry provenance through the review queue', status: 'running', priority: 'p0', source: 'linear', assignee: 'claude-code', estimate: '2h', criteria: ['Patch envelope has origin field', 'Review UI shows editor badge', 'Checkpoint on human edits too'], tags: ['bridge', 'review'], cost: '$3.41' },
  { id: 'k2', key: 'PLAT-479', title: 'Ledger idempotency keys (payments refactor, part 1)', status: 'running', priority: 'p1', source: 'linear', assignee: 'codex', estimate: '4h', criteria: ['All ledger writes idempotent', '48 unit tests green'], tags: ['payments'], cost: '$1.84' },
  { id: 'k3', key: 'GH-1203', title: 'Reconnect test flakes on CI (ws close ordering)', status: 'ready', priority: 'p1', source: 'github', assignee: 'aro', estimate: '1h', deps: ['k1'], criteria: ['0 flakes in 50 runs'], tags: ['ci', 'bridge'] },
  { id: 'k4', key: 'PLAT-490', title: 'Windsurf + Zed adapter extensions', status: 'backlog', priority: 'p2', source: 'linear', estimate: '6h', deps: ['k1'], criteria: ['Attach works in both', 'Capability matrix updated'], tags: ['editors'] },
  { id: 'k5', key: 'AGT-12', title: 'Decompose: document wire protocol v1', status: 'backlog', priority: 'p2', source: 'agent', estimate: '45m', criteria: ['docs/protocol.md', 'Reviewed by 1 human'], tags: ['docs'] },
  { id: 'k6', key: 'GH-1198', title: 'Best-of-4 query planner — pick variant and land', status: 'review', priority: 'p1', source: 'github', assignee: 'codex', estimate: '30m', criteria: ['p99 ≥ +10%', 'No regressions in perf suite'], tags: ['perf'], cost: '$6.40' },
  { id: 'k7', key: 'PLAT-471', title: 'Dead code sweep across packages/*', status: 'done', priority: 'p3', source: 'linear', assignee: 'aro', estimate: '1h', criteria: ['Bundle −4%'], tags: ['chore'], cost: '$0.37' },
  { id: 'k8', key: 'ME-3', title: 'Review PR #482 and sign off release notes', status: 'ready', priority: 'p0', source: 'manual', human: true, estimate: '20m', criteria: ['Approve or request changes'], tags: ['human'] },
  { id: 'k9', key: 'AGT-13', title: 'Nightly: triage new Sentry issues and open tasks', status: 'done', priority: 'p3', source: 'agent', assignee: 'glm-code', estimate: '—', criteria: ['All P0 issues have a task'], tags: ['automation'], cost: '$0.08' },
]
