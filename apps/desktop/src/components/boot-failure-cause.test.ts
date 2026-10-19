import { describe, expect, it } from 'vitest'

import {
  classifyLocalBootFailure,
  DEFAULT_CAUSE_RESOLUTIONS,
  localBootFailureCopy
} from './boot-failure-cause'

const CAUSES = {
  antivirusQuarantine: 'antivirus quarantine copy',
  corruptedState: 'corrupted state copy',
  crashLoop: 'crash loop copy',
  diskFull: 'disk full copy',
  exitedEarly: 'exited early copy',
  installMissing: 'install missing copy',
  permission: 'permission copy',
  portInUse: 'port copy',
  timedOut: 'timed out copy',
  windowsStoreAlias: 'windows store copy'
}

describe('local boot failure classification (Step 7)', () => {
  it('classifies all Step 7 failure paths and core causes correctly', () => {
    // 1. Runtime missing
    expect(classifyLocalBootFailure('Hermes installation is missing or incomplete in ~/.aro/venv')).toBe('installMissing')
    expect(classifyLocalBootFailure('ModuleNotFoundError: No module named hermes_cli')).toBe('installMissing')

    // 2. Port in use
    expect(classifyLocalBootFailure('listen EADDRINUSE: address already in use 127.0.0.1:9191')).toBe('portInUse')
    expect(classifyLocalBootFailure('Error: port 9191 is already in use')).toBe('portInUse')

    // 3. Gateway crash loop
    expect(classifyLocalBootFailure('Gateway crash loop detected: restarting too quickly')).toBe('crashLoop')
    expect(classifyLocalBootFailure('Backend exited repeatedly (restart count exceeded)')).toBe('crashLoop')

    // 4. Antivirus quarantine
    expect(classifyLocalBootFailure('Operation did not complete successfully because the file contains a virus or potentially unwanted software')).toBe('antivirusQuarantine')
    expect(classifyLocalBootFailure('Threat detected: Aro.exe quarantined by Windows Defender')).toBe('antivirusQuarantine')

    // 5. Disk full
    expect(classifyLocalBootFailure('OSError: [Errno 28] No space left on device')).toBe('diskFull')
    expect(classifyLocalBootFailure('sqlite3.OperationalError: database or disk is full')).toBe('diskFull')

    // 6. Corrupted state file
    expect(classifyLocalBootFailure('sqlite3.DatabaseError: file is not a database')).toBe('corruptedState')
    expect(classifyLocalBootFailure('sqlite3.DatabaseError: database disk image is malformed')).toBe('corruptedState')

    // Other core causes
    expect(classifyLocalBootFailure("EACCES: permission denied, open '/home/x/.hermes/state.db'")).toBe('permission')
    expect(classifyLocalBootFailure('Timed out connecting to Hermes backend after 45000ms')).toBe('timedOut')
    expect(
      classifyLocalBootFailure('Hermes backend exited with code 9009 (Python was not found; run without arguments to install from the Microsoft Store)')
    ).toBe('windowsStoreAlias')
    expect(
      classifyLocalBootFailure('Hermes backend exited before it became ready (1).\nRecent backend output:\nTraceback (most recent call last):\n  File "x.py"')
    ).toBe('exitedEarly')
    expect(classifyLocalBootFailure(null)).toBeNull()
  })

  it('provides a human message and an actionable next step for every classified failure', () => {
    const failures = [
      'installation is missing',
      'address already in use',
      'crash loop detected',
      'file quarantined',
      'No space left on device',
      'database disk image is malformed'
    ]

    for (const raw of failures) {
      const copy = localBootFailureCopy(raw, {})
      expect(copy.headline).toBeTruthy()
      expect(copy.nextAction).toBeTruthy()
      expect(typeof copy.nextAction).toBe('string')
    }
  })

  it('keeps raw output out of the headline and preserves it in details', () => {
    const raw =
      'Hermes backend exited before it became ready (1).\nRecent backend output:\nTraceback (most recent call last):'

    const copy = localBootFailureCopy(raw, CAUSES)

    expect(copy.headline).toBe(CAUSES.exitedEarly)
    expect(copy.headline).not.toMatch(/\(1\)|Traceback|ms\b/)
    expect(copy.nextAction).toBe(DEFAULT_CAUSE_RESOLUTIONS.exitedEarly.nextAction)
    expect(copy.rawDetail).toBe(raw)
  })

  it('falls back to the first raw line for an unknown failure, never a dump', () => {
    const copy = localBootFailureCopy('Something odd happened\nline 2\nline 3', CAUSES)

    expect(copy.headline).toBe('Something odd happened')
    expect(copy.nextAction).toBeNull()
    expect(copy.rawDetail).toContain('line 3')
  })
})
