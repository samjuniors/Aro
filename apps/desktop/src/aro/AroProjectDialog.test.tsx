import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type * as Nanostores from 'nanostores'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AroProjectDialog } from './AroProjectDialog'

afterEach(cleanup)

const {
  $newProjectDropPlacement,
  $projectDialog,
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
    $projectDialog.set({ mode: 'create' })
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
})
