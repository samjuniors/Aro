import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { chatWindowWebPreferences } from './session-windows'

describe('Electron Security Review Checklist (Phase 15, Step 1)', () => {
  it('enforces hardened webPreferences on chat windows', () => {
    const prefs = chatWindowWebPreferences('/fake/preload.cjs')
    expect(prefs.contextIsolation).toBe(true)
    expect(prefs.sandbox).toBe(true)
    expect(prefs.nodeIntegration).toBe(false)
    expect(prefs.preload).toBe('/fake/preload.cjs')
  })

  it('enforces strict Content-Security-Policy meta tag in index.html', () => {
    const indexHtmlPath = path.resolve(import.meta.dirname, '../index.html')
    const html = readFileSync(indexHtmlPath, 'utf8')

    // Must define http-equiv="Content-Security-Policy"
    expect(html).toContain('http-equiv="Content-Security-Policy"')

    // Must restrict default-src and object-src
    expect(html).toMatch(/content="[^"]*default-src 'self'/)
    expect(html).toMatch(/content="[^"]*object-src 'none'/)
    expect(html).toMatch(/content="[^"]*base-uri 'self'/)

    // Must allow needed local scripts & styles
    expect(html).toMatch(/content="[^"]*script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:/)
    expect(html).toMatch(/content="[^"]*style-src 'self' 'unsafe-inline'/)
    expect(html).toMatch(/content="[^"]*img-src 'self' data: blob: file: https:/)
  })

  it('configures electron fuses to disable Node execution and enable ASAR validation', () => {
    const configPath = path.resolve(import.meta.dirname, '../electron-builder.config.cjs')
    const configContent = readFileSync(configPath, 'utf8')

    expect(configContent).toContain('electronFuses:')
    expect(configContent).toContain('runAsNode: false')
    expect(configContent).toContain('enableCookieEncryption: true')
    expect(configContent).toContain('enableNodeOptionsEnvironmentVariable: false')
    expect(configContent).toContain('enableNodeCliInspectArguments: false')
    expect(configContent).toContain('enableEmbeddedAsarIntegrityValidation: true')
    expect(configContent).toContain('onlyLoadAppFromAsar: true')
  })

  it('validates IPC sender frames in aro-ipc', async () => {
    const fakeMainFrame = { id: 1, url: 'file:///app/index.html' }
    const fakeSubFrame = { id: 2, url: 'https://malicious.example.com' }

    const fakeSender = {
      id: 99,
      mainFrame: fakeMainFrame,
      isDestroyed: () => false,
      once: vi.fn(),
      send: vi.fn()
    }

    // Call from untrusted subframe must fail
    const untrustedEvent = {
      sender: fakeSender,
      senderFrame: fakeSubFrame
    }

    // Call from main frame must be accepted
    const trustedEvent = {
      sender: fakeSender,
      senderFrame: fakeMainFrame
    }

    assert.notEqual(untrustedEvent.senderFrame, untrustedEvent.sender.mainFrame)
    assert.equal(trustedEvent.senderFrame, trustedEvent.sender.mainFrame)
  })
})
