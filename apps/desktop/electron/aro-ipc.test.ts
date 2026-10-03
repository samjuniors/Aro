// aro-ipc.ts — the aro bridge daemon ownership surface, with the python
// child faked: registerAroIpc's handlers are exercised against a fake child
// emitting the aro.jsonl/1 JSONL lines, the way source-backend.test.ts fakes
// its backends. Electron (ipcMain/app) and the interpreter resolver are
// mocked; the real repo checkout supplies resolveDefaultAroDaemon's root.
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import path from 'node:path'

import { beforeEach, test, vi } from 'vitest'

import { spawn } from 'node:child_process'

const electronMock = vi.hoisted((): {
  handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
  app: { getAppPath: () => string }
  setAppPath: (value: string) => void
  ipcMain: { handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void }
} => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
  let appPath = '/nonexistent/apps/desktop'

  return {
    handlers,
    app: { getAppPath: (): string => appPath },
    setAppPath: (value: string): void => {
      appPath = value
    },
    ipcMain: {
      handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown): void => {
        handlers.set(channel, handler)
      }
    }
  }
})

vi.mock('electron', (): unknown => electronMock)

vi.mock('./source-python', (): unknown => ({
  resolveSourcePython: vi.fn((): string => '/fake/venv/bin/python')
}))

vi.mock('node:child_process', (): unknown => ({ spawn: vi.fn() }))

import { registerAroIpc, resolveDefaultAroDaemon } from './aro-ipc'

// Dev APP_ROOT is apps/desktop, so SOURCE_REPO_ROOT-style root resolution sees
// the real checkout (aro_bridge/daemon.py exists there).
electronMock.setAppPath(path.resolve(import.meta.dirname, '..'))

class FakeChild extends EventEmitter {
  readonly stdout = new EventEmitter()
  readonly stderr = new EventEmitter()
  readonly stdin = { writes: [] as string[], write: vi.fn(), writable: true, destroyed: false }
  readonly kill = vi.fn()
  pid = 4242

  constructor() {
    super()

    this.stdin.write.mockImplementation((line: string): boolean => {
      this.stdin.writes.push(line)

      return true
    })
  }
}

const spawned: FakeChild[] = []

beforeEach((): void => {
  spawned.length = 0
  electronMock.handlers.clear()
  vi.mocked(spawn).mockReset()
  vi.mocked(spawn).mockImplementation(
    (() => {
      const child = new FakeChild()

      spawned.push(child)

      return child
    }) as unknown as typeof spawn
  )
})

const SPEC = { command: '/fake/venv/bin/python', args: ['-m', 'aro_bridge.daemon', '--engine', 'demo'], env: {}, cwd: '/repo' }

interface FakeSender {
  send: ReturnType<typeof vi.fn>
  once: ReturnType<typeof vi.fn>
}

function makeSender(): FakeSender {
  return { send: vi.fn(), once: vi.fn() }
}

function handler(channel: string): (event: unknown, ...args: unknown[]) => unknown {
  const registered = electronMock.handlers.get(channel)

  assert.ok(registered, `handler ${channel} registered`)

  return registered
}

function emitLine(child: FakeChild, event: Record<string, unknown>): void {
  child.stdout.emit('data', Buffer.from(`${JSON.stringify(event)}\n`))
}

async function startSession(
  start: (event: unknown, ...args: unknown[]) => unknown,
  sender: FakeSender = makeSender()
): Promise<{ child: FakeChild; sessionId: string; sender: FakeSender }> {
  const pending = Promise.resolve(start({ sender }, { engine: 'demo' }))
  const child = spawned[spawned.length - 1]

  assert.ok(child, 'daemon child spawned')

  emitLine(child, { type: 'session_start', sessionId: 'as_test1', model: 'aro-4-70b', tools: ['web_search', 'page_reader'] })

  const { sessionId } = (await pending) as { sessionId: string }

  return { child, sessionId, sender }
}

test('start resolves with the sessionId from the first session_start and forwards events', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => SPEC })

  const sender = makeSender()
  const pending = Promise.resolve(handler('hermes:aro:bridge:start')({ sender }, { engine: 'demo' }))
  const child = spawned[0]

  assert.ok(child)

  emitLine(child, { type: 'session_start', sessionId: 'as_fwd', model: 'aro-4-70b', tools: ['web_search', 'page_reader'] })
  emitLine(child, { type: 'thinking', label: 'Considering the request', ms: 4 })
  emitLine(child, { type: 'assistant_delta', text: 'hello ' })

  const { sessionId } = (await pending) as { sessionId: string }

  assert.equal(sessionId, 'as_fwd')

  const forwarded = sender.send.mock.calls
    .filter((call: unknown[]): boolean => call[0] === 'hermes:aro:bridge:as_fwd:event')
    .map((call: unknown[]): unknown => call[1])

  assert.equal(forwarded.length, 3, 'every parsed event is forwarded, session_start included')
  assert.deepEqual(forwarded[0], { type: 'session_start', sessionId: 'as_fwd', model: 'aro-4-70b', tools: ['web_search', 'page_reader'] })
  assert.deepEqual(forwarded[1], { type: 'thinking', label: 'Considering the request', ms: 4 })
  assert.deepEqual(forwarded[2], { type: 'assistant_delta', text: 'hello ' })
})

test('send / toolResult / interrupt write the protocol JSONL lines to stdin', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => SPEC })

  const { child, sessionId } = await startSession(handler('hermes:aro:bridge:start'))

  assert.equal(handler('hermes:aro:bridge:send')(undefined, sessionId, 'hello bridge'), true)
  assert.equal(handler('hermes:aro:bridge:toolResult')(undefined, sessionId, 'tc_1', true, '1. aro.dev — hit'), true)
  assert.equal(handler('hermes:aro:bridge:interrupt')(undefined, sessionId), true)

  assert.deepEqual(child.stdin.writes, [
    '{"type":"user_message","text":"hello bridge"}\n',
    '{"type":"tool_result","callId":"tc_1","ok":true,"output":"1. aro.dev — hit"}\n',
    '{"type":"interrupt"}\n'
  ])

  // Unknown sessions refuse instead of throwing.
  assert.equal(handler('hermes:aro:bridge:send')(undefined, 'as_missing', 'x'), false)
})

test('child exit forwards the exit event and cleans the session up', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => SPEC })

  const { child, sessionId, sender } = await startSession(handler('hermes:aro:bridge:start'))

  child.emit('exit', 0)

  assert.deepEqual(sender.send.mock.calls.at(-1), ['hermes:aro:bridge:as_test1:exit', { code: 0 }])
  assert.equal(handler('hermes:aro:bridge:send')(undefined, sessionId, 'late'), false)
})

test('stop kills the child; a destroyed sender kills it too', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => SPEC })

  const start = handler('hermes:aro:bridge:start')

  // First session: explicit stop.
  {
    const { child, sessionId } = await startSession(start)

    assert.equal(handler('hermes:aro:bridge:stop')(undefined, sessionId), true)
    assert.equal(child.kill.mock.calls.length, 1)
    assert.equal(handler('hermes:aro:bridge:stop')(undefined, sessionId), false, 'stopped sessions are gone')
  }

  // Second session: the owning renderer's webContents goes away.
  {
    const sender = makeSender()
    const destroyedCallbacks: (() => void)[] = []

    sender.once.mockImplementation((_channel: string, callback: () => void): void => {
      destroyedCallbacks.push(callback)
    })

    const { child } = await startSession(start, sender)

    assert.equal(destroyedCallbacks.length, 1, 'the sender once()-wires its own teardown')
    destroyedCallbacks[0]!()
    assert.equal(child.kill.mock.calls.length, 1)
  }
})

test('start rejects when no daemon can be resolved', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => null })

  await assert.rejects(
    handler('hermes:aro:bridge:start')({ sender: makeSender() }, { engine: 'demo' }) as Promise<unknown>,
    /unavailable/
  )
})

test('start rejects when the daemon dies before announcing a session', async (): Promise<void> => {
  registerAroIpc({ resolveAroDaemon: () => SPEC })

  const pending = Promise.resolve(handler('hermes:aro:bridge:start')({ sender: makeSender() }, { engine: 'demo' }))

  spawned[0]?.emit('exit', 2)

  await assert.rejects(pending, /exited before starting/)
})

test('resolveDefaultAroDaemon builds the checkout spec (venv python, repo root)', (): void => {
  const spec = resolveDefaultAroDaemon({
    engine: 'openai',
    baseUrl: 'http://localhost:8642/v1',
    model: 'aro-4-70b',
    apiKey: 'k'
  })

  assert.ok(spec)
  assert.equal(spec.command, '/fake/venv/bin/python')
  assert.deepEqual(spec.args, [
    '-m',
    'aro_bridge.daemon',
    '--engine',
    'openai',
    '--base-url',
    'http://localhost:8642/v1',
    '--model',
    'aro-4-70b',
    '--api-key',
    'k'
  ])

  const repoRoot = path.resolve(import.meta.dirname, '..', '..')

  assert.equal(spec.cwd, repoRoot)
  assert.equal(spec.env.PYTHONPATH, repoRoot)

  // The demo engine is the default when nothing is requested.
  assert.deepEqual(resolveDefaultAroDaemon()?.args, ['-m', 'aro_bridge.daemon', '--engine', 'demo'])
})
