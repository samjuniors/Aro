import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $rules } from '@/adapters'
import { readKey, writeKey } from '@/lib/storage'

import { AroRulesPage, DISABLED_RULES_STORAGE_KEY } from './RulesView'

describe('AroRulesPage (RulesView.tsx)', () => {
  beforeEach(() => {
    // Reset rules and storage
    $rules.set([])
    writeKey(DISABLED_RULES_STORAGE_KEY, null)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders page header, stats, add form and honest empty state when rules are empty', () => {
    render(<AroRulesPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Global Rules' })).toBeDefined()
    expect(screen.getByText('No global rules added')).toBeDefined()
    expect(screen.getByText('local adapter')).toBeDefined()
    expect(screen.getAllByText('conductor.workspace.v3.rules').length).toBeGreaterThan(0)

    // Add rule input & button
    expect(
      screen.getByPlaceholderText(/Always write TypeScript with explicit return types/)
    ).toBeDefined()
    const addBtn = screen.getByRole('button', { name: 'Add Rule' }) as HTMLButtonElement
    expect(addBtn.disabled).toBe(true)
  })

  it('adds a valid rule, persists it, and renders it in the list', () => {
    render(<AroRulesPage />)

    const input = screen.getByPlaceholderText(/Always write TypeScript with explicit return types/)
    fireEvent.change(input, { target: { value: 'Enforce strict linting across all files' } })

    const addBtn = screen.getByRole('button', { name: 'Add Rule' }) as HTMLButtonElement
    expect(addBtn.disabled).toBe(false)
    fireEvent.click(addBtn)

    expect($rules.get()).toEqual(['Enforce strict linting across all files'])
    expect(screen.getByText('Enforce strict linting across all files')).toBeDefined()
    expect(screen.getByText('Active')).toBeDefined()
  })

  it('prevents adding empty/whitespace or duplicate rules with clear validation errors', () => {
    $rules.set(['Rule number one'])
    render(<AroRulesPage />)

    const input = screen.getByPlaceholderText(/Always write TypeScript with explicit return types/)

    // Try adding duplicate
    fireEvent.change(input, { target: { value: 'Rule number one' } })
    const addBtn = screen.getByRole('button', { name: 'Add Rule' }) as HTMLButtonElement
    fireEvent.click(addBtn)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('This exact instruction already exists.')
    expect($rules.get()).toHaveLength(1)

    // Whitespace only
    fireEvent.change(input, { target: { value: '   ' } })
    expect(addBtn.disabled).toBe(true)
  })

  it('supports inline editing and distinguishes saved rules from unsaved edits', () => {
    $rules.set(['Initial rule instruction'])
    render(<AroRulesPage />)

    expect(screen.getByText('Initial rule instruction')).toBeDefined()

    // Click edit button
    const editBtn = screen.getByRole('button', { name: 'Edit rule' })
    fireEvent.click(editBtn)

    expect(screen.getByText('EDITING RULE #1')).toBeDefined()
    expect(screen.getByText('Saved state')).toBeDefined()

    // Change draft to trigger unsaved state
    const editInput = screen.getByDisplayValue('Initial rule instruction')
    fireEvent.change(editInput, { target: { value: 'Modified rule instruction' } })

    // Unsaved edits indicator
    expect(screen.getByText('Unsaved edits')).toBeDefined()
    expect(screen.getByText('Unsaved edits pending')).toBeDefined()

    // Save changes
    const saveBtn = screen.getByRole('button', { name: 'Save Changes' })
    fireEvent.click(saveBtn)

    expect($rules.get()).toEqual(['Modified rule instruction'])
    expect(screen.getByText('Modified rule instruction')).toBeDefined()
    expect(screen.queryByText('Unsaved edits pending')).toBeNull()
  })

  it('allows canceling an inline edit without mutating the saved rule', () => {
    $rules.set(['Original persistent rule'])
    render(<AroRulesPage />)

    const editBtn = screen.getByRole('button', { name: 'Edit rule' })
    fireEvent.click(editBtn)

    const editInput = screen.getByDisplayValue('Original persistent rule')
    fireEvent.change(editInput, { target: { value: 'Aborted change' } })

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)

    expect($rules.get()).toEqual(['Original persistent rule'])
    expect(screen.getByText('Original persistent rule')).toBeDefined()
    expect(screen.queryByText('Aborted change')).toBeNull()
  })

  it('supports enabling and disabling rules with persistence', () => {
    $rules.set(['Rule to be toggled'])
    render(<AroRulesPage />)

    const toggleBtn = screen.getByRole('button', { name: 'Disable' })
    fireEvent.click(toggleBtn)

    // Verify disabled UI state
    expect(screen.getByText('Disabled')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Enable' })).toBeDefined()

    // Verify storage persistence
    const stored = readKey(DISABLED_RULES_STORAGE_KEY)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toContain('Rule to be toggled')

    // Re-enable
    const enableBtn = screen.getByRole('button', { name: 'Enable' })
    fireEvent.click(enableBtn)
    expect(screen.getByText('Active')).toBeDefined()
    expect(JSON.parse(readKey(DISABLED_RULES_STORAGE_KEY)!)).not.toContain('Rule to be toggled')
  })

  it('removes a rule via the delete button and updates store & storage', () => {
    $rules.set(['First rule', 'Second rule to delete'])
    render(<AroRulesPage />)

    const deleteButtons = screen.getAllByRole('button', { name: 'Remove rule' })
    expect(deleteButtons).toHaveLength(2)

    fireEvent.click(deleteButtons[1])

    expect($rules.get()).toEqual(['First rule'])
    expect(screen.queryByText('Second rule to delete')).toBeNull()
    expect(screen.getByText('First rule')).toBeDefined()
  })

  it('filters rules by search term and status tabs', () => {
    $rules.set(['TypeScript coding standards', 'Git commit message convention'])
    render(<AroRulesPage />)

    const searchInput = screen.getByPlaceholderText('Search rules...')
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } })

    expect(screen.getByText('TypeScript coding standards')).toBeDefined()
    expect(screen.queryByText('Git commit message convention')).toBeNull()
  })

  it('renders clear runtime boundary notice explaining rules are stored locally and not injected into Hermes agent execution', () => {
    render(<AroRulesPage />)

    expect(
      screen.getByText('Locally Saved Rules (Not Injected into Hermes Runtime)')
    ).toBeDefined()
    expect(screen.getByText('local storage only')).toBeDefined()
    expect(
      screen.getByText(/Active Hermes agent instructions are configured via Profile SOUL.md/i)
    ).toBeDefined()
    expect(screen.getByText('Locally enabled (not in Hermes)')).toBeDefined()
  })
})

