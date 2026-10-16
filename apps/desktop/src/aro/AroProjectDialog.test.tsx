import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type * as Nanostores from 'nanostores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AroProjectDialog } from './AroProjectDialog'
import { isFolderTrusted, resetTrustedFolders, trustFolder } from './folder-trust'

afterEach(cleanup)

const {
  $newProjectDropPlacement,
  $projectDialog,
  $projects,
  addProjectFolder,
  clearNewProjectDropPlacement,
  closeProjectDialog,
  createProject,
  enterProject,
  followEnteredProjectCwd,
  pickProjectFolder,
  projectIdForCwd,
  refreshProjectTree,
  renameProject
} = vi.hoisted(() => {
  const { atom } = require('nanostores') as typeof Nanostores

  return {
    $newProjectDropPlacement: atom<{ anchor: string; before?: null | string; dir: string } | null>(null),
    $projectDialog: atom<{ mode: 'create' | 'rename' | 'add-folder'; name?: string; projectId?: string } | null>({
      mode: 'create'
    }),
    $projects: atom<Array<{ id: string }>>([]),
    addProjectFolder: vi.fn(),
    clearNewProjectDropPlacement: vi.fn(),
    closeProjectDialog: vi.fn(),
    createProject: vi.fn(),
    enterProject: vi.fn(),
    followEnteredProjectCwd: vi.fn(),
    pickProjectFolder: vi.fn(),
    projectIdForCwd: vi.fn(),
    refreshProjectTree: vi.fn(),
    renameProject: vi.fn()
  }
})

vi.mock('@/store/projects', () => ({
  $newProjectDropPlacement,
  $projectDialog,
  $projects,
  addProjectFolder,
  clearNewProjectDropPlacement,
  closeProjectDialog,
  createProject,
  enterProject,
  followEnteredProjectCwd,
  pickProjectFolder,
  projectIdForCwd,
  refreshProjectTree,
  renameProject
}))

vi.mock('@/lib/desktop-git', () => ({
  desktopGit: () => ({
    repoStatus: vi.fn().mockResolvedValue({})
  })
}))

vi.mock('@/store/notifications', () => ({
  notify: vi.fn(),
  notifyError: vi.fn()
}))

describe('AroProjectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetTrustedFolders()
    trustFolder('/home/user/my-repo')
    $projectDialog.set({ mode: 'create' })
    $projects.set([])
    createProject.mockResolvedValue({ id: 'p_created' })
    pickProjectFolder.mockResolvedValue('/home/user/my-repo')
    projectIdForCwd.mockReturnValue(null)
  })

  it('renders create mode and closes on cancel', () => {
    render(<AroProjectDialog />)

    expect(screen.getByRole('heading', { name: 'Create project' })).toBeDefined()
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)
    expect(closeProjectDialog).toHaveBeenCalled()
  })

  it('creates project with auto-populated name from folder and calls enterProject + followEnteredProjectCwd', async () => {
    render(<AroProjectDialog />)

    const pickBtn = screen.getByRole('button', { name: 'Choose a local folder' })
    fireEvent.click(pickBtn)

    await screen.findByDisplayValue('my-repo')
    const createBtn = screen.getByRole('button', { name: 'Create project' })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          folders: ['/home/user/my-repo'],
          name: 'my-repo'
        })
      )
      expect(enterProject).toHaveBeenCalledWith('p_created')
      expect(followEnteredProjectCwd).toHaveBeenCalledWith('/home/user/my-repo')
      expect(closeProjectDialog).toHaveBeenCalled()
    })
  })

  it('opens existing project if chosen folder already belongs to one', async () => {
    $projects.set([{ id: 'p_existing' }])
    projectIdForCwd.mockReturnValue('p_existing')
    render(<AroProjectDialog />)

    const pickBtn = screen.getByRole('button', { name: 'Choose a local folder' })
    fireEvent.click(pickBtn)

    await screen.findByDisplayValue('my-repo')
    const createBtn = screen.getByRole('button', { name: 'Create project' })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(createProject).not.toHaveBeenCalled()
      expect(enterProject).toHaveBeenCalledWith('p_existing')
      expect(followEnteredProjectCwd).toHaveBeenCalledWith('/home/user/my-repo')
      expect(closeProjectDialog).toHaveBeenCalled()
    })
  })

  it('promotes an auto-discovered repo into a named sidebar project', async () => {
    projectIdForCwd.mockReturnValue('/home/user/my-repo')
    render(<AroProjectDialog />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose a local folder' }))
    await screen.findByDisplayValue('my-repo')
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ folders: ['/home/user/my-repo'], name: 'my-repo' })
      )
      expect(enterProject).toHaveBeenCalledWith('p_created')
      expect(closeProjectDialog).toHaveBeenCalled()
    })
  })

  it('allows picking an accent color and removes a folder', async () => {
    render(<AroProjectDialog />)

    const skyColor = screen.getByRole('button', { name: 'Select Sky color' })
    fireEvent.click(skyColor)

    const pickBtn = screen.getByRole('button', { name: 'Choose a local folder' })
    fireEvent.click(pickBtn)
    await screen.findByText('/home/user/my-repo')

    const removeBtn = screen.getByRole('button', { name: 'Remove my-repo' })
    fireEvent.click(removeBtn)
    expect(screen.queryByText('/home/user/my-repo')).toBeNull()
  })

  it('supports rename mode', async () => {
    $projectDialog.set({ mode: 'rename', name: 'Old Name', projectId: 'p_123' })
    render(<AroProjectDialog />)

    expect(screen.getByText('Rename project')).toBeDefined()
    const input = screen.getByDisplayValue('Old Name')
    fireEvent.change(input, { target: { value: 'New Name' } })

    const saveBtn = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(renameProject).toHaveBeenCalledWith('p_123', 'New Name')
      expect(closeProjectDialog).toHaveBeenCalled()
    })
  })

  it('prompts for folder trust when folder is untrusted and creates project upon confirmation', async () => {
    resetTrustedFolders()
    pickProjectFolder.mockResolvedValue('/untrusted/new-code')
    render(<AroProjectDialog />)

    const pickBtn = screen.getByRole('button', { name: 'Choose a local folder' })
    fireEvent.click(pickBtn)

    await screen.findByDisplayValue('new-code')
    const createBtn = screen.getByRole('button', { name: 'Create project' })
    fireEvent.click(createBtn)

    // Trust dialog appears
    await screen.findByRole('heading', { name: 'Trust this folder?' })
    expect(screen.getByText('/untrusted/new-code')).toBeDefined()
    expect(screen.getByText(/Read & Inspect:/)).toBeDefined()
    expect(screen.getByText(/Execute:/)).toBeDefined()
    expect(createProject).not.toHaveBeenCalled()

    // Confirm trust
    const trustBtn = screen.getByRole('button', { name: 'Trust folder' })
    fireEvent.click(trustBtn)

    await waitFor(() => {
      expect(isFolderTrusted('/untrusted/new-code')).toBe(true)
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          folders: ['/untrusted/new-code'],
          name: 'new-code'
        })
      )
    })
  })

  it('cancels out of folder trust without creating project', async () => {
    resetTrustedFolders()
    pickProjectFolder.mockResolvedValue('/untrusted/danger-code')
    render(<AroProjectDialog />)

    const pickBtn = screen.getByRole('button', { name: 'Choose a local folder' })
    fireEvent.click(pickBtn)

    await screen.findByDisplayValue('danger-code')
    const createBtn = screen.getByRole('button', { name: 'Create project' })
    fireEvent.click(createBtn)

    await screen.findByRole('heading', { name: 'Trust this folder?' })

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)

    // Returns to Create project view without creating
    expect(screen.getByRole('heading', { name: 'Create project' })).toBeDefined()
    expect(createProject).not.toHaveBeenCalled()
    expect(isFolderTrusted('/untrusted/danger-code')).toBe(false)
  })
})
