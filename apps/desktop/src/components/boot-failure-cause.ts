/**
 * Plain-language cause for a LOCAL backend boot failure. The main process
 * reports what it saw ("exited before it became ready (1)", "Timed out
 * connecting to Hermes backend after 45000ms", an EACCES, a Python traceback
 * tail…). None of that tells a non-developer what went wrong, so the overlay
 * leads with one classified sentence and keeps the raw text behind
 * "Show recent logs". Pure, table-driven, unit-tested without React.
 *
 * SSH and remote-reauth failures have their own classifiers
 * (`sshFailureMessage`, `isRemoteReauthFailure`) and are not handled here.
 */

export type LocalBootCause =
  | 'antivirusQuarantine'
  | 'corruptedState'
  | 'crashLoop'
  | 'diskFull'
  | 'exitedEarly'
  | 'installMissing'
  | 'permission'
  | 'portInUse'
  | 'timedOut'
  | 'windowsStoreAlias'

export interface CauseResolution {
  headline: string
  nextAction: string
}

export const DEFAULT_CAUSE_RESOLUTIONS: Record<LocalBootCause, CauseResolution> = {
  windowsStoreAlias: {
    headline: 'Windows App Execution Alias intercepted Python (exit code 9009).',
    nextAction: 'Install Python 3.11+ from python.org or disable the Windows Store execution alias in Windows Settings.'
  },
  antivirusQuarantine: {
    headline: 'Antivirus software quarantined or blocked an application component.',
    nextAction: 'Restore the quarantined file in your antivirus settings or add an exception for Aro, then click Retry.'
  },
  corruptedState: {
    headline: 'Application state or database file is corrupted.',
    nextAction: 'Repair the installation or remove the corrupted database file from your Aro data directory.'
  },
  crashLoop: {
    headline: 'Backend gateway is stuck in a crash loop.',
    nextAction: 'Inspect recent logs below, copy diagnostics, and try repairing the local environment.'
  },
  diskFull: {
    headline: 'No space left on device (disk is full).',
    nextAction: 'Free up disk space on your drive and restart the application.'
  },
  permission: {
    headline: 'Permission denied while accessing application files.',
    nextAction: 'Check file permissions for your user profile directory and run Aro as a standard user.'
  },
  portInUse: {
    headline: 'Network port is already in use by another application.',
    nextAction: 'Close other running instances or applications occupying the port, then click Retry.'
  },
  installMissing: {
    headline: 'Aro runtime files or environment are missing or damaged.',
    nextAction: 'Choose "Repair install" to recreate the runtime environment.'
  },
  timedOut: {
    headline: 'Local backend timed out connecting to the gateway.',
    nextAction: 'Check system load and click Retry to give the backend another opportunity to boot.'
  },
  exitedEarly: {
    headline: 'Local backend process exited unexpectedly during startup.',
    nextAction: 'View the recent logs below or copy diagnostics to investigate the error.'
  }
}

// Order matters: the more specific causes (disk, permission, port, missing
// install, windows store stub, antivirus, corruption, crash loops) are checked
// before the generic exit/timeout shapes that usually accompany them in the same output.
const CAUSE_PATTERNS: readonly [LocalBootCause, RegExp][] = [
  ['windowsStoreAlias', /9009|microsoft store|manage app execution aliases/i],
  ['antivirusQuarantine', /quarantine|threat detected|blocked by administrator|operation did not complete successfully because the file contains a virus/i],
  ['corruptedState', /database disk image is malformed|sqlite3\.DatabaseError|corrupt|database is locked|file is not a database/i],
  ['crashLoop', /crash loop|crashed repeatedly|restarting too quickly|exited repeatedly|restart count exceeded/i],
  ['diskFull', /no space left on device|database or disk is full|\bENOSPC\b|disk full/i],
  ['permission', /permission denied|\bEACCES\b|\bEPERM\b|read-only file system|\bEROFS\b|operation not permitted/i],
  ['portInUse', /address already in use|\bEADDRINUSE\b|port .* (?:is )?(?:already )?in use/i],
  [
    'installMissing',
    /installation is missing|is missing or incomplete|missing or damaged|venv missing|no module named|modulenotfounderror/i
  ],
  ['timedOut', /timed out|timeout/i],
  ['exitedEarly', /exited before|exited \(|process exited|exited with|traceback \(most recent call last\)/i]
]

export function classifyLocalBootFailure(error: string | null | undefined): LocalBootCause | null {
  const text = String(error || '')

  if (!text) {
    return null
  }

  return CAUSE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}

export interface LocalBootFailureCopy {
  /** The one classified sentence shown in the red box. */
  headline: string
  /** Concrete next action for the user to resolve this failure. */
  nextAction?: string | null
  /** Raw error text worth keeping for the collapsed details — null when the
   *  raw text is short enough that the headline already carries it. */
  rawDetail: string | null
}

/** Copy for the overlay's red box: a classified cause when one is known,
 *  otherwise the raw error's FIRST line (never a traceback dump). */
export function localBootFailureCopy(
  error: string | null | undefined,
  causes: Partial<Record<LocalBootCause, string>>
): LocalBootFailureCopy {
  const raw = String(error || '').trim()
  const cause = classifyLocalBootFailure(raw)

  if (cause) {
    const resolution = DEFAULT_CAUSE_RESOLUTIONS[cause]
    const headline = causes[cause] ?? resolution.headline
    const nextAction = resolution.nextAction
    return { headline, nextAction, rawDetail: raw || null }
  }

  const firstLine = raw.split('\n')[0]?.trim() ?? ''

  return { headline: firstLine, nextAction: null, rawDetail: firstLine === raw ? null : raw }
}
