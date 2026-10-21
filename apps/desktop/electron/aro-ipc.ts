// The aro bridge daemon's process owner: spawns the aro_bridge python daemon
// (JSONL stdio, protocol aro.jsonl/1), forwards every parsed event on a
// per-session channel, and answers the preload's aroBridge invokes. Mirrors
// git-ipc.ts (dependency-light, resolvers injected) and the embedded
// terminal's session/channel shape (terminal-ipc.ts). The renderer never
// talks to the daemon directly — it only sees these IPC surfaces.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { app, ipcMain } from 'electron'

import { resolveSourcePython } from './source-python'
import { hiddenWindowsChildOptions } from './windows-child-options'

/** Engine selection for the daemon's `--engine` flag. */
export type AroBridgeEngine = 'demo' | 'openai'

/** What `hermes:aro:bridge:start` accepts (all optional; engine defaults to demo). */
export interface AroBridgeStartOptions {
  engine?: AroBridgeEngine
  baseUrl?: string
  model?: string
  apiKey?: string
  sessionId?: string
  cwd?: string
}

/** A fully resolved daemon spawn spec (the source-python backend shape). */
export interface AroBridgeDaemonSpec {
  command: string
  args: string[]
  env: NodeJS.ProcessEnv
  cwd: string
}

/**
 * Resolves the daemon the way the backend ladder resolves a source checkout:
 * the checkout's OWN interpreter (`resolveSourcePython` — never a PATH python)
 * running `-m aro_bridge.daemon` from the repo root with the root on
 * PYTHONPATH. Null when no interpreter exists — `start` then rejects.
 */
export function resolveDefaultAroDaemon(opts: AroBridgeStartOptions = {}): AroBridgeDaemonSpec | null {
  const repoRoot = path.resolve(app.getAppPath(), '..', '..')

  if (!existsSync(path.join(repoRoot, 'aro_bridge', 'daemon.py'))) {
    return null
  }

  const python = resolveSourcePython(repoRoot, { override: process.env.HERMES_DESKTOP_PYTHON })

  if (!python) {
    return null
  }

  const engine: AroBridgeEngine = opts.engine === 'openai' ? 'openai' : 'demo'
  const args = ['-m', 'aro_bridge.daemon', '--engine', engine]

  if (opts.baseUrl) {
    args.push('--base-url', opts.baseUrl)
  }

  if (opts.model) {
    args.push('--model', opts.model)
  }

  if (opts.apiKey) {
    args.push('--api-key', opts.apiKey)
  }

  const daemonCwd = opts.cwd && existsSync(opts.cwd) ? opts.cwd : repoRoot

  return {
    command: python,
    args,
    // The daemon imports aro_bridge from the checkout, not the user's env.
    env: { ...process.env, PYTHONPATH: repoRoot },
    cwd: daemonCwd
  }
}

export interface AroBridgeDeps {
  /** Resolve the daemon spawn spec for the requested engine/options. */
  resolveAroDaemon: (opts?: AroBridgeStartOptions) => AroBridgeDaemonSpec | null
}

interface AroBridgeSession {
  id: string
  child: ChildProcess
  sessionId: string | null
  sender: Electron.WebContents
  onSenderDestroyed: (() => void) | null
  buffer: string
  resolveStart: ((sessionId: string) => void) | null
  rejectStart: ((error: Error) => void) | null
  startTimer: NodeJS.Timeout | null
}

const START_TIMEOUT_MS = 10_000

function aroEventChannel(sessionId: string): string {
  return `hermes:aro:bridge:${sessionId}:event`
}

function aroExitChannel(sessionId: string): string {
  return `hermes:aro:bridge:${sessionId}:exit`
}

export function registerAroIpc({ resolveAroDaemon }: AroBridgeDeps): void {
  // Internal id → session; a second index by the daemon's own session id once
  // its session_start arrives (all later invokes address the daemon by that);
  // and a third index by sender id for lifecycle idempotence.
  const sessions = new Map<string, AroBridgeSession>()
  const bySessionId = new Map<string, string>()
  const bySenderId = new Map<number, AroBridgeSession>()

  function findSession(sessionId: string): AroBridgeSession | null {
    const id = bySessionId.get(String(sessionId || ''))

    return id ? (sessions.get(id) ?? null) : null
  }

  function writeLine(session: AroBridgeSession, payload: Record<string, unknown>): boolean {
    const stdin = session.child.stdin

    if (!stdin || stdin.destroyed || !stdin.writable) {
      return false
    }

    stdin.write(`${JSON.stringify(payload)}\n`)

    return true
  }

  function teardown(session: AroBridgeSession): void {
    if (session.startTimer) {
      clearTimeout(session.startTimer)
      session.startTimer = null
    }

    sessions.delete(session.id)

    if (session.sessionId) {
      bySessionId.delete(session.sessionId)
    }

    if (session.sender) {
      const senderId = session.sender.id

      if (bySenderId.get(senderId) === session) {
        bySenderId.delete(senderId)
      }

      if (session.onSenderDestroyed) {
        try {
          session.sender.removeListener('destroyed', session.onSenderDestroyed)
        } catch {
          // Sender might already be destroyed
        }

        session.onSenderDestroyed = null
      }
    }

    try {
      session.child.kill()
    } catch {
      // Already gone — the exit handler runs the bookkeeping either way.
    }
  }

  function isTrustedSender(event: { sender?: { id?: number; mainFrame?: unknown }; senderFrame?: unknown }): boolean {
    if (event?.senderFrame && event?.sender?.mainFrame && event.senderFrame !== event.sender.mainFrame) {
      return false
    }

    return true
  }

  ipcMain.handle('hermes:aro:bridge:start', async (event, opts: AroBridgeStartOptions = {}) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender: calls are only permitted from the main frame')
    }

    // Deterministic start: if a session with this sessionId is already active and healthy, reuse it.
    if (opts.sessionId) {
      const existing = findSession(opts.sessionId)

      if (existing && !existing.child.killed && existing.sessionId) {
        return { sessionId: existing.sessionId }
      }
    }

    // Idempotence per sender: if this sender already has a running/starting daemon,
    // teardown the prior session so repeated start requests do not create duplicate daemon processes.
    const senderId = event.sender.id
    const existingForSender = bySenderId.get(senderId)

    if (existingForSender) {
      teardown(existingForSender)
    }

    const spec = resolveAroDaemon(opts || {})

    if (!spec) {
      throw new Error(
        'aro bridge daemon unavailable — no aro_bridge interpreter resolved. ' +
          'Run the desktop app from a checkout with a venv (or set HERMES_DESKTOP_PYTHON).'
      )
    }

    const id = `arb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

    const child = spawn(
      spec.command,
      spec.args,
      hiddenWindowsChildOptions({
        cwd: spec.cwd,
        env: spec.env,
        stdio: ['pipe', 'pipe', 'pipe']
      })
    )

    const session: AroBridgeSession = {
      id,
      child,
      sessionId: null,
      sender: event.sender,
      onSenderDestroyed: null,
      buffer: '',
      resolveStart: null,
      rejectStart: null,
      startTimer: null
    }

    sessions.set(id, session)
    bySenderId.set(senderId, session)

    const started = new Promise<string>((resolve, reject) => {
      session.resolveStart = resolve
      session.rejectStart = reject
      session.startTimer = setTimeout((): void => {
        reject(new Error(`aro bridge daemon did not announce a session within ${START_TIMEOUT_MS / 1000}s`))
        teardown(session)
      }, START_TIMEOUT_MS)
    })

    // The renderer that started the daemon owns its lifetime; clean up listener on teardown.
    const onSenderDestroyed = (): void => teardown(session)
    session.onSenderDestroyed = onSenderDestroyed
    event.sender.once('destroyed', onSenderDestroyed)

    child.on('error', (error: Error): void => {
      session.rejectStart?.(new Error(`aro bridge daemon failed to start: ${error.message}`))
      teardown(session)
    })

    child.on('exit', (code: number | null): void => {
      const sessionId = session.sessionId

      teardown(session)

      if (sessionId && !event.sender.isDestroyed()) {
        event.sender.send(aroExitChannel(sessionId), { code })
      } else if (!sessionId) {
        session.rejectStart?.(new Error(`aro bridge daemon exited before starting (code ${code ?? 'null'})`))
      }
    })

    // One JSON object per stdout line — buffer on \n like the terminal's PTY
    // surface, forward each parsed event on the per-session channel.
    child.stdout?.on('data', (chunk: Buffer): void => {
      session.buffer += chunk.toString('utf8')

      let newline = session.buffer.indexOf('\n')

      while (newline >= 0) {
        const line = session.buffer.slice(0, newline).trim()

        session.buffer = session.buffer.slice(newline + 1)
        newline = session.buffer.indexOf('\n')

        if (!line) {
          continue
        }

        let parsed: unknown

        try {
          parsed = JSON.parse(line)
        } catch {
          console.log(`[aro-bridge] non-JSON stdout line ignored: ${line.slice(0, 160)}`)

          continue
        }

        const ev = parsed as { type?: string; sessionId?: unknown }

        // The FIRST session_start latches the daemon's session id and resolves
        // the start invoke with it.
        if (ev?.type === 'session_start' && typeof ev.sessionId === 'string' && !session.sessionId) {
          session.sessionId = ev.sessionId
          bySessionId.set(ev.sessionId, session.id)

          if (session.startTimer) {
            clearTimeout(session.startTimer)
            session.startTimer = null
          }

          session.resolveStart?.(ev.sessionId)
        }

        if (session.sessionId && (!event.sender.isDestroyed || !event.sender.isDestroyed())) {
          event.sender.send(aroEventChannel(session.sessionId), ev)
        }
      }
    })

    // Daemon diagnostics (unknown input warnings, interrupt notices) → console.
    child.stderr?.on('data', (chunk: Buffer): void => {
      for (const text of chunk.toString('utf8').split('\n')) {
        const line = text.trim()

        if (line) {
          console.log(`[aro-bridge] ${line}`)
        }
      }
    })

    return { sessionId: await started }
  })

  ipcMain.handle('hermes:aro:bridge:send', (event, sessionId: string, text: string) => {
    if (!isTrustedSender(event)) {
      return false
    }

    const session = findSession(sessionId)

    return session ? writeLine(session, { type: 'user_message', text: String(text ?? '') }) : false
  })

  ipcMain.handle(
    'hermes:aro:bridge:toolResult',
    (event, sessionId: string, callId: string, ok: boolean, output: string) => {
      if (!isTrustedSender(event)) {
        return false
      }

      const session = findSession(sessionId)

      return session
        ? writeLine(session, {
            type: 'tool_result',
            callId: String(callId ?? ''),
            ok: Boolean(ok),
            output: String(output ?? '')
          })
        : false
    }
  )

  ipcMain.handle('hermes:aro:bridge:interrupt', (event, sessionId: string) => {
    if (!isTrustedSender(event)) {
      return false
    }

    const session = findSession(sessionId)

    return session ? writeLine(session, { type: 'interrupt' }) : false
  })

  ipcMain.handle('hermes:aro:bridge:stop', (event, sessionId: string) => {
    if (!isTrustedSender(event)) {
      return false
    }

    const session = findSession(sessionId)

    if (!session) {
      return false
    }

    teardown(session)

    return true
  })
}
