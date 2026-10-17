import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import { $previewTabs, $previewViewport, adapters, type ViewportId } from '@/adapters'
import { normalizePreviewUrl } from '@/adapters/browser-preview'
import {
  IconExternal,
  IconEye,
  IconGlobe,
  IconMonitor,
  IconPlus,
  IconRefresh,
  IconX
} from '@/aro/Icons'
import { Button } from '@/aro/ui'
import { Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function IconTablet({ size = 12, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <rect height="18" rx="2" width="14" x="5" y="3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function IconSmartphone({ size = 12, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <rect height="16" rx="2" width="10" x="7" y="4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

const VIEWPORTS: { icon: typeof IconMonitor | typeof IconTablet; id: ViewportId; label: string; width: string }[] = [
  { icon: IconMonitor, id: 'desktop', label: 'Desktop', width: '100%' },
  { icon: IconTablet, id: 'tablet', label: 'Tablet (768px)', width: '768px' },
  { icon: IconSmartphone, id: 'mobile', label: 'Mobile (390px)', width: '390px' }
]

/**
 * BROWSER PREVIEW SECTION — in-app preview tab strip and viewports.
 *
 * Contract refs:
 * - Feature id: `browser-preview` (port/FEATURE_MAP.md — local).
 * - Surfaces `adapters.browserPreview` (src/adapters/browser-preview.ts) as a right-rail panel tab.
 * - Tab strip and viewport state persist under `conductor.workspace.v3.browser.*` (survives reload).
 * - BACKEND-TODO(browser-preview): tabs/viewports over future preview.* events.
 */
export function BrowserSection() {
  const tabs = useStore($previewTabs)
  const viewport = useStore($previewViewport)

  const [activeId, setActiveId] = useState<string>(() => tabs[0]?.id ?? '')
  const activeTab = tabs.find(t => t.id === activeId) ?? tabs[0] ?? adapters.browserPreview.makeTab()

  const [inputVal, setInputVal] = useState<string>(activeTab.input)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (tabs.length === 0) {
      const fresh = adapters.browserPreview.makeTab()
      adapters.browserPreview.saveTabs([fresh])
      setActiveId(fresh.id)
    }
  }, [tabs.length])

  useEffect(() => {
    if (activeTab) {
      setInputVal(activeTab.input)
      setError('')
    }
  }, [activeTab])

  const handleOpen = useCallback(() => {
    const raw = inputVal.trim()

    if (!raw) {
      return
    }

    const normalized = normalizePreviewUrl(raw)

    if (!normalized) {
      setError('Enter a valid HTTP or HTTPS URL.')

      return
    }

    setError('')

    let hostTitle = 'Preview'

    try {
      hostTitle = new URL(normalized).hostname.replace(/^www\./, '')
    } catch {
      hostTitle = normalized
    }

    const existing = tabs.find(t => t.id === activeTab.id)
    const targetTab = existing ?? activeTab

    const updatedTab = {
      ...targetTab,
      input: normalized,
      loading: true,
      title: hostTitle,
      url: normalized
    }

    const updated = existing
      ? tabs.map(t => (t.id === activeTab.id ? updatedTab : t))
      : [...tabs, updatedTab]

    adapters.browserPreview.saveTabs(updated)
    setActiveId(updatedTab.id)
  }, [inputVal, tabs, activeTab])

  const handleNewTab = useCallback(() => {
    const fresh = adapters.browserPreview.makeTab()
    const nextTabs = [...tabs, fresh]
    adapters.browserPreview.saveTabs(nextTabs)
    setActiveId(fresh.id)
    setInputVal('')
    setError('')
  }, [tabs])

  const handleCloseTab = useCallback(
    (id: string) => {
      const idx = tabs.findIndex(t => t.id === id)

      if (idx === -1) {
        return
      }

      const rest = tabs.filter(t => t.id !== id)

      if (rest.length === 0) {
        const fresh = adapters.browserPreview.makeTab()
        adapters.browserPreview.saveTabs([fresh])
        setActiveId(fresh.id)
        setInputVal('')

        return
      }

      adapters.browserPreview.saveTabs(rest)

      if (id === activeTab.id) {
        const nextActive = rest[Math.min(Math.max(0, idx - 1), rest.length - 1)]
        setActiveId(nextActive.id)
        setInputVal(nextActive.input)
      }
    },
    [tabs, activeTab.id]
  )

  const handleSetViewport = useCallback((vp: ViewportId) => {
    adapters.browserPreview.setViewport(vp)
  }, [])

  const handleReload = useCallback(() => {
    setReloadNonce(n => n + 1)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden font-aro-sans text-[11px]">
      {/* Tab Strip */}
      <div aria-label="Browser tabs" className="flex shrink-0 items-center gap-1 border-b border-aro-line-soft bg-aro-sunken/60 px-2 py-1 select-none" role="tablist">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const isActive = t.id === activeTab.id

            return (
              <div
                aria-selected={isActive}
                className={cn(
                  'flex h-[26px] max-w-[140px] shrink-0 items-center gap-1 rounded-[6px] border border-transparent px-2 text-[11px] transition-colors',
                  isActive
                    ? 'border-aro-line bg-aro-raise font-medium text-aro-ink shadow-aro-e1'
                    : 'text-aro-ink-3 hover:bg-aro-hover hover:text-aro-ink-2'
                )}
                key={t.id}
                role="tab"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
                  onClick={() => {
                    setActiveId(t.id)
                    setInputVal(t.input)
                    setError('')
                  }}
                  aria-label={t.url || 'New tab'}
                  type="button"
                >
                  <IconGlobe className={cn('shrink-0', isActive ? 'text-aro-iris-soft' : 'text-aro-ink-4')} size={11} />
                  <span className="truncate">{t.title || 'New tab'}</span>
                </button>
                <button
                  aria-label={`Close ${t.title || 'tab'}`}
                  className="flex size-3.5 shrink-0 items-center justify-center rounded text-aro-ink-4 hover:bg-aro-hover hover:text-aro-rose"
                  onClick={e => {
                    e.stopPropagation()
                    handleCloseTab(t.id)
                  }}
                  type="button"
                >
                  <IconX size={9} />
                </button>
              </div>
            )
          })}
          <Tip label="New tab">
            <button
              aria-label="New browser tab"
              className="flex size-[24px] shrink-0 items-center justify-center rounded-[6px] text-aro-ink-4 transition-colors hover:bg-aro-hover hover:text-aro-ink"
              onClick={handleNewTab}
              type="button"
            >
              <IconPlus size={12} />
            </button>
          </Tip>
        </div>
      </div>

      {/* URL Toolbar + Viewport switchers */}
      <div className="flex shrink-0 items-center gap-2 border-b border-aro-line-soft bg-aro-raise/40 px-3 py-1.5">
        <input
          aria-label="Preview URL"
          className="h-[26px] min-w-[120px] flex-1 rounded-[6px] border border-aro-line-soft bg-aro-sunken px-2 font-aro-mono text-[11px] text-aro-ink outline-none placeholder:text-aro-ink-4"
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleOpen()
            }
          }}
          placeholder="https://example.com"
          type="text"
          value={inputVal}
        />
        <Button
          disabled={!inputVal.trim()}
          onClick={handleOpen}
          size="xs"
          variant="outline"
        >
          Open
        </Button>
        {activeTab.url && (
          <Tip label="Reload">
            <button
              aria-label="Reload preview"
              className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
              onClick={handleReload}
              type="button"
            >
              <IconRefresh size={12} />
            </button>
          </Tip>
        )}
        <div aria-label="Viewport size" className="flex items-center gap-0.5 rounded-[6px] border border-aro-line-soft bg-aro-sunken p-0.5" role="group">
          {VIEWPORTS.map(v => (
            <Tip key={v.id} label={v.label}>
              <button
                aria-label={`${v.label} viewport`}
                aria-pressed={viewport === v.id}
                className={cn(
                  'flex size-6 items-center justify-center rounded-[4px] text-aro-ink-4 transition-colors',
                  viewport === v.id ? 'bg-aro-raise text-aro-ink shadow-aro-e1' : 'hover:text-aro-ink-2'
                )}
                onClick={() => handleSetViewport(v.id)}
                type="button"
              >
                <v.icon size={12} />
              </button>
            </Tip>
          ))}
        </div>
        {activeTab.url && (
          <Tip label="Open in external browser">
            <button
              aria-label="Open externally"
              className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-aro-ink-3 transition-colors hover:bg-aro-hover hover:text-aro-ink"
              onClick={() => window.open(activeTab.url, '_blank', 'noopener,noreferrer')}
              type="button"
            >
              <IconExternal size={12} />
            </button>
          </Tip>
        )}
      </div>

      {error && (
        <div className="shrink-0 bg-aro-rose/10 px-3 py-1 font-aro-mono text-[10.5px] text-aro-rose" role="alert">
          {error}
        </div>
      )}

      {/* Main Preview Stage */}
      <div className="min-h-0 flex-1 overflow-auto bg-aro-sunken/40">
        {activeTab.url ? (
          <div className="flex h-full min-h-0 flex-col">
            <p className="shrink-0 border-b border-aro-line-soft bg-aro-sunken/20 px-3 py-1 text-[10px] text-aro-ink-4">
              Local preview tab. Some sites block embedded iframes (X-Frame-Options); use external open if blank.
            </p>
            <div className={cn('flex min-h-0 flex-1 justify-center p-2', viewport !== 'desktop' && 'items-start')}>
              <div
                className={cn(
                  'relative h-full transition-all',
                  viewport === 'desktop'
                    ? 'w-full'
                    : 'max-w-full rounded-xl border border-aro-line-strong bg-white shadow-aro-e3 overflow-hidden'
                )}
                style={
                  viewport !== 'desktop'
                    ? { width: VIEWPORTS.find(v => v.id === viewport)?.width }
                    : undefined
                }
              >
                {/* BACKEND-TODO(browser-preview): tabs/viewports over future preview.* */}
                <iframe
                  className="h-full w-full border-0 bg-white"
                  key={`${activeTab.id}-${reloadNonce}`}
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                  src={activeTab.url}
                  title={`${activeTab.title || 'Page'} preview`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl border border-aro-line-soft bg-aro-raise text-aro-ink-3 shadow-aro-e1">
              <IconEye size={18} />
            </div>
            <h3 className="mt-3 font-aro-display text-[13px] font-semibold text-aro-ink">No page open</h3>
            <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-aro-ink-3">
              Enter a URL above to open an in-app browser preview. Switch between desktop, tablet, and mobile viewports.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
