/**
 * CODE SEARCH ADAPTER (local) — the prototype's workspace search.
 *
 * Contract refs:
 * - Feature id: `code-search` (port/FEATURE_MAP.md — local).
 * - Glossary row: CodeSearchView — deliberately NOT merged with the Hermes
 *   grep tool (D-0017: the grep tool is agent-side; this is a user-facing
 *   workspace search — different concepts, both survive).
 * - Backend-todo shape: grep over workspace via a future `search` RPC
 *   (port/FEATURE_MAP.md `code-search` row).
 *
 * Interface = prototype names (`Hit = { path, line, text }`, min query
 * length 2, result cap 60 — prototype `WorkspacePanel.tsx`
 * `CodeSearchView`). The local implementation is an honest renderer-side
 * search: it walks the REAL workspace through the host's existing fs
 * bridge (`readDesktopDir` / `readDesktopFileText` — baseline §A preload
 * surface, no new wire) and reports what it actually scanned. No demo
 * file tree, no faked results.
 */

import { readDesktopDir, readDesktopFileText } from '@/lib/desktop-fs'

/** Prototype hit shape (prototype `WorkspacePanel.tsx` `Hit`). */
export interface SearchHit {
  path: string
  line: number
  text: string
}

export interface CodeSearchQuery {
  /** The needle; shorter than MIN_QUERY searches nothing. */
  query: string
  /** Absolute workspace root to search under. */
  root: string
  /** Result cap (prototype default 60). */
  maxResults?: number
}

export interface CodeSearchResult {
  hits: SearchHit[]
  /** How many files were actually read — the honest scope of the search. */
  scannedFiles: number
  /** True when scanning stopped at a safety cap before the tree was exhausted. */
  truncated: boolean
}

export interface CodeSearchAdapter {
  search(query: CodeSearchQuery): Promise<CodeSearchResult>
}

/* ============================ limits ============================ */

export const MIN_QUERY_LENGTH = 2
export const DEFAULT_MAX_RESULTS = 60
/** Safety caps so a huge workspace cannot stall the renderer. */
export const MAX_FILES_SCANNED = 2500
export const MAX_FILE_BYTES = 512 * 1024

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'target',
  '.venv', 'venv', '__pycache__', '.mypy_cache', '.pytest_cache',
  '.next', '.turbo', '.cache', 'coverage', '.aroo'
])

const TEXT_EXTENSIONS = /\.(txt|md|markdown|json|jsonc|ya?ml|toml|ini|cfg|env.*|csv|tsv|ts|tsx|js|jsx|mjs|cjs|py|pyi|rb|go|rs|java|kt|kts|c|h|cc|cpp|hpp|cs|swift|m|mm|sh|bash|zsh|fish|ps1|sql|html|htm|css|scss|sass|less|vue|svelte|astro|gradle|xml|svg|proto|dockerfile|makefile|prisma|graphql|gql)$/i

function looksTextual(name: string): boolean {
  const lower = name.toLowerCase()

  if (lower.startsWith('.dockerignore') || lower.startsWith('.gitignore') || lower.startsWith('.env')) {return true}

  return TEXT_EXTENSIONS.test(name)
}

/* ============================ matcher ============================ */

/** Pure matcher over in-memory file bodies — the prototype's algorithm. */
export function matchFile(
  path: string,
  name: string,
  body: string,
  needle: string
): SearchHit[] {
  const q = needle.toLowerCase()

  if (q.length < MIN_QUERY_LENGTH) {return []}

  const out: SearchHit[] = []

  if (name.toLowerCase().includes(q)) {
    out.push({ path, line: 0, text: '— filename match —' })
  }

  let line = 0

  for (const text of body.split('\n')) {
    line += 1

    if (text.toLowerCase().includes(q)) {
      out.push({ path, line, text: text.trim() })
    }
  }

  return out
}

/* ============================== adapter ============================== */

// BACKEND-TODO(code-search): [D-10, research/11 §2] renderer-side walk only — the
// future backend call is a `search` RPC over the workspace (see port/FEATURE_MAP.md).
export const localCodeSearchAdapter: CodeSearchAdapter = {
  async search({ query, root, maxResults = DEFAULT_MAX_RESULTS }) {
    const needle = query.trim()
    const hits: SearchHit[] = []
    let scannedFiles = 0
    let truncated = false

    if (needle.length < MIN_QUERY_LENGTH || !root.trim()) {
      return { hits, scannedFiles, truncated }
    }

    const queue: string[] = [root]

    while (queue.length > 0 && scannedFiles < MAX_FILES_SCANNED && hits.length < maxResults) {
      const dir = queue.shift()

      if (dir == null) {break}

      let entries

      try {
        ({ entries } = await readDesktopDir(dir))
      } catch {
        continue
      }

      for (const entry of entries) {
        if (hits.length >= maxResults || scannedFiles >= MAX_FILES_SCANNED) {
          truncated = true

          break
        }

        if (IGNORED_DIRS.has(entry.name)) {continue}

        if (entry.isDirectory) {
          queue.push(entry.path)

          continue
        }

        if (!looksTextual(entry.name)) {continue}

        scannedFiles += 1

        let result

        try {
          result = await readDesktopFileText(entry.path)
        } catch {
          continue
        }

        if (result.binary || (result.byteSize ?? 0) > MAX_FILE_BYTES) {continue}

        const fileHits = matchFile(entry.path, entry.name, result.text, needle)

        for (const hit of fileHits) {
          if (hits.length >= maxResults) {
            truncated = true

            break
          }

          hits.push(hit)
        }
      }
    }

    // The while loop only exits early on a cap — if directories are still
    // queued, the result is honestly truncated.
    if (queue.length > 0) {truncated = true}

    return { hits, scannedFiles, truncated }
  }
}
