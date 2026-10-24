import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $preferredIde, EDITOR_CATALOG, localEditorsAdapter } from './editors'

describe('editors adapter (local)', () => {
  const preferredKey = 'hermes.desktop.external-ide.preferred'
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)

  beforeEach(() => {
    window.localStorage.clear()
    $preferredIde.set('cursor')
  })

  afterEach(() => openSpy.mockClear())

  it('lists the four supported editors with unknown installation state', () => {
    const ids = localEditorsAdapter.list().map(e => e.id)

    expect(ids).toEqual(['cursor', 'vscode', 'windsurf', 'zed'])

    for (const editor of EDITOR_CATALOG) {
      expect(editor.installed).toBeNull()
    }
  })

  it('defaults the preferred editor to cursor and round-trips a choice', () => {
    expect(localEditorsAdapter.preferred()).toBe('cursor')

    localEditorsAdapter.setPreferred('zed')

    expect(localEditorsAdapter.preferred()).toBe('zed')
    expect(window.localStorage.getItem(preferredKey)).toBe('zed')
  })

  it('opens a folder via the editor URL scheme and persists the choice', () => {
    expect(localEditorsAdapter.open('')).toBe(false)

    expect(localEditorsAdapter.open('/home/z/Some Project', 'windsurf')).toBe(true)
    // The adopted fork behavior: encodeURI keeps slashes, escapes spaces.
    expect(openSpy).toHaveBeenCalledWith('windsurf://file//home/z/Some%20Project', '_self')
    expect(window.localStorage.getItem(preferredKey)).toBe('windsurf')
  })

  it('prefers window.hermesDesktop.openExternal when available', () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('hermesDesktop', { openExternal })

    expect(localEditorsAdapter.open('/home/z/Some Project', 'cursor')).toBe(true)
    expect(openExternal).toHaveBeenCalledWith('cursor://file//home/z/Some%20Project')
    expect(openSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
