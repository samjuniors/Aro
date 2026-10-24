import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { Button } from './button'

afterEach(cleanup)

it('preserves the action name while loading and blocks repeat activation', () => {
  const onClick = vi.fn()
  const { getByRole, rerender } = render(<Button onClick={onClick}>Save changes</Button>)

  fireEvent.click(getByRole('button', { name: 'Save changes' }))
  expect(onClick).toHaveBeenCalledTimes(1)

  rerender(<Button loading onClick={onClick}>Save changes</Button>)

  const button = getByRole('button', { name: 'Save changes' })
  expect(button.getAttribute('aria-busy')).toBe('true')
  fireEvent.click(button)
  expect(onClick).toHaveBeenCalledTimes(1)

  rerender(<Button onClick={onClick}>Save changes</Button>)
  fireEvent.click(getByRole('button', { name: 'Save changes' }))
  expect(onClick).toHaveBeenCalledTimes(2)
})
