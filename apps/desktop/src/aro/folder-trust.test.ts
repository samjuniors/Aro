import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $trustedFolders,
  isFolderTrusted,
  resetTrustedFolders,
  trustFolder,
  untrustFolder
} from './folder-trust'

describe('folder-trust', () => {
  beforeEach(() => {
    resetTrustedFolders()
  })

  it('initially reports untrusted for unknown paths', () => {
    expect(isFolderTrusted('/home/user/project')).toBe(false)
    expect(isFolderTrusted('')).toBe(false)
  })

  it('trusts a specific folder and child subdirectories', () => {
    trustFolder('/home/user/project')

    expect(isFolderTrusted('/home/user/project')).toBe(true)
    expect(isFolderTrusted('/home/user/project/src')).toBe(true)
    expect(isFolderTrusted('/home/user/project/src/components')).toBe(true)

    // Unrelated sibling is not trusted
    expect(isFolderTrusted('/home/user/other-project')).toBe(false)
    expect(isFolderTrusted('/home/user')).toBe(false)
  })

  it('untrusts a previously trusted folder', () => {
    trustFolder('/workspace/app')
    expect(isFolderTrusted('/workspace/app')).toBe(true)

    untrustFolder('/workspace/app')
    expect(isFolderTrusted('/workspace/app')).toBe(false)
  })

  it('deduplicates trusted folder additions', () => {
    trustFolder('/workspace/app')
    trustFolder('/workspace/app')

    expect($trustedFolders.get().filter(p => p === '/workspace/app').length).toBe(1)
  })
})
