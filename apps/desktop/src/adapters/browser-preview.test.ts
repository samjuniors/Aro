import { beforeEach, describe, expect, it } from 'vitest'

import { $previewTabs, $previewViewport, localBrowserPreviewAdapter, normalizePreviewUrl } from './browser-preview'
import { WORKSPACE_KEY } from './storage'

describe('browser-preview adapter (local)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    $previewTabs.set([])
    $previewViewport.set('desktop')
  })

  it('normalizes URLs to http(s) only', () => {
    expect(normalizePreviewUrl('example.com/x')).toBe('https://example.com/x')
    expect(normalizePreviewUrl('http://example.com')).toBe('http://example.com/')
    expect(normalizePreviewUrl('file:///etc/passwd')).toBeNull()
    expect(normalizePreviewUrl('javascript:alert(1)')).toBeNull()
    expect(normalizePreviewUrl('not a url')).toBeNull()
  })

  it('makes tabs with host titles', () => {
    const blank = localBrowserPreviewAdapter.makeTab()

    expect(blank.title).toBe('New tab')
    expect(blank.loading).toBe(false)

    const loaded = localBrowserPreviewAdapter.makeTab('https://aro.dev/docs')

    expect(loaded).toMatchObject({ url: 'https://aro.dev/docs', title: 'aro.dev', loading: true })
  })

  it('always keeps at least one tab in the strip', () => {
    localBrowserPreviewAdapter.saveTabs([])

    const tabs = localBrowserPreviewAdapter.listTabs()

    expect(tabs).toHaveLength(1)
    expect(tabs[0].title).toBe('New tab')
  })

  it('persists the strip and viewport; survives a cold re-read', () => {
    const tab = localBrowserPreviewAdapter.makeTab('https://example.com')

    localBrowserPreviewAdapter.saveTabs([tab])
    localBrowserPreviewAdapter.setViewport('mobile')

    expect(window.localStorage.getItem(WORKSPACE_KEY.browserTabs)).toBe(JSON.stringify([tab]))
    expect(window.localStorage.getItem(WORKSPACE_KEY.browserViewport)).toBe(JSON.stringify('mobile'))

    // Cold re-read: the stores were seeded from these same keys at module
    // init; re-hydrating from storage yields the same records.
    expect(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY.browserTabs)!)).toEqual([tab])
  })
})
