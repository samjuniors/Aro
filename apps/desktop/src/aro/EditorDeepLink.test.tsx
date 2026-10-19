import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { adapters } from '@/adapters'
import { $preferredIde } from '@/adapters/editors'

import {
  AroIdeHandoffButton,
  AroIdeHandoffPanel,
  AroIdeSelector,
  buildIdeDeepLink,
  openIdeDeepLink,
  parseHunkLine,
} from './EditorDeepLink'
import { resetAroFeatures, setAroFeature } from './flags'

describe('EditorDeepLink (13.S5)', () => {
  beforeEach(() => {
    resetAroFeatures()
    $preferredIde.set('cursor')
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('parseHunkLine', () => {
    it('extracts target line from valid unified diff headers', () => {
      expect(parseHunkLine('@@ -12,4 +18,6 @@')).toBe(18)
      expect(parseHunkLine('@@ -1,5 +42,10 @@ export function test() {')).toBe(42)
      expect(parseHunkLine('@@ -0,0 +1 @@')).toBe(1)
    })

    it('returns undefined for malformed headers or headers without added lines', () => {
      expect(parseHunkLine('invalid header')).toBeUndefined()
      expect(parseHunkLine('@@ @@')).toBeUndefined()
    })
  })

  describe('buildIdeDeepLink', () => {
    it('constructs correct scheme URLs across all supported editors', () => {
      expect(buildIdeDeepLink('src/agent.ts', 25, 'cursor')).toBe('cursor://file/src/agent.ts:25')
      expect(buildIdeDeepLink('src/agent.ts', 25, 'vscode')).toBe('vscode://file/src/agent.ts:25')
      expect(buildIdeDeepLink('src/agent.ts', 25, 'windsurf')).toBe('windsurf://file/src/agent.ts:25')
      expect(buildIdeDeepLink('src/agent.ts', 25, 'zed')).toBe('zed://file/src/agent.ts:25')
      expect(buildIdeDeepLink('src/agent.ts', 25, 'jetbrains')).toBe('idea://open?file=src/agent.ts&line=25')
    })

    it('normalizes Windows backslashes and resolves relative paths against cwd', () => {
      const link = buildIdeDeepLink('src\\tools\\git.ts', 14, 'cursor', 'C:\\Projects\\Aro')
      expect(link).toBe('cursor://file/C:/Projects/Aro/src/tools/git.ts:14')
    })

    it('omits line coordinate when line is undefined or 0', () => {
      expect(buildIdeDeepLink('src/index.ts', undefined, 'vscode')).toBe('vscode://file/src/index.ts')
      expect(buildIdeDeepLink('src/index.ts', 0, 'vscode')).toBe('vscode://file/src/index.ts')
      expect(buildIdeDeepLink('src/index.ts', undefined, 'jetbrains')).toBe('idea://open?file=src/index.ts')
    })
  })

  describe('openIdeDeepLink', () => {
    it('delegates to window.hermesDesktop.openExternal when in Electron', () => {
      const openExternalMock = vi.fn().mockResolvedValue(undefined)
      window.hermesDesktop = {
        openExternal: openExternalMock,
      } as any

      const notifyMock = vi.fn()

      const success = openIdeDeepLink({
        filePath: 'src/main.ts',
        line: 10,
        ide: 'cursor',
        onNotify: notifyMock,
      })

      expect(success).toBe(true)
      expect(openExternalMock).toHaveBeenCalledWith('cursor://file/src/main.ts:10')
      expect(notifyMock).toHaveBeenCalledWith('Opening in Cursor at line 10…')

      delete (window as any).hermesDesktop
    })

    it('falls back to window.open in browser environment', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const notifyMock = vi.fn()

      const success = openIdeDeepLink({
        filePath: 'src/main.ts',
        line: 5,
        ide: 'vscode',
        onNotify: notifyMock,
      })

      expect(success).toBe(true)
      expect(openSpy).toHaveBeenCalledWith('vscode://file/src/main.ts:5', '_self')
      expect(notifyMock).toHaveBeenCalledWith('Opening in VS Code at line 5…')
    })

    it('returns false when file path is empty', () => {
      expect(openIdeDeepLink({ filePath: '' })).toBe(false)
    })
  })

  describe('AroIdeHandoffButton component', () => {
    it('renders null when editorDeepLink feature flag is disabled', () => {
      setAroFeature('editorDeepLink', false)

      const { container } = render(
        <AroIdeHandoffButton filePath="src/review.ts" line={12} />,
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders and dispatches deep-link when enabled or forceEnabled=true', () => {
      setAroFeature('editorDeepLink', false)
      const onOpenMock = vi.fn()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(
        <AroIdeHandoffButton
          filePath="src/review.ts"
          forceEnabled={true}
          line={12}
          onOpen={onOpenMock}
        />,
      )

      const btn = screen.getByRole('button', { name: 'Open in Cursor' })
      expect(btn).toBeTruthy()

      fireEvent.click(btn)

      expect(openSpy).toHaveBeenCalledWith('cursor://file/src/review.ts:12', '_self')
      expect(onOpenMock).toHaveBeenCalledWith('cursor://file/src/review.ts:12')
    })
  })

  describe('AroIdeSelector component', () => {
    it('switches preferred IDE and updates adapter store', () => {
      const onSelectMock = vi.fn()
      const setPreferredSpy = vi.spyOn(adapters.editors, 'setPreferred')

      render(<AroIdeSelector forceEnabled={true} onSelect={onSelectMock} />)

      const vscodeRadio = screen.getByRole('radio', { name: 'VS Code' })
      fireEvent.click(vscodeRadio)

      expect(setPreferredSpy).toHaveBeenCalledWith('vscode')
      expect(onSelectMock).toHaveBeenCalledWith('vscode')
    })
  })

  describe('AroIdeHandoffPanel showcase', () => {
    it('renders interactive panel, updates link preview, and copies link to clipboard', () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      })

      render(<AroIdeHandoffPanel forceEnabled={true} />)

      expect(screen.getByText('Active Editor Handoff')).toBeTruthy()

      const pathInput = screen.getByLabelText('Target file path')
      fireEvent.change(pathInput, { target: { value: 'apps/desktop/src/main.tsx' } })

      const lineInput = screen.getByLabelText('Target line number')
      fireEvent.change(lineInput, { target: { value: '88' } })

      expect(screen.getByText('cursor://file/apps/desktop/src/main.tsx:88')).toBeTruthy()

      const copyBtn = screen.getByRole('button', { name: 'Copy Deep Link' })
      fireEvent.click(copyBtn)

      expect(writeTextSpy).toHaveBeenCalledWith('cursor://file/apps/desktop/src/main.tsx:88')
      expect(screen.getByText('Copied Link')).toBeTruthy()
    })
  })
})
