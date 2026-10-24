import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { ListRow } from './list-row'

afterEach(cleanup)

it('activates an enabled row with either keyboard action but not when disabled', () => {
  const onClick = vi.fn()
  const { getByRole, rerender } = render(<ListRow onClick={onClick} title="Preferences" />)
  const row = getByRole('button', { name: 'Preferences' })
  fireEvent.keyDown(row, { key: 'Enter' })
  fireEvent.keyDown(row, { key: ' ' })
  expect(onClick).toHaveBeenCalledTimes(2)
  rerender(<ListRow disabled onClick={onClick} title="Preferences" />)
  fireEvent.keyDown(row, { key: 'Enter' })
  fireEvent.click(row)
  expect(onClick).toHaveBeenCalledTimes(2)
})

it('leaves nested controls and prevented keyboard events to their owners', () => {
  const onClick = vi.fn()

  const { getByRole } = render(
    <ListRow action={<button>More</button>} onClick={onClick} onKeyDown={event => {
      if (event.key === 'Enter') {event.preventDefault()}
    }} title="Preferences" />
  )

  fireEvent.keyDown(getByRole('button', { name: 'More' }), { key: ' ' })
  fireEvent.keyDown(getByRole('button', { name: 'Preferences More' }), { key: 'Enter' })
  expect(onClick).not.toHaveBeenCalled()
})
