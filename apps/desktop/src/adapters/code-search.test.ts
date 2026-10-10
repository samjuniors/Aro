import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HermesReadDirResult, HermesReadFileTextResult } from '@/global'

import { DEFAULT_MAX_RESULTS, localCodeSearchAdapter, matchFile } from './code-search'

const readDir = vi.hoisted(() => vi.fn())
const readFileText = vi.hoisted(() => vi.fn())

vi.mock('@/lib/desktop-fs', () => ({
  readDesktopDir: readDir,
  readDesktopFileText: readFileText
}))

function dir(path: string, names: [string, boolean][]): HermesReadDirResult {
  return { entries: names.map(([name, isDirectory]) => ({ name, path: `${path}/${name}`, isDirectory })) }
}

function file(path: string, text: string, opts: Partial<HermesReadFileTextResult> = {}): HermesReadFileTextResult {
  return { path, text, ...opts }
}

describe('code-search adapter (local)', () => {
  beforeEach(() => {
    readDir.mockReset()
    readFileText.mockReset()
  })

  it('matches filenames and content lines like the prototype', () => {
    const hits = matchFile('/w/src/aro-app.tsx', 'aro-app.tsx', 'const ARO = 1\nconst aro = 2', 'aro')

    expect(hits).toContainEqual({ path: '/w/src/aro-app.tsx', line: 0, text: '— filename match —' })
    expect(hits).toContainEqual({ path: '/w/src/aro-app.tsx', line: 1, text: 'const ARO = 1' })
    expect(hits).toContainEqual({ path: '/w/src/aro-app.tsx', line: 2, text: 'const aro = 2' })
  })

  it('needs at least two characters', async () => {
    const result = await localCodeSearchAdapter.search({ query: 'a', root: '/w' })

    expect(result).toEqual({ hits: [], scannedFiles: 0, truncated: false })

    expect(readDir).not.toHaveBeenCalled()
  })

  it('walks the real workspace through the fs bridge, skipping ignored dirs', async () => {
    readDir.mockImplementation(async (path: string) => {
      if (path === '/w') {
        return dir('/w', [['src', true], ['node_modules', true], ['README.md', false]])
      }

      if (path === '/w/src') {
        return dir('/w/src', [['main.ts', false]])
      }

      return { entries: [] }
    })
    readFileText.mockImplementation(async (path: string) => {
      if (path === '/w/README.md') {return file(path, 'hello world')}

      if (path === '/w/src/main.ts') {return file(path, 'const world = greet()')}

      throw new Error('unreadable')
    })

    const result = await localCodeSearchAdapter.search({ query: 'world', root: '/w' })

    expect(result.scannedFiles).toBe(2)
    expect(result.truncated).toBe(false)
    expect(result.hits).toEqual(
      expect.arrayContaining([
        { path: '/w/README.md', line: 1, text: 'hello world' },
        { path: '/w/src/main.ts', line: 1, text: 'const world = greet()' }
      ])
    )
    expect(readDir).not.toHaveBeenCalledWith('/w/node_modules')
  })

  it('caps results at the prototype limit and reports truncation', async () => {
    readDir.mockResolvedValue(dir('/w', Array.from({ length: 80 }, (_, i): [string, boolean] => [`f${i}.ts`, false])))
    readFileText.mockImplementation(async (path: string) => file(path, 'needle needle'))

    const result = await localCodeSearchAdapter.search({ query: 'needle', root: '/w' })

    expect(result.hits.length).toBeLessThanOrEqual(DEFAULT_MAX_RESULTS)
    expect(result.truncated).toBe(true)
  })

  it('skips binary and oversized files honestly', async () => {
    readDir.mockResolvedValue(dir('/w', [['a.ts', false], ['b.txt', false], ['c.ts', false]]))
    readFileText.mockImplementation(async (path: string) => {
      if (path === '/w/a.ts') {return file(path, 'needle', { binary: true })}

      if (path === '/w/c.ts') {return file(path, 'needle', { byteSize: 10 * 1024 * 1024 })}

      return file(path, 'needle')
    })

    const result = await localCodeSearchAdapter.search({ query: 'needle', root: '/w' })

    expect(result.scannedFiles).toBe(3)
    expect(result.hits).toEqual([{ path: '/w/b.txt', line: 1, text: 'needle' }])
  })
})
