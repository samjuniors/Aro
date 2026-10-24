/**
 * BROWSER PREVIEW ADAPTER (local) — the prototype's in-app preview tabs.
 *
 * Contract refs:
 * - Feature id: `browser-preview` (port/FEATURE_MAP.md — local).
 * - Glossary row: BrowserView (iframe tabs) — deliberately NOT merged with
 *   the Hermes right-rail browser + `preview.*` (D-0017: the Hermes browser
 *   is a richer, agent-adjacent surface; this is the prototype's tabbed
 *   viewport preview — kept separate).
 * - Backend-todo shape: tabs/viewports over future `preview.*`
 *   (port/FEATURE_MAP.md `browser-preview` row).
 *
 * Interface = prototype names (`BrowserTab`, `ViewportId` — prototype
 * `views2.tsx` `BrowserView`). The prototype kept tabs in React state; the
 * skill's local-adapter rules require restart survival, so the tab strip
 * persists at `conductor.workspace.v3.browser.tabs`.
 */

import { atom } from 'nanostores'

import { readLocalRecord, WORKSPACE_KEY, writeLocalRecord } from './storage'

/** Prototype viewport ids (prototype `views2.tsx`). */
export type ViewportId = 'desktop' | 'tablet' | 'mobile'

/** Prototype tab shape (prototype `views2.tsx` `BrowserTab`). */
export interface BrowserTab {
  id: string
  /** The URL bar's current text (may be un-navigated). */
  input: string
  /** The committed URL ('' until the user opens a valid one). */
  url: string
  title: string
  loading: boolean
}

export interface BrowserPreviewAdapter {
  /** The persisted tab strip (at least one tab). */
  listTabs(): BrowserTab[]
  /** The persisted viewport. */
  viewport(): ViewportId
  /** Replace the tab strip (normalize: never empty — a fresh tab is kept). */
  saveTabs(tabs: BrowserTab[]): void
  setViewport(viewport: ViewportId): void
  /** Create a tab record (does not insert it — the caller saves the strip). */
  makeTab(url?: string): BrowserTab
}

/* ============================ persistence ============================ */

function isViewportId(value: unknown): value is ViewportId {
  return value === 'desktop' || value === 'tablet' || value === 'mobile'
}

export function sanitizeTabs(value: unknown): BrowserTab[] {
  if (!Array.isArray(value)) {return []}

  const out: BrowserTab[] = []

  for (const item of value) {
    if (item == null || typeof item !== 'object') {continue}
    const t = item as Record<string, unknown>

    if (typeof t.id !== 'string') {continue}

    out.push({
      id: t.id,
      input: typeof t.input === 'string' ? t.input : '',
      url: typeof t.url === 'string' ? t.url : '',
      title: typeof t.title === 'string' ? t.title : 'New tab',
      loading: false
    })
  }

  return out
}

/* ============================== adapter ============================== */

let tabSeq = 0

function makeTabId(): string {
  tabSeq += 1

  return `tab-${Date.now().toString(36)}-${tabSeq.toString(36)}`
}

/** Normalize a URL to a safe http(s) href; null when invalid. */
export function normalizePreviewUrl(input: string): null | string {
  try {
    const parsed = new URL(input.includes('://') ? input : `https://${input}`)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

// BACKEND-TODO(browser-preview): [D-10, research/11 §3] local tab strip only — the future
// backend surface is the `preview.*` event family (see port/FEATURE_MAP.md).
export const localBrowserPreviewAdapter: BrowserPreviewAdapter = {
  listTabs() {
    const tabs = $previewTabs.get()

    return tabs.length > 0 ? tabs : [this.makeTab()]
  },

  viewport() {
    return $previewViewport.get()
  },

  saveTabs(tabs) {
    $previewTabs.set(tabs.length > 0 ? tabs : [this.makeTab()])
  },

  setViewport(viewport) {
    if (!isViewportId(viewport)) {return}

    $previewViewport.set(viewport)
  },

  makeTab(url = '') {
    const href = url ? normalizePreviewUrl(url) : null
    const host = href ? safeHost(href) : ''

    return {
      id: makeTabId(),
      input: url,
      url: href ?? '',
      title: host || 'New tab',
      loading: Boolean(href)
    }
  }
}

function safeHost(href: string): string {
  try {
    return new URL(href).host
  } catch {
    return ''
  }
}

/* ============================== stores ============================== */

export const $previewTabs = atom<BrowserTab[]>(readLocalRecord(WORKSPACE_KEY.browserTabs, [], sanitizeTabs))
export const $previewViewport = atom<ViewportId>(readLocalRecord(
  WORKSPACE_KEY.browserViewport,
  'desktop',
  (value): ViewportId => (isViewportId(value) ? value : 'desktop')
))

$previewTabs.subscribe(tabs => {
  // BACKEND-TODO(browser-preview): [D-10, research/11 §3] replace with real
  // `preview.*` sync when backend lands; until then this is the persistence point.
  writeLocalRecord(WORKSPACE_KEY.browserTabs, tabs)
})

$previewViewport.subscribe(viewport => {
  writeLocalRecord(WORKSPACE_KEY.browserViewport, viewport)
})
