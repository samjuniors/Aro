import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn (tailwind-merge with Aro theme keys)', () => {
  it('lets a later role radius replace an earlier one', () => {
    expect(cn('rounded-control', 'rounded-panel')).toBe('rounded-panel')
    expect(cn('rounded-panel', 'rounded-overlay')).toBe('rounded-overlay')
  })

  it('lets rounded-full and rounded-none override a role radius', () => {
    expect(cn('rounded-control', 'rounded-full')).toBe('rounded-full')
    expect(cn('rounded-panel', 'rounded-none')).toBe('rounded-none')
  })

  it('treats side variants per side', () => {
    expect(cn('rounded-t-control', 'rounded-t-panel', 'rounded-b-control')).toBe('rounded-t-panel rounded-b-control')
  })

  it('keeps an Aro size class next to a text color class (either order)', () => {
    expect(cn('text-aro-xs', 'text-muted-foreground')).toBe('text-aro-xs text-muted-foreground')
    expect(cn('text-muted-foreground', 'text-aro-xs')).toBe('text-muted-foreground text-aro-xs')
  })

  it('lets a later size replace an earlier one, including stock sizes', () => {
    expect(cn('text-aro-xs', 'text-aro-sm')).toBe('text-aro-sm')
    expect(cn('text-sm', 'text-aro-xs')).toBe('text-aro-xs')
  })

  it('merges Aro shadows as shadows, not shadow colors', () => {
    expect(cn('shadow-aro-e1', 'shadow-aro-e3')).toBe('shadow-aro-e3')
    expect(cn('shadow-nous', 'shadow-none')).toBe('shadow-none')
  })
})
