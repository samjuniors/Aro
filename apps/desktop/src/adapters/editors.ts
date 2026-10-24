/**
 * EXTERNAL EDITORS ADAPTER (local list + OS protocol open).
 *
 * Contract refs:
 * - Feature id: `external-editors-list` (port/FEATURE_MAP.md — local);
 *   SETTINGS_MERGE `editors` row (Case `both`: list = local adapter,
 *   open action = the desktop's IDE capability).
 * - Glossary row: External IDE control (open only) — prototype
 *   `ExternalIdeControl` + `data/extra.ts` INSTALLED_IDES.
 * - Backend-todo shape: `editors.list/detect` (port/FEATURE_MAP.md).
 *
 * Adopts the working implementation from the fork's
 * `src/app/shell/external-ide-control.tsx` (commit 93ff2d2910): the same
 * catalog, the SAME persisted preferred-IDE key
 * (`hermes.desktop.external-ide.preferred` — stored user value preserved;
 * do not rename), and the same OS protocol launch. The renderer cannot
 * detect installations (that needs main-process help) — `installed` stays
 * `null` (unknown) until a backend provides detection.
 */

import { atom } from 'nanostores'

import { persistString, readKey } from '@/lib/storage'
import { notify } from '@/store/notifications'

export type SupportedIde = 'cursor' | 'vscode' | 'windsurf' | 'zed'

export interface EditorInstall {
  id: SupportedIde
  name: string
  /** URL scheme that opens a folder in this editor. */
  scheme: string
  /** null = unknown (renderer cannot detect installations). */
  installed: null
}

export interface ExternalEditorsAdapter {
  /** The catalog (prototype list, fork-verified schemes). */
  list(): EditorInstall[]
  /** The preferred editor id ('cursor' when nothing was stored). */
  preferred(): SupportedIde
  /** Persist the preferred editor. */
  setPreferred(id: SupportedIde): void
  /**
   * Open `path` in the preferred (or given) editor via its URL scheme.
   * Returns false when there is nothing to open (no folder attached).
   */
  open(path: string, id?: SupportedIde): boolean
}

/* ============================== adapter ============================== */

/** The fork's catalog, adopted (matches prototype INSTALLED_IDES ids). */
export const EDITOR_CATALOG: EditorInstall[] = [
  { id: 'cursor', name: 'Cursor', scheme: 'cursor://file', installed: null },
  { id: 'vscode', name: 'VS Code', scheme: 'vscode://file', installed: null },
  { id: 'windsurf', name: 'Windsurf', scheme: 'windsurf://file', installed: null },
  { id: 'zed', name: 'Zed', scheme: 'zed://file', installed: null }
]

// Existing fork key — adopted as-is (stored user value preserved).
const PREFERRED_IDE_KEY = 'hermes.desktop.external-ide.preferred'

function readInitialPreferred(): SupportedIde {
  try {
    const stored = readKey(PREFERRED_IDE_KEY) as SupportedIde | null

    return stored && EDITOR_CATALOG.some(e => e.id === stored) ? stored : 'cursor'
  } catch {
    return 'cursor'
  }
}

export const $preferredIde = atom<SupportedIde>(readInitialPreferred())

// BACKEND-TODO(editors): [D-10, research/11 §1] `editors.list/detect` will provide
// real install detection; until then `installed` stays null (never guessed).
export const localEditorsAdapter: ExternalEditorsAdapter = {
  list() {
    return EDITOR_CATALOG
  },

  preferred() {
    const current = $preferredIde.get()

    return EDITOR_CATALOG.some(e => e.id === current) ? current : 'cursor'
  },

  setPreferred(id) {
    if (!EDITOR_CATALOG.some(e => e.id === id)) {return}

    $preferredIde.set(id)
    persistString(PREFERRED_IDE_KEY, id)
  },

  open(path, id) {
    const target = path.trim()

    if (!target) {return false}

    const preferred = id ?? $preferredIde.get()
    const editor = EDITOR_CATALOG.find(e => e.id === preferred)

    if (!editor) {return false}

    this.setPreferred(editor.id)

    const normalizedPath = target.replace(/\\/g, '/')
    const targetUrl = `${editor.scheme}/${encodeURI(normalizedPath)}`

    try {
      if (typeof window !== 'undefined' && window.hermesDesktop?.openExternal) {
        void window.hermesDesktop.openExternal(targetUrl)
      } else {
        window.open(targetUrl, '_self')
      }

      notify({ kind: 'info', message: `Opening in ${editor.name}…` })
    } catch {
      notify({ kind: 'info', message: `Launched ${editor.name} protocol for ${normalizedPath}` })
    }

    return true
  }
}
