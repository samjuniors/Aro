import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $previewTabs, $previewViewport, localBrowserPreviewAdapter } from '@/adapters/browser-preview'

import { AroBrowserPreview } from './BrowserPreview'
import { resetAroFeatures, setAroFeature } from './flags'

describe('AroBrowserPreview (13.S4)', () => {
  beforeEach(() => {
    resetAroFeatures()
    $previewTabs.set([])
    $previewViewport.set('desktop')
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders disabled state when inAppBrowserPreview feature flag is disabled', () => {
    setAroFeature('inAppBrowserPreview', false)

    render(<AroBrowserPreview />)

    expect(screen.getByText('Browser Preview')).toBeTruthy()
    expect(screen.getByText('disabled')).toBeTruthy()
    expect(
      screen.getByText((content) =>
        content.includes('In-App Browser Preview is currently disabled by feature flag'),
      ),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Preview URL')).toBeNull()
  })

  it('renders interactive workspace when forceEnabled=true even if flag is false', () => {
    setAroFeature('inAppBrowserPreview', false)

    render(<AroBrowserPreview forceEnabled={true} />)

    expect(screen.getByLabelText('Preview URL')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy()
    expect(screen.getByText('No page open')).toBeTruthy()
  })

  it('switches between responsive viewports (Desktop, Tablet, Mobile)', () => {
    render(<AroBrowserPreview forceEnabled={true} />)

    const tabletBtn = screen.getByLabelText('Tablet (768px) viewport')
    const mobileBtn = screen.getByLabelText('Mobile (390px) viewport')
    const desktopBtn = screen.getByLabelText('Desktop viewport')

    expect(desktopBtn.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(tabletBtn)
    expect($previewViewport.get()).toBe('tablet')

    fireEvent.click(mobileBtn)
    expect($previewViewport.get()).toBe('mobile')

    fireEvent.click(desktopBtn)
    expect($previewViewport.get()).toBe('desktop')
  })

  it('launches local dev-server presets via quick chips', () => {
    render(<AroBrowserPreview forceEnabled={true} />)

    const viteChip = screen.getByRole('button', { name: 'Launch :5173' })
    fireEvent.click(viteChip)

    const iframe = screen.getByTitle('localhost preview') as HTMLIFrameElement
    expect(iframe).toBeTruthy()
    expect(iframe.src).toBe('http://localhost:5173/')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-same-origin')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('navigates to typed valid URL and normalizes protocol', () => {
    render(<AroBrowserPreview forceEnabled={true} />)

    const input = screen.getByLabelText('Preview URL')
    fireEvent.change(input, { target: { value: 'aro.dev/preview' } })

    const openBtn = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openBtn)

    const iframe = screen.getByTitle('aro.dev preview') as HTMLIFrameElement
    expect(iframe).toBeTruthy()
    expect(iframe.src).toBe('https://aro.dev/preview')
  })

  it('rejects invalid schemes with inline error alert and prevents iframe render', () => {
    render(<AroBrowserPreview forceEnabled={true} />)

    const input = screen.getByLabelText('Preview URL')
    fireEvent.change(input, { target: { value: 'javascript:alert("pwn")' } })

    const openBtn = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openBtn)

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Enter a valid HTTP or HTTPS URL.')).toBeTruthy()
    expect(screen.queryByTitle(/preview/)).toBeNull()
  })

  it('manages tab strip: creates new tabs, switches tabs, and never leaves zero tabs', () => {
    render(<AroBrowserPreview forceEnabled={true} />)

    const newTabBtn = screen.getByLabelText('New browser tab')
    fireEvent.click(newTabBtn)

    expect($previewTabs.get().length).toBeGreaterThanOrEqual(2)

    // Close buttons exist for each tab
    const closeBtns = screen.getAllByLabelText(/Close /)
    fireEvent.click(closeBtns[0])

    // Clean persistence maintains at least 1 tab
    expect($previewTabs.get().length).toBeGreaterThanOrEqual(1)
  })

  it('triggers reload and external browser opening with safe flags', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const initialTab = localBrowserPreviewAdapter.makeTab('https://example.com/app')

    render(
      <AroBrowserPreview
        forceEnabled={true}
        overrideTabs={[initialTab]}
        overrideViewport="tablet"
      />,
    )

    const reloadBtn = screen.getByLabelText('Reload preview')
    fireEvent.click(reloadBtn)

    const externalBtn = screen.getByLabelText('Open externally')
    fireEvent.click(externalBtn)

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/app',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('copies active URL to clipboard with confirmation', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    })

    const initialTab = localBrowserPreviewAdapter.makeTab('http://localhost:3000')

    render(
      <AroBrowserPreview
        forceEnabled={true}
        overrideTabs={[initialTab]}
      />,
    )

    const copyBtn = screen.getByLabelText('Copy preview URL')
    fireEvent.click(copyBtn)

    expect(writeTextSpy).toHaveBeenCalledWith('http://localhost:3000/')
    expect(screen.getByLabelText('Copied URL!')).toBeTruthy()
  })
})
