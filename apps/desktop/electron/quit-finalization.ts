const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Bound for a quit that `before-quit` ADMITTED and deferred for teardown, as
 * opposed to the final phase.
 *
 * It must comfortably exceed the teardown's own budgets (backend shutdown waits
 * 7s before reaping, SSH teardown is bounded separately) so a slow-but-healthy
 * shutdown is never cut short into an orphaned backend. It exists only for the
 * process that wedges with no window: an unreleased single-instance lock makes
 * every later launch exit with "another instance holds the lock", and nothing
 * else recovers it.
 */
const DEFAULT_ADMITTED_TIMEOUT_MS = 30_000

type TimerHandle = unknown

type Schedule = (callback: () => void, timeoutMs: number) => TimerHandle

type Cancel = (handle: TimerHandle) => void

export interface QuitFinalizationOptions {
  isWindows: boolean
  hardExit: (code: number) => void
  timeoutMs?: number
  admittedTimeoutMs?: number
  schedule?: Schedule
  cancel?: Cancel
}

export interface QuitFinalization {
  /** Arm the final-phase bound; called once the quit is admitted. */
  arm: () => void
  /**
   * Arm the admitted-quit bound. Called the moment `before-quit` defers a quit
   * for teardown, which is the only place a wedged process can still be
   * rescued -- `will-quit` may never arrive.
   */
  armAdmitted: () => void
  /** A completed quit disarms every bound and they never re-arm. */
  cancel: () => void
}

/**
 * Provides a bounded escape hatch for a Windows Electron process that has
 * entered its final quit phase but never emits the completed quit event.
 *
 * The fallback is armed when the quit is admitted, so it covers both the
 * deferred teardown and the final phase. A successful `quit` event cancels it.
 */
export function createQuitFinalization({
  isWindows,
  hardExit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  admittedTimeoutMs = DEFAULT_ADMITTED_TIMEOUT_MS,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
}: QuitFinalizationOptions): QuitFinalization {
  let timer: TimerHandle | null = null
  let finished = false

  const cancelFallback = () => {
    if (timer === null) {
      return
    }

    cancel(timer)
    timer = null
  }

  // Whichever bound fires first owns the exit: the admitted-quit deadline is the
  // outer bound, and the shorter final-phase one still applies if it is reached
  // first, so a stall in either window is bounded.
  const armBound = (deadlineMs: number) => {
    if (!isWindows || finished || timer !== null) {
      return
    }

    timer = schedule(() => {
      timer = null

      if (finished) {
        return
      }

      finished = true
      hardExit(0)
    }, deadlineMs)
  }

  return {
    arm() {
      armBound(timeoutMs)
    },
    armAdmitted() {
      armBound(admittedTimeoutMs)
    },
    cancel() {
      if (finished) {
        return
      }

      finished = true
      cancelFallback()
    }
  }
}
