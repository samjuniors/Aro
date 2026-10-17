import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { adapters, type SearchHit } from '@/adapters'
import { IconFolder, IconSearch, IconX } from '@/aro/Icons'
import { Badge, Panel } from '@/aro/ui'
import { $focusedWorkspaceCwd } from '@/store/session-states'

interface SearchSectionProps {
  onPreviewFile?: (path: string) => void
}

/**
 * CODE SEARCH SECTION — workspace grep-over-files tab.
 *
 * Contract refs:
 * - Feature id: `code-search` (port/FEATURE_MAP.md — local).
 * - Surfaces `adapters.codeSearch` (src/adapters/code-search.ts) as a right-rail panel tab.
 * - Honest local-only scanning via renderer fs bridge (readDesktopDir/readDesktopFileText).
 * - BACKEND-TODO(code-search): grep over workspace via future search RPC.
 */
export function SearchSection({ onPreviewFile }: SearchSectionProps) {
  const cwd = useStore($focusedWorkspaceCwd)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [scannedFiles, setScannedFiles] = useState(0)
  const [truncated, setTruncated] = useState(false)

  // BACKEND-TODO(code-search): renderer-side walk only — future backend call is a `search` RPC
  const performSearch = useCallback(
    async (needle: string, rootDir: string) => {
      const q = needle.trim()

      if (q.length < 2 || !rootDir) {
        setHits([])
        setScannedFiles(0)
        setTruncated(false)
        setSearching(false)

        return
      }

      setSearching(true)

      try {
        const result = await adapters.codeSearch.search({
          query: q,
          root: rootDir
        })

        setHits(result.hits)
        setScannedFiles(result.scannedFiles)
        setTruncated(result.truncated)
      } catch {
        setHits([])
        setScannedFiles(0)
        setTruncated(false)
      } finally {
        setSearching(false)
      }
    },
    []
  )

  useEffect(() => {
    const handle = setTimeout(() => {
      void performSearch(query, cwd)
    }, 120)

    return () => clearTimeout(handle)
  }, [query, cwd, performSearch])

  const byFile = useMemo(() => {
    const map = new Map<string, SearchHit[]>()

    for (const hit of hits) {
      const existing = map.get(hit.path) ?? []
      existing.push(hit)
      map.set(hit.path, existing)
    }

    return [...map.entries()]
  }, [hits])

  const formatDisplayPath = useCallback(
    (filePath: string) => {
      if (!cwd) {return filePath}

      const normalizedCwd = cwd.replace(/[\\/]+$/, '')

      if (filePath.startsWith(normalizedCwd)) {
        return filePath.slice(normalizedCwd.length).replace(/^[\\/]/, '')
      }

      return filePath
    },
    [cwd]
  )

  if (!cwd) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl border border-aro-line-soft bg-aro-raise text-aro-ink-3 shadow-aro-e1">
          <IconSearch size={18} />
        </div>
        <h3 className="mt-3 font-aro-display text-[13px] font-semibold text-aro-ink">No workspace open</h3>
        <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-aro-ink-3">
          Open a project or folder to search text and code across workspace files.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden font-aro-sans text-[11px]">
      {/* Search Bar Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-aro-line-soft bg-aro-raise/50 px-3 py-2">
        <IconSearch className="shrink-0 text-aro-ink-4" size={13} />
        <input
          aria-label="Search project files"
          className="h-[24px] min-w-0 flex-1 bg-transparent font-aro-mono text-[11.5px] text-aro-ink outline-none placeholder:text-aro-ink-4"
          onChange={e => setQuery(e.target.value)}
          placeholder="Search project files…"
          type="text"
          value={query}
        />
        {query.length > 0 && (
          <button
            aria-label="Clear search"
            className="flex size-4 items-center justify-center rounded text-aro-ink-4 hover:bg-aro-hover hover:text-aro-ink"
            onClick={() => setQuery('')}
            type="button"
          >
            <IconX size={11} />
          </button>
        )}
        {query.trim().length >= 2 && (
          <Badge className="shrink-0 text-[9.5px]" mono tone={hits.length > 0 ? 'iris' : 'neutral'}>
            {hits.length} hit{hits.length === 1 ? '' : 's'}
          </Badge>
        )}
      </div>

      {/* Scope / Status Note */}
      <div className="flex shrink-0 items-center justify-between border-b border-aro-line-soft bg-aro-sunken/40 px-3 py-1 font-aro-mono text-[9.5px] text-aro-ink-4">
        <span>Local scan · {scannedFiles} files checked{truncated ? ' (cap reached)' : ''}</span>
        {searching && <span className="animate-pulse text-aro-iris-soft">Scanning…</span>}
      </div>

      {/* Results / Empty View */}
      <div className="min-h-0 flex-1 overflow-auto p-2.5">
        {query.trim().length < 2 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-xl border border-aro-line-soft bg-aro-raise text-aro-ink-3">
              <IconSearch size={16} />
            </div>
            <p className="max-w-[220px] text-[11px] leading-relaxed text-aro-ink-3">
              Ripgrep-style search across workspace files. Matches stream in as you type (minimum 2 characters).
            </p>
          </div>
        ) : hits.length === 0 && !searching ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center p-6 text-center font-aro-mono text-[11px] text-aro-ink-4">
            no matches for “{query.trim()}”
          </div>
        ) : (
          <div className="space-y-3">
            {byFile.map(([filePath, fileHits]) => (
              <Panel className="overflow-hidden p-0" key={filePath}>
                <button
                  className="flex w-full items-center gap-2 border-b border-aro-line-soft bg-aro-raise/40 px-2.5 py-1.5 text-left transition-colors hover:bg-aro-hover"
                  onClick={() => onPreviewFile?.(filePath)}
                  aria-label={`Open ${filePath}`}
                  type="button"
                >
                  <IconFolder className="shrink-0 text-aro-ink-4" size={11} />
                  <span className="min-w-0 flex-1 truncate font-aro-mono text-[11px] font-medium text-aro-ink-2">
                    {formatDisplayPath(filePath)}
                  </span>
                  <span className="font-aro-mono text-[9px] text-aro-ink-4">
                    {fileHits.length}
                  </span>
                </button>
                <div className="divide-y divide-aro-line-soft/60">
                  {fileHits.map((hit, idx) => (
                    <button
                      className="group flex w-full items-start gap-2 px-2.5 py-1 text-left transition-colors hover:bg-aro-hover/60"
                      key={`${hit.line}-${idx}`}
                      onClick={() => onPreviewFile?.(hit.path)}
                      aria-label={`Open line ${hit.line}`}
                      type="button"
                    >
                      <span className="w-6 shrink-0 text-right font-aro-mono text-[10px] text-aro-ink-4 group-hover:text-aro-ink-2">
                        {hit.line || '·'}
                      </span>
                      <code className="min-w-0 flex-1 truncate font-aro-mono text-[10.5px] text-aro-ink-3 group-hover:text-aro-ink">
                        {hit.text}
                      </code>
                    </button>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
