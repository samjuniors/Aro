import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ActionBar,
  FormRow,
  Inline,
  PageHeader,
  PageShell,
  Section,
  Stack,
  Toolbar,
} from '../layout'

afterEach(cleanup)

describe('Layout primitives', () => {
  it('renders PageShell with default and variant max-width classes', () => {
    const { container, rerender } = render(
      <PageShell data-testid="shell">Content</PageShell>
    )
    expect(screen.getByTestId('shell')).toBeTruthy()
    expect(container.querySelector('.max-w-\\[75rem\\]')).not.toBeNull()

    rerender(
      <PageShell data-testid="shell" variant="narrow">
        Content
      </PageShell>
    )
    expect(container.querySelector('.max-w-\\[40rem\\]')).not.toBeNull()

    rerender(
      <PageShell data-testid="shell" variant="wide">
        Content
      </PageShell>
    )
    expect(container.querySelector('.max-w-\\[90rem\\]')).not.toBeNull()
  })

  it('renders PageHeader with title, description, actions, and meta', () => {
    render(
      <PageHeader
        actions={<button>Action</button>}
        description="Subtitle description"
        meta={<span>v1.0</span>}
        title="Settings"
      />
    )
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('Subtitle description')).toBeTruthy()
    expect(screen.getByText('v1.0')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Action' })).toBeTruthy()
  })

  it('renders Section with card and flat variants', () => {
    const { container, rerender } = render(
      <Section aside={<button>Edit</button>} title="Profile" variant="card">
        <div>Section Body</div>
      </Section>
    )
    expect(screen.getByText('Profile')).toBeTruthy()
    expect(screen.getByText('Section Body')).toBeTruthy()
    expect(container.querySelector('.rounded-panel')).not.toBeNull()

    rerender(
      <Section title="Profile" variant="flat">
        <div>Flat Body</div>
      </Section>
    )
    expect(container.querySelector('.border-b')).not.toBeNull()
  })

  it('renders FormRow with label, description, error, and aside', () => {
    render(
      <FormRow
        aside={<span>(auto)</span>}
        description="Your working directory"
        error="Directory not found"
        label="Workspace Path"
        required
      >
        <input placeholder="/path" />
      </FormRow>
    )
    expect(screen.getByText('Workspace Path')).toBeTruthy()
    expect(screen.getByText('*')).toBeTruthy()
    expect(screen.getByText('Your working directory')).toBeTruthy()
    expect(screen.getByText('Directory not found')).toBeTruthy()
    expect(screen.getByText('(auto)')).toBeTruthy()
  })

  it('renders Stack and Inline with proper gap scale classes', () => {
    const { container: stackContainer } = render(
      <Stack gap={6}>
        <div>A</div>
        <div>B</div>
      </Stack>
    )
    const stackEl = stackContainer.firstElementChild as HTMLElement
    expect(stackEl.className).toContain('gap-6')
    expect(stackEl.className).toContain('flex-col')

    const { container: inlineContainer } = render(
      <Inline gap={2} wrap>
        <span>Tag 1</span>
        <span>Tag 2</span>
      </Inline>
    )
    const inlineEl = inlineContainer.firstElementChild as HTMLElement
    expect(inlineEl.className).toContain('gap-2')
    expect(inlineEl.className).toContain('flex-row')
    expect(inlineEl.className).toContain('flex-wrap')
  })

  it('renders Toolbar and ActionBar with proper semantic placement', () => {
    render(
      <Toolbar
        end={<button>Export</button>}
        start={<input placeholder="Search..." />}
      />
    )
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy()

    render(
      <ActionBar
        destructive={<button>Delete</button>}
        primary={<button>Save</button>}
        secondary={<button>Cancel</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })
})
