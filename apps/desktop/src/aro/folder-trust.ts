import { atom } from 'nanostores'

import { cleanPath, isUnderPath } from '@/lib/path-compare'
import { readKey, writeKey } from '@/lib/storage'
import { requestGatewayForProfile } from '@/store/gateway'
import { $activeGatewayProfile, normalizeProfileKey } from '@/store/profile'

export const TRUSTED_FOLDERS_STORAGE_KEY = 'aro.desktop.trusted_folders'

function readInitialTrustedFolders(): string[] {
  const stored = readKey(TRUSTED_FOLDERS_STORAGE_KEY)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(cleanPath)
    }
  } catch {
    // Malformed JSON fallback
  }

  return []
}

export const $trustedFolders = atom<string[]>(readInitialTrustedFolders())

$trustedFolders.subscribe(folders => {
  writeKey(TRUSTED_FOLDERS_STORAGE_KEY, JSON.stringify(folders))
})

/**
 * Checks whether a folder path is explicitly trusted by the user.
 * Returns true if the path itself or an ancestor directory is in the trusted folders list.
 */
export function isFolderTrusted(folderPath: string): boolean {
  const trimmed = folderPath.trim()
  if (!trimmed) {
    return false
  }

  const cleaned = cleanPath(trimmed)
  const trusted = $trustedFolders.get()

  return trusted.some(trustedPath => isUnderPath(trustedPath, cleaned))
}

/**
 * Adds a directory to the trusted folders set and persists it.
 * Also best-effort syncs with the live gateway's `lsp.trusted_workspaces` config.
 */
export function trustFolder(folderPath: string): void {
  const trimmed = folderPath.trim()
  if (!trimmed) {
    return
  }

  const cleaned = cleanPath(trimmed)
  const current = $trustedFolders.get()

  if (!current.includes(cleaned)) {
    const next = [...current, cleaned]
    $trustedFolders.set(next)

    // Best-effort sync to gateway lsp.trusted_workspaces so LSP doesn't skip this directory
    try {
      void requestGatewayForProfile(normalizeProfileKey($activeGatewayProfile.get()), 'config.set', {
        key: 'lsp.trusted_workspaces',
        value: next
      }).catch(() => {
        // Gateway may not be open or may not support config.set in this environment
      })
    } catch {
      // Ignore background sync errors
    }
  }
}

/**
 * Removes a directory from the trusted folders set.
 */
export function untrustFolder(folderPath: string): void {
  const trimmed = folderPath.trim()
  if (!trimmed) {
    return
  }

  const cleaned = cleanPath(trimmed)
  const current = $trustedFolders.get()
  const next = current.filter(item => item !== cleaned)
  $trustedFolders.set(next)
}

/**
 * Clears all trusted folders (used primarily in tests).
 */
export function resetTrustedFolders(): void {
  $trustedFolders.set([])
}
