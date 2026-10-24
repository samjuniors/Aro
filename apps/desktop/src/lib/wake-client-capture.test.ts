// Regression test for #119089: macOS Desktop remote-gateway client capture
// went permanently deaf (platform capture error kills the continuous PCM
// chain) while the ear still showed "listening" and no error ever surfaced.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type ClientWakeCaptureHandle, startClientWakeCapture } from './wake-client-capture'

class FakeTrack {
  readyState = 'live'
  stop = vi.fn()
  onended: (() => void) | null = null
  onmute: (() => void) | null = null
}

class FakeStream {
  constructor(public tracks: FakeTrack[]) {}

  getAudioTracks(): FakeTrack[] {
    return this.tracks
  }

  getTracks(): FakeTrack[] {
    return this.tracks
  }
}

class FakeProcessor {
  onaudioprocess: ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void) | null = null
  connect = vi.fn()
  disconnect = vi.fn()
  constructor(public bufferSize: number) {}

  emit(input: Float32Array): void {
    this.onaudioprocess?.({ inputBuffer: { getChannelData: () => input } })
  }
}

class FakeSource {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeGain {
  gain = { value: 1 }
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeWorkletPort {
  onmessage: ((event: { data: Float32Array }) => void) | null = null
}

const workletInstances: FakeAudioWorkletNode[] = []

class FakeAudioWorkletNode {
  port = new FakeWorkletPort()
  connect = vi.fn()
  disconnect = vi.fn()

  constructor(public context: unknown, public name: string) {
    workletInstances.push(this)
  }

  emit(input: Float32Array): void {
    this.port.onmessage?.({ data: input })
  }
}

const instances: FakeAudioContext[] = []

class FakeAudioContext {
  sampleRate = 48_000
  state = 'running'
  destination = {}
  processors: FakeProcessor[] = []
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)

  constructor() {
    instances.push(this)
  }

  createMediaStreamSource(_stream: unknown): FakeSource {
    return new FakeSource()
  }

  createScriptProcessor(bufferSize: number): FakeProcessor {
    const processor = new FakeProcessor(bufferSize)
    this.processors.push(processor)

    return processor
  }

  createGain(): FakeGain {
    return new FakeGain()
  }
}

const TONE = 0.2 // comfortably above any silence floor
const toneFrame = () => new Float32Array(4096).fill(TONE)
const silentFrame = () => new Float32Array(4096) // digital zeros, like a dead capture chain

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('startClientWakeCapture (issue #119089)', () => {
  let tracks: FakeTrack[]
  let getUserMedia: ReturnType<typeof vi.fn>
  let handles: ClientWakeCaptureHandle[]

  const processor = () => instances[instances.length - 1].processors[0]

  const start = (overrides: Record<string, unknown> = {}) =>
    startClientWakeCapture({
      frameLength: 1280,
      request: async () => ({ fed: true }),
      ...overrides
    })

  beforeEach(() => {
    instances.length = 0
    workletInstances.length = 0
    handles = []
    tracks = [new FakeTrack()]
    getUserMedia = vi.fn().mockResolvedValue(new FakeStream(tracks))
    vi.stubGlobal('AudioContext', FakeAudioContext)
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true
    })
  })

  afterEach(() => {
    for (const handle of handles) {
      handle.stop()
    }

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('streams resampled 16 kHz PCM frames to wake.feed', async () => {
    const request = vi.fn(async () => ({ fed: true }))
    const handle = await start({ request })
    handles.push(handle)

    processor().emit(toneFrame())
    await flush()

    expect(request).toHaveBeenCalled()
    const [method, params] = request.mock.calls[0] as unknown as [string, { pcm: string; sample_rate: number }]
    expect(method).toBe('wake.feed')
    expect(params.sample_rate).toBe(16_000)
    // 48 kHz -> 16 kHz: 4096 input samples become 1365, so one 80 ms frame ships.
    expect(Buffer.from(params.pcm, 'base64')).toHaveLength(1280 * 2)
    expect(handle.active).toBe(true)
  })

  it('reports sustained digital silence instead of staying deaf forever', async () => {
    const onError = vi.fn()
    const handle = await start({ onError, silenceFramesThreshold: 10 })
    handles.push(handle)

    for (let i = 0; i < 10; i++) {
      processor().emit(silentFrame())
    }

    expect(onError).toHaveBeenCalledTimes(1)
    expect(String(onError.mock.calls[0]?.[0])).toMatch(/silence/i)
    expect(handle.active).toBe(false)
  })

  it('keeps listening through real audio with a quiet floor', async () => {
    const onError = vi.fn()
    const request = vi.fn(async () => ({ fed: true }))
    const handle = await start({ onError, request })
    handles.push(handle)

    for (let i = 0; i < 30; i++) {
      processor().emit(toneFrame())
    }

    await flush()
    expect(onError).not.toHaveBeenCalled()
    expect(handle.active).toBe(true)
    expect(request).toHaveBeenCalled()
  })

  it('reports a dead microphone track instead of feeding zeros', async () => {
    const onError = vi.fn()
    const handle = await start({ onError })
    handles.push(handle)

    tracks[0].onended?.()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(String(onError.mock.calls[0]?.[0])).toMatch(/track ended/i)
    expect(handle.active).toBe(false)
  })

  it('throws when getUserMedia yields no live audio track', async () => {
    getUserMedia.mockResolvedValue(new FakeStream([]))

    await expect(start()).rejects.toThrow(/microphone track/i)
  })

  it('reports a stalled audio graph with no callbacks', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    const handle = await start({ onError, stallTimeoutMs: 1000 })
    handles.push(handle)

    await vi.advanceTimersByTimeAsync(1500)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(String(onError.mock.calls[0]?.[0])).toMatch(/stall/i)
    expect(handle.active).toBe(false)
  })

  it('escalates consecutive refused wake.feed frames', async () => {
    const onError = vi.fn()
    const request = vi.fn(async () => ({ fed: false, reason: 'not_owner' }))
    const handle = await start({ onError, request, maxConsecutiveFeedFailures: 3 })
    handles.push(handle)

    for (let i = 0; i < 6; i++) {
      processor().emit(toneFrame())
    }

    await flush()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(String(onError.mock.calls[0]?.[0])).toMatch(/wake\.feed refused/i)
    expect(handle.active).toBe(false)
  })

  it('tolerates an isolated wake.feed failure without killing the ear', async () => {
    const onError = vi.fn()
    let calls = 0

    const request = vi.fn(async () => {
      calls += 1

      if (calls === 1) {
        throw new Error('transient network blip')
      }

      return { fed: true }
    })

    const handle = await start({ onError, request, maxConsecutiveFeedFailures: 3 })
    handles.push(handle)

    for (let i = 0; i < 6; i++) {
      processor().emit(toneFrame())
    }

    await flush()
    expect(onError).not.toHaveBeenCalled()
    expect(handle.active).toBe(true)
  })

  it('modernizes audio capture using AudioWorkletNode when available', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)

    class WorkletAudioContext extends FakeAudioContext {
      audioWorklet = {
        addModule
      }
    }

    vi.stubGlobal('AudioContext', WorkletAudioContext)
    vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode)
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-worklet')
    URL.revokeObjectURL = vi.fn()

    try {
      const request = vi.fn(async () => ({ fed: true }))
      const handle = await start({ request })
      handles.push(handle)

      expect(addModule).toHaveBeenCalledWith('blob:mock-worklet')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-worklet')
      expect(workletInstances).toHaveLength(1)
      const workletNode = workletInstances[0]
      expect(workletNode.name).toBe('pcm-capture-processor')
      // Ensure ScriptProcessor was NOT instantiated
      expect(instances[0].processors).toHaveLength(0)

      workletNode.emit(toneFrame())
      await flush()

      expect(request).toHaveBeenCalled()
      const [method, params] = request.mock.calls[0] as unknown as [string, { pcm: string; sample_rate: number }]
      expect(method).toBe('wake.feed')
      expect(params.sample_rate).toBe(16_000)

      handle.stop()
      expect(workletNode.disconnect).toHaveBeenCalled()
      expect(workletNode.port.onmessage).toBeNull()
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })

  it('falls back to ScriptProcessorNode if AudioWorklet addModule fails', async () => {
    class FailingWorkletAudioContext extends FakeAudioContext {
      audioWorklet = {
        addModule: vi.fn().mockRejectedValue(new Error('Module load error'))
      }
    }

    vi.stubGlobal('AudioContext', FailingWorkletAudioContext)
    vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode)
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-failing')
    URL.revokeObjectURL = vi.fn()

    try {
      const request = vi.fn(async () => ({ fed: true }))
      const handle = await start({ request })
      handles.push(handle)

      // Fallback instantiated ScriptProcessorNode
      expect(processor()).toBeDefined()
      processor().emit(toneFrame())
      await flush()

      expect(request).toHaveBeenCalled()
      expect(handle.active).toBe(true)
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })
})
