import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceLaunchpad } from './launchpad'

describe('WorkspaceLaunchpad', () => {
  afterEach(cleanup)

  it('describes its workspace-tool search and explains empty results', () => {
    render(<WorkspaceLaunchpad />)

    const search = screen.getByRole('textbox', { name: 'Search workspace tools' })
    expect(search.getAttribute('placeholder')).toBe('Search workspace tools…')

    fireEvent.change(search, { target: { value: 'README' } })

    expect(screen.getByRole('status').textContent).toBe('No workspace tools match “README”.')
  })

  it('filters and opens a matching workspace tool', () => {
    render(<WorkspaceLaunchpad />)

    const search = screen.getByRole('textbox', { name: 'Search workspace tools' })
    fireEvent.change(search, { target: { value: 'Terminal' } })

    expect(screen.getByRole('button', { name: 'Terminal' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
  })

  it('filters and triggers Side Chat tool action', async () => {
    const { $newSideChatAction } = await import('@/components/pane-shell/tree/store')
    const sideChatSpy = vi.fn()
    $newSideChatAction.set(sideChatSpy)

    render(<WorkspaceLaunchpad />)

    const search = screen.getByRole('textbox', { name: 'Search workspace tools' })
    fireEvent.change(search, { target: { value: 'Side Chat' } })

    const sideChatBtn = screen.getByRole('button', { name: 'Side Chat' })
    expect(sideChatBtn).toBeTruthy()
    fireEvent.click(sideChatBtn)

    expect(sideChatSpy).toHaveBeenCalled()
    $newSideChatAction.set(null)
  })
})
