import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DialogTemplate,
  FormPageTemplate,
  ListPageTemplate,
  MasterDetailOverlayTemplate,
  PageTemplate,
  SettingsSubpageTemplate,
  StateBox,
} from '../templates'

afterEach(cleanup)

describe('Template fixtures', () => {
  it('renders PageTemplate with title, actions, and sections', () => {
    render(
      <PageTemplate
        actions={<button>New</button>}
        description="Overview of your workspace"
        title="Workspace Overview"
      >
        <div>Content block</div>
      </PageTemplate>
    )
    expect(screen.getByRole('heading', { name: 'Workspace Overview' })).toBeTruthy()
    expect(screen.getByText('Overview of your workspace')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New' })).toBeTruthy()
    expect(screen.getByText('Content block')).toBeTruthy()
  })

  it('renders ListPageTemplate with items and handles search input', () => {
    const onSearch = vi.fn()
    render(
      <ListPageTemplate
        items={[
          { title: 'Project Aro', description: 'Main desktop port' },
          { title: 'Agent Core', description: 'Underlying runner' },
        ]}
        onSearchChange={onSearch}
        title="Projects"
      />
    )
    expect(screen.getByText('Project Aro')).toBeTruthy()
    expect(screen.getByText('Agent Core')).toBeTruthy()
    const search = screen.getByPlaceholderText('Search items…')
    fireEvent.change(search, { target: { value: 'Aro' } })
    expect(onSearch).toHaveBeenCalledWith('Aro')
  })

  it('renders FormPageTemplate with submit and reset action bar', () => {
    const onSubmit = vi.fn(e => e.preventDefault())
    const onReset = vi.fn()
    render(
      <FormPageTemplate
        onReset={onReset}
        onSubmit={onSubmit}
        primaryActionLabel="Save Workspace"
        title="Edit Workspace"
      >
        <div>Form fields</div>
      </FormPageTemplate>
    )
    expect(screen.getByRole('button', { name: 'Save Workspace' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalled()
  })

  it('renders MasterDetailOverlayTemplate with nav items and detail pane', () => {
    const onSelect = vi.fn()
    const DummyIcon = () => <span data-testid="dummy-icon" />
    render(
      <MasterDetailOverlayTemplate
        detailDescription="Manage personal access tokens"
        detailTitle="API Keys"
        navItems={[
          { id: 'keys', label: 'API Keys', icon: DummyIcon, active: true, onClick: onSelect },
          { id: 'models', label: 'Models', icon: DummyIcon, active: false, onClick: onSelect },
        ]}
      >
        <div>Keys list</div>
      </MasterDetailOverlayTemplate>
    )
    expect(screen.getByText('API Keys', { selector: 'h1' })).toBeTruthy()
    expect(screen.getByText('Models')).toBeTruthy()
    expect(screen.getByText('Keys list')).toBeTruthy()
  })

  it('renders SettingsSubpageTemplate with breadcrumbs and actions when dirty', () => {
    const onSave = vi.fn()
    const { rerender } = render(
      <SettingsSubpageTemplate
        breadcrumb={<span>Settings / Appearance</span>}
        isDirty={false}
        onSave={onSave}
        title="Appearance"
      >
        <div>Theme settings</div>
      </SettingsSubpageTemplate>
    )
    expect(screen.getByText('Settings / Appearance')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()

    rerender(
      <SettingsSubpageTemplate
        breadcrumb={<span>Settings / Appearance</span>}
        isDirty={true}
        onSave={onSave}
        title="Appearance"
      >
        <div>Theme settings</div>
      </SettingsSubpageTemplate>
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('renders DialogTemplate with header, body, and footer actions', () => {
    const onClose = vi.fn()
    render(
      <DialogTemplate
        description="Are you sure you want to delete this session?"
        destructiveAction={<button>Confirm Delete</button>}
        onClose={onClose}
        secondaryAction={<button>Cancel</button>}
        title="Delete Session"
      >
        <div>Session details will be wiped.</div>
      </DialogTemplate>
    )
    expect(screen.getByText('Delete Session')).toBeTruthy()
    expect(screen.getByText('Confirm Delete')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders StateBox across loading, empty, and error states without shift', () => {
    const { rerender } = render(
      <StateBox state="loading" title="Loading items…" />
    )
    expect(screen.getByText('Loading items…')).toBeTruthy()

    rerender(
      <StateBox
        action={<button>Create Item</button>}
        description="Add your first item below"
        state="empty"
        title="No items found"
      />
    )
    expect(screen.getByText('No items found')).toBeTruthy()
    expect(screen.getByText('Add your first item below')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeTruthy()

    rerender(
      <StateBox
        action={<button>Retry</button>}
        description="Network error"
        state="error"
        title="Failed to load"
      />
    )
    expect(screen.getByText('Failed to load')).toBeTruthy()
    expect(screen.getByText('Network error')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
