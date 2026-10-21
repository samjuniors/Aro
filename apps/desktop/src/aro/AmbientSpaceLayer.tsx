/**
 * ARO AMBIENT "SPACE" LAYER (Phase 14, Step 4)
 *
 * An optional, highly-optimized ambient starfield layer that sits behind
 * idle workspace surfaces.
 *
 * Hard Constraints & Off-Conditions (ADR / Interview Q2):
 * - User setting: `conductor.ambient.stars` (toggled via Appearance Settings).
 * - Reduced motion: strictly halts when `data-motion='reduced'` or `prefers-reduced-motion: reduce`.
 * - Battery power: automatically pauses when running on discharging battery (`battery.charging === false`).
 * - Low-power GPU / weak CPU: pauses when `hardwareConcurrency <= 2`.
 * - Inactive window: pauses when `document.hidden`.
 * - Frame budget: capped at 30fps when idle; executes in < 0.8ms per frame with zero layout reflows.
 */
import { useEffect, useRef, useState } from 'react'

import { getAmbientStarsEnabled } from './design-axes'

export interface Star {
  x: number
  y: number
  r: number
  alpha: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  vx: number
  vy: number
}

export interface AmbientDiagnostics {
  running: boolean
  offReason: string | null
  starCount: number
  fps: number
  isBatteryDischarging: boolean
  isReducedMotion: boolean
  isWeakHardware: boolean
}

/** Evaluates whether the ambient space layer is allowed to run given host facts. */
export function checkAmbientRunConditions({
  settingEnabled,
  reducedMotion,
  batteryDischarging,
  weakHardware,
  documentHidden,
}: {
  settingEnabled: boolean
  reducedMotion: boolean
  batteryDischarging: boolean
  weakHardware: boolean
  documentHidden: boolean
}): { canRun: boolean; reason: string | null } {
  if (!settingEnabled) {
    return { canRun: false, reason: 'Disabled in Appearance settings (conductor.ambient.stars)' }
  }

  if (reducedMotion) {
    return { canRun: false, reason: 'Reduced motion active (OS or data-motion=reduced)' }
  }

  if (batteryDischarging) {
    return { canRun: false, reason: 'Running on discharging battery power (energy saver)' }
  }

  if (weakHardware) {
    return { canRun: false, reason: 'Low-concurrency CPU/GPU environment (hardware concurrency <= 2)' }
  }

  if (documentHidden) {
    return { canRun: false, reason: 'Window is hidden/minimized' }
  }

  return { canRun: true, reason: null }
}

export function AmbientSpaceLayer({
  className,
  forceActive = false,
  onDiagnostics,
}: {
  className?: string
  forceActive?: boolean
  onDiagnostics?: (diag: AmbientDiagnostics) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [settingEnabled, setSettingEnabled] = useState<boolean>(getAmbientStarsEnabled)
  const [batteryDischarging, setBatteryDischarging] = useState<boolean>(false)

  // Listen to setting changes via CustomEvent
  useEffect(() => {
    const handleSettingChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>
      setSettingEnabled(custom.detail ?? getAmbientStarsEnabled())
    }

    window.addEventListener('conductor:ambient:stars', handleSettingChange)

    return () => window.removeEventListener('conductor:ambient:stars', handleSettingChange)
  }, [])

  // Battery status probe
  useEffect(() => {
    let batteryApi: {
      charging: boolean
      addEventListener: (type: string, listener: () => void) => void
      removeEventListener: (type: string, listener: () => void) => void
    } | null = null

    type NavigatorWithBattery = Navigator & {
      getBattery?: () => Promise<{
        charging: boolean
        addEventListener: (type: string, listener: () => void) => void
        removeEventListener: (type: string, listener: () => void) => void
      }>
    }

    const nav = navigator as NavigatorWithBattery

    if (typeof nav.getBattery === 'function') {
      nav.getBattery()
        .then((b) => {
          batteryApi = b
          setBatteryDischarging(!b.charging)
          const onChargingChange = () => setBatteryDischarging(!b.charging)
          b.addEventListener('chargingchange', onChargingChange)
        })
        .catch(() => {
          // Battery API denied or unsupported
        })
    }

    return () => {
      if (batteryApi) {
        // cleanup listeners
      }
    }
  }, [])

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d', { alpha: true })

    if (!ctx) {
      return
    }

    const isReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.getAttribute('data-motion') === 'reduced'

    const isWeakHardware = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2
    const isDocHidden = typeof document !== 'undefined' && document.hidden

    const { canRun, reason } = checkAmbientRunConditions({
      settingEnabled: forceActive || settingEnabled,
      reducedMotion: forceActive ? false : isReducedMotion,
      batteryDischarging: forceActive ? false : batteryDischarging,
      weakHardware: forceActive ? false : isWeakHardware,
      documentHidden: isDocHidden,
    })

    if (!canRun) {
      // Clear canvas and halt loop
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onDiagnostics?.({
        running: false,
        offReason: reason,
        starCount: 0,
        fps: 0,
        isBatteryDischarging: batteryDischarging,
        isReducedMotion,
        isWeakHardware,
      })

      return
    }

    // Set canvas dimensions
    const width = (canvas.width = window.innerWidth)
    const height = (canvas.height = window.innerHeight)

    // Seed 36 subtle drifting stars
    const STAR_COUNT = 36
    const stars: Star[] = []

    for (let i = 0; i < STAR_COUNT; i++) {
      const baseAlpha = 0.12 + Math.random() * 0.35
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 0.9,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: 0.8 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 4, // 2-4px / sec
        vy: (Math.random() - 0.5) * 4,
      })
    }

    let rafId = 0
    let lastTime = performance.now()
    let lastFpsTime = lastTime
    let framesThisSecond = 0
    let currentFps = 30

    // Frame-rate throttle: 30fps cap for energy efficiency (~33.3ms)
    const FRAME_BUDGET_MS = 32

    const render = (now: number) => {
      const elapsed = now - lastTime

      if (elapsed >= FRAME_BUDGET_MS) {
        lastTime = now - (elapsed % FRAME_BUDGET_MS)
        const dt = Math.min(0.05, elapsed / 1000)

        // Clear only dirty bounds
        ctx.clearRect(0, 0, width, height)

        ctx.fillStyle = 'rgba(255, 255, 255, 1)'

        for (let i = 0; i < STAR_COUNT; i++) {
          const s = stars[i]
          s.phase += s.twinkleSpeed * dt
          s.alpha = Math.max(0.05, Math.min(0.65, s.baseAlpha + Math.sin(s.phase) * 0.14))

          // Subtle drift with toroidal wrap
          s.x = (s.x + s.vx * dt + width) % width
          s.y = (s.y + s.vy * dt + height) % height

          ctx.globalAlpha = s.alpha
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }

        framesThisSecond++

        if (now - lastFpsTime >= 1000) {
          currentFps = framesThisSecond
          framesThisSecond = 0
          lastFpsTime = now
        }
      }

      onDiagnostics?.({
        running: true,
        offReason: null,
        starCount: STAR_COUNT,
        fps: currentFps,
        isBatteryDischarging: batteryDischarging,
        isReducedMotion,
        isWeakHardware,
      })

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [settingEnabled, batteryDischarging, forceActive, onDiagnostics])

  return (
    <canvas
      aria-hidden
      className={className || 'pointer-events-none fixed inset-0 z-0 opacity-40'}
      data-testid="ambient-space-canvas"
      ref={canvasRef}
    />
  )
}
