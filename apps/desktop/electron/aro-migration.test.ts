import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MIGRATION_MARKER_FILE, migrateHermesToAro } from './aro-migration'

describe('aro-migration (ADR 0006 / P11.6)', () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aro-mig-test-'))
  })

  afterEach(() => {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
    vi.restoreAllMocks()
  })

  it('migrates configuration, credentials, and state cleanly to target', () => {
    const src = path.join(tempRoot, '.hermes')
    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'model: test-model\n', 'utf8')
    fs.writeFileSync(path.join(src, '.env'), 'API_KEY=secret-token\n', 'utf8')
    fs.writeFileSync(path.join(src, 'hermes.db'), 'mock-sqlite-bytes', 'utf8')

    const sessDir = path.join(src, 'sessions')
    fs.mkdirSync(sessDir, { recursive: true })
    fs.writeFileSync(path.join(sessDir, 'session-1.json'), '{"id": 1}', 'utf8')

    const tgt = path.join(tempRoot, '.aro')

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })

    expect(result.status).toBe('success')
    expect(result.copied).toContain('config.yaml')
    expect(result.copied).toContain('.env')
    expect(result.copied).toContain('hermes.db')
    expect(result.copied).toContain('sessions')

    // Verify target contents
    expect(fs.readFileSync(path.join(tgt, 'config.yaml'), 'utf8')).toBe('model: test-model\n')
    expect(fs.readFileSync(path.join(tgt, '.env'), 'utf8')).toBe('API_KEY=secret-token\n')
    expect(fs.readFileSync(path.join(tgt, 'hermes.db'), 'utf8')).toBe('mock-sqlite-bytes')
    expect(fs.readFileSync(path.join(tgt, 'sessions', 'session-1.json'), 'utf8')).toBe('{"id": 1}')
    expect(fs.existsSync(path.join(tgt, MIGRATION_MARKER_FILE))).toBe(true)
  })

  it('is strictly non-destructive and leaves source files intact', () => {
    const src = path.join(tempRoot, '.hermes')
    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'important: user-config\n', 'utf8')
    fs.writeFileSync(path.join(src, '.env'), 'KEY=keep-alive\n', 'utf8')

    const tgt = path.join(tempRoot, '.aro')

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(result.status).toBe('success')

    // Source MUST still exist with identical content
    expect(fs.existsSync(src)).toBe(true)
    expect(fs.readFileSync(path.join(src, 'config.yaml'), 'utf8')).toBe('important: user-config\n')
    expect(fs.readFileSync(path.join(src, '.env'), 'utf8')).toBe('KEY=keep-alive\n')
  })

  it('is idempotent and preserves existing data in .aro on subsequent runs', () => {
    const src = path.join(tempRoot, '.hermes')
    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'model: old\n', 'utf8')

    const tgt = path.join(tempRoot, '.aro')

    const res1 = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(res1.status).toBe('success')

    // User updates config in .aro
    fs.writeFileSync(path.join(tgt, 'config.yaml'), 'model: updated-in-aro\n', 'utf8')

    // Second run
    const res2 = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(res2.status).toBe('already_migrated')
    expect(res2.copied).toEqual([])

    // Content in .aro remains the user's updated config
    expect(fs.readFileSync(path.join(tgt, 'config.yaml'), 'utf8')).toBe('model: updated-in-aro\n')
  })

  it('handles missing source directory cleanly without errors', () => {
    const src = path.join(tempRoot, 'non-existent-hermes')
    const tgt = path.join(tempRoot, '.aro')

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(result.status).toBe('no_source')
    expect(fs.existsSync(tgt)).toBe(false)
  })

  it('handles paths with spaces safely', () => {
    const spaceDir = path.join(tempRoot, 'User Path With Spaces')
    const src = path.join(spaceDir, '.hermes')
    const tgt = path.join(spaceDir, '.aro')

    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'spaces: valid\n', 'utf8')

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(result.status).toBe('success')
    expect(fs.readFileSync(path.join(tgt, 'config.yaml'), 'utf8')).toBe('spaces: valid\n')
  })

  it('handles paths with non-ASCII and international Unicode characters safely', () => {
    const unicodeDir = path.join(tempRoot, 'José_Müller_测试_Аро')
    const src = path.join(unicodeDir, '.hermes_данные')
    const tgt = path.join(unicodeDir, '.aro_данные')

    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'unicode: valid\n', 'utf8')

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(result.status).toBe('success')
    expect(fs.readFileSync(path.join(tgt, 'config.yaml'), 'utf8')).toBe('unicode: valid\n')
  })

  it('handles read-only target paths gracefully with permission_denied', () => {
    const src = path.join(tempRoot, '.hermes')
    fs.mkdirSync(src, { recursive: true })
    fs.writeFileSync(path.join(src, 'config.yaml'), 'test: 1\n', 'utf8')

    const tgt = path.join(tempRoot, 'read_only_target', '.aro')

    // Mock mkdirSync throwing EACCES / EPERM
    const originalMkdirSync = fs.mkdirSync
    vi.spyOn(fs, 'mkdirSync').mockImplementation((targetPath, options) => {
      if (String(targetPath).includes('read_only_target')) {
        const error = new Error('EACCES: permission denied')
        ;(error as any).code = 'EACCES'
        throw error
      }
      return originalMkdirSync(targetPath, options)
    })

    const result = migrateHermesToAro({ sourceDir: src, targetDir: tgt })
    expect(result.status).toBe('permission_denied')
    expect(result.error).toContain('permission denied')
  })
})
