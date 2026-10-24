/**
 * aro-migration.ts — Desktop implementation of non-destructive data directory migration.
 *
 * Implements ADR 0006 (Decision D-6):
 * - Copy-migrates config.yaml, .env, and state from source Hermes directory to target Aro directory.
 * - Idempotent (governed by .aro_migrated marker).
 * - Strictly non-destructive (source is never moved or deleted).
 * - Safe against read-only paths, spaces, and non-ASCII paths.
 */

import fs from 'node:fs'
import path from 'node:path'

export interface AroMigrationResult {
  status: 'success' | 'already_migrated' | 'no_source' | 'permission_denied' | 'error'
  source: string
  target: string
  copied: string[]
  error?: string
}

export const MIGRATION_MARKER_FILE = '.aro_migrated'

const MIGRATION_FILES = ['config.yaml', '.env', 'active_profile', 'hermes.db', 'state.db']
const MIGRATION_DIRS = ['sessions', 'memories', 'skills', 'cron', 'profiles']

export function migrateHermesToAro(options: {
  sourceDir: string
  targetDir: string
}): AroMigrationResult {
  const { sourceDir, targetDir } = options
  const result: AroMigrationResult = {
    status: 'success',
    source: sourceDir,
    target: targetDir,
    copied: []
  }

  const markerPath = path.join(targetDir, MIGRATION_MARKER_FILE)
  if (fs.existsSync(markerPath)) {
    result.status = 'already_migrated'
    return result
  }

  if (!fs.existsSync(sourceDir)) {
    result.status = 'no_source'
    return result
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true })
  } catch (err: unknown) {
    result.status = 'permission_denied'
    result.error = err instanceof Error ? err.message : String(err)
    return result
  }

  const copied: string[] = []

  // Copy files
  for (const file of MIGRATION_FILES) {
    const srcFile = path.join(sourceDir, file)
    const tgtFile = path.join(targetDir, file)
    if (fs.existsSync(srcFile) && !fs.existsSync(tgtFile)) {
      try {
        fs.copyFileSync(srcFile, tgtFile)
        copied.push(file)
      } catch {
        // Non-fatal per-file copy error
      }
    }
  }

  // Copy directories
  for (const dir of MIGRATION_DIRS) {
    const srcSubdir = path.join(sourceDir, dir)
    const tgtSubdir = path.join(targetDir, dir)
    if (fs.existsSync(srcSubdir)) {
      try {
        fs.cpSync(srcSubdir, tgtSubdir, { recursive: true, errorOnExist: false })
        copied.push(dir)
      } catch {
        // Non-fatal per-directory copy error
      }
    }
  }

  result.copied = copied

  // Write marker
  try {
    fs.writeFileSync(
      markerPath,
      JSON.stringify(
        {
          source: sourceDir,
          timestamp: new Date().toISOString(),
          migratedItems: copied
        },
        null,
        2
      ),
      'utf8'
    )
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err)
  }

  return result
}
