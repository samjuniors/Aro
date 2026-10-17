/**
 * ARO PROJECT DIALOG — Project Creation, Renaming & Folder Setup
 *
 * Implements 100% visual parity with the Aro Workbench prototype
 * (prototype/src/workbench/components/ProjectDialog.tsx), wired to
 * Hermes Electron engine and projects store.
 */

import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'

import { desktopGit } from '@/lib/desktop-git'
import { cn } from '@/lib/utils'
import { notify, notifyError } from '@/store/notifications'
import {
  $newProjectDropPlacement,
  $projects,
  $projectDialog,
  addProjectFolder,
  clearNewProjectDropPlacement,
  closeProjectDialog,
  createProject,
  enterProject,
  followEnteredProjectCwd,
  pickProjectFolder,
  projectIdForCwd,
  refreshProjects,
  refreshProjectTree,
  renameProject
} from '@/store/projects'
import {
  $selectedStoredSessionId,
  commitWorkspaceCwdForSelectedSession,
  setCurrentCwd,
  setNewChatWorkspaceTarget,
  setSessions
} from '@/store/session'

import { isFolderTrusted, trustFolder } from './folder-trust'
import { IconCheck, IconFolder, IconPlus, IconShield, IconX } from './Icons'
import { assignSessionToProject, setAroDraftProject } from './project-session-map'
import { Button, Modal } from './ui'

export const ARO_PROJECT_COLORS = [
  { label: 'Violet', value: '#818cf8' },
  { label: 'Sky', value: '#38bdf8' },
  { label: 'Rose', value: '#fb7185' },
  { label: 'Mint', value: '#34d399' },
  { label: 'Amber', value: '#fbbf24' },
  { label: 'Pink', value: '#f472b6' }
]

export function AroProjectDialog() {
  const state = useStore($projectDialog)
  const open = state !== null
  const mode = state?.mode ?? 'create'

  const [name, setName] = useState('')
  const [color, setColor] = useState(ARO_PROJECT_COLORS[0].value)
  const [folders, setFolders] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingTrustFolder, setPendingTrustFolder] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const activateProject = (projectId: string, folder?: string) => {
    enterProject(projectId)
    setAroDraftProject(projectId)

    const target = folder?.trim() || ''

    if (target) {
      setCurrentCwd(target)
      setNewChatWorkspaceTarget(target)
      followEnteredProjectCwd(target)
    }

    const selectedSessionId = $selectedStoredSessionId.get()
    if (selectedSessionId) {
      void assignSessionToProject(selectedSessionId, projectId)
      setSessions(prev => prev.map(session => session.id === selectedSessionId ? { ...session, cwd: target || null } : session))
      if (target) {
        commitWorkspaceCwdForSelectedSession(target)
      }
    }
  }

  useEffect(() => {
    if (open) {
      setName(state?.name ?? '')
      setColor(ARO_PROJECT_COLORS[0].value)
      setFolders(state?.folder ? [state.folder] : [])
      setError('')
      setSubmitting(false)
      setPendingTrustFolder(null)
      const timer = window.setTimeout(() => nameInputRef.current?.focus(), 80)

      return () => window.clearTimeout(timer)
    } else {
      setPendingTrustFolder(null)
      clearNewProjectDropPlacement()
    }
  }, [open, state?.folder, state?.name])

  const executeAddFolder = async (dir: string) => {
    if (!state?.projectId) return
    setSubmitting(true)

    try {
      await addProjectFolder(state.projectId, dir)
      const target = dir.trim()
      if (target) {
        setCurrentCwd(target)
        setNewChatWorkspaceTarget(target)
        followEnteredProjectCwd(target)
        const selectedSessionId = $selectedStoredSessionId.get()
        if (selectedSessionId) {
          commitWorkspaceCwdForSelectedSession(target)
          setSessions(prev => prev.map(session => session.id === selectedSessionId ? { ...session, cwd: target || null } : session))
        }
      }
      closeProjectDialog()
      notify({ kind: 'info', message: 'Folder added to project' })
    } finally {
      setSubmitting(false)
    }
  }

  const executeCreateProject = async (trimmed: string, projectFolders: string[], projectColor: string) => {
    setSubmitting(true)

    try {
      const folder = projectFolders[0]
      const dropPlacement = $newProjectDropPlacement.get() ?? undefined

      const existingId = folder ? projectIdForCwd(folder) : null
      const isExistingProject = existingId && $projects.get().some(project => project.id === existingId)

      if (existingId && isExistingProject) {
        activateProject(existingId, folder)
        closeProjectDialog()
        notify({ kind: 'info', message: 'Opened existing project' })
        return
      }

      const created = await createProject({
        name: trimmed,
        color: projectColor,
        folders: projectFolders,
        primaryPath: folder || undefined,
        use: true,
        dropPlacement
      })

      if (created) {
        const projectRoot = created.primary_path || created.folders?.[0]?.path || folder
        activateProject(created.id, projectRoot)
        notify({ kind: 'info', message: `Project '${trimmed}' created` })

        if (projectRoot) {
          void desktopGit()
            ?.repoStatus(projectRoot)
            .then(() => refreshProjectTree())
            .catch(() => undefined)
        }
      }

      closeProjectDialog()
      clearNewProjectDropPlacement()
      void Promise.all([
        refreshProjects().catch(() => {}),
        refreshProjectTree().catch(() => {})
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePickFolder = async () => {
    setError('')

    try {
      const dir = await pickProjectFolder()

      if (!dir) {return}

      if (mode === 'add-folder' && state?.projectId) {
        if (!isFolderTrusted(dir)) {
          setPendingTrustFolder(dir)
          return
        }

        await executeAddFolder(dir)
        return
      }

      setFolders(prev => (prev.includes(dir) ? prev : [...prev, dir]))

      // Auto-populate name if empty
      if (mode === 'create' && !name.trim()) {
        const base = dir.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || dir
        setName(base)
      }
    } catch (err) {
      notifyError(err, 'Failed to select folder')
    }
  }

  const handleRemoveFolder = (folderToRemove: string) => {
    setFolders(prev => prev.filter(f => f !== folderToRemove))
  }

  const handleConfirmTrust = async () => {
    if (!pendingTrustFolder) return
    const folder = pendingTrustFolder
    trustFolder(folder)
    setPendingTrustFolder(null)

    if (mode === 'add-folder') {
      await executeAddFolder(folder)
    } else if (mode === 'create') {
      const trimmed = name.trim()
      await executeCreateProject(trimmed, folders, color)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (mode === 'rename') {
      if (!trimmed || !state?.projectId) {return}
      setSubmitting(true)

      try {
        await renameProject(state.projectId, trimmed)
        closeProjectDialog()
        notify({ kind: 'info', message: 'Project renamed' })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSubmitting(false)
      }

      return
    }

    if (mode === 'create') {
      if (!trimmed) {
        setError('Please enter a project name')
        nameInputRef.current?.focus()

        return
      }

      if (folders.length === 0) {
        setError('Please select a local folder for this project')
        void handlePickFolder()

        return
      }

      const folder = folders[0]
      if (folder && !isFolderTrusted(folder)) {
        setPendingTrustFolder(folder)
        return
      }

      await executeCreateProject(trimmed, folders, color)
    }
  }

  const title =
    pendingTrustFolder
      ? 'Trust this folder?'
      : mode === 'rename'
        ? 'Rename project'
        : mode === 'add-folder'
          ? 'Add source folder'
          : 'Create project'

  const sub =
    pendingTrustFolder
      ? 'Aro Agent requires read, edit, and execution access to files in this directory.'
      : mode === 'create'
        ? 'Projects organize your code repos, sessions, and workspaces together.'
        : undefined

  return (
    <Modal
      onClose={closeProjectDialog}
      open={open}
      sub={sub}
      title={title}
      width={520}
    >
      {pendingTrustFolder ? (
        <div className="p-5 pt-3 space-y-4">
          <div className="flex items-center gap-3 rounded-[10px] border border-aro-line-soft bg-aro-sunken/40 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aro-iris/15 text-aro-iris">
              <IconShield size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-aro-ink-3 uppercase tracking-wider">
                Target Directory
              </span>
              <span className="block truncate font-aro-mono text-[11.5px] text-aro-ink" title={pendingTrustFolder}>
                {pendingTrustFolder}
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-[10px] border border-aro-line-soft bg-aro-well/40 p-3.5 text-[12px] text-aro-ink-2">
            <div className="flex items-start gap-2.5">
              <IconCheck className="shrink-0 text-aro-mint mt-0.5" size={13} />
              <div>
                <span className="font-medium text-aro-ink">Read & Inspect:</span>{' '}
                Browse workspace files, search repository code, and index symbols.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <IconCheck className="shrink-0 text-aro-mint mt-0.5" size={13} />
              <div>
                <span className="font-medium text-aro-ink">Edit & Create:</span>{' '}
                Apply code changes, create files, and commit project updates.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <IconCheck className="shrink-0 text-aro-mint mt-0.5" size={13} />
              <div>
                <span className="font-medium text-aro-ink">Execute:</span>{' '}
                Run terminal commands, test suites, build scripts, and language tooling.
              </div>
            </div>
          </div>

          <p className="text-[11px] text-aro-ink-4 leading-relaxed">
            Only trust folders from authors and sources you trust. If you do not trust this directory, cancel to abort without granting execution access.
          </p>

          {error && (
            <p className="text-[11.5px] text-aro-rose font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-aro-line-soft">
            <Button
              disabled={submitting}
              onClick={() => setPendingTrustFolder(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={() => void handleConfirmTrust()}
              type="button"
              variant="primary"
            >
              {submitting ? 'Trusting…' : 'Trust folder'}
            </Button>
          </div>
        </div>
      ) : (
        <form className="p-5 pt-3 space-y-4" onSubmit={handleSubmit}>
          {mode !== 'add-folder' && (
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-aro-ink-2">
                Project name
              </label>
              <div className="flex h-[40px] items-center rounded-[10px] border border-aro-line bg-aro-sunken/40 px-3 focus-within:border-aro-iris focus-within:ring-1 focus-within:ring-aro-iris/30">
                <IconFolder className="mr-2.5 text-aro-ink-3 shrink-0" size={15} />
                <input
                  autoComplete="off"
                  className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-aro-ink placeholder:text-aro-ink-4 focus:outline-none"
                  disabled={submitting}
                  maxLength={80}
                  onChange={e => {
                    setName(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. backend-api, frontend-app"
                  ref={nameInputRef}
                  value={name}
                />
              </div>
            </div>
          )}

          {mode === 'create' && (
            <>
              {/* Color Swatches */}
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[12px] font-medium text-aro-ink-3">Project Color</label>
                <div aria-label="Project accent color" className="flex items-center gap-1.5" role="radiogroup">
                  {ARO_PROJECT_COLORS.map(c => (
                    <button
                      aria-label={`Select ${c.label} color`}
                      className={cn(
                        'relative flex size-[20px] cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110',
                        color === c.value && 'ring-2 ring-aro-ink ring-offset-2 ring-offset-aro-bg scale-105'
                      )}
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      type="button"
                    >
                      {color === c.value && (
                        <IconCheck className="text-white drop-shadow-sm" size={10} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Folders Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-medium text-aro-ink-2">
                    Source folders
                  </label>
                  <span className="text-[11px] text-aro-ink-4">
                    {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                  </span>
                </div>

                <div className="rounded-[10px] border border-aro-line-soft bg-aro-sunken/25 p-2.5">
                  {folders.length > 0 && (
                    <div className="space-y-1 mb-2.5">
                      {folders.map(folder => {
                        const base =
                          folder.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || folder

                        return (
                          <div
                            className="flex items-center gap-2 rounded-[7px] border border-aro-line-soft bg-aro-raise/80 px-2.5 py-1.5"
                            key={folder}
                          >
                            <IconFolder
                              className="text-aro-ink-3 shrink-0"
                              size={14}
                              style={{ color }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-medium text-aro-ink">
                                {base}
                              </span>
                              <span className="block truncate font-aro-mono text-[10px] text-aro-ink-4">
                                {folder}
                              </span>
                            </div>
                            <button
                              aria-label={`Remove ${base}`}
                              className="flex size-5 items-center justify-center rounded text-aro-ink-4 hover:bg-aro-hover hover:text-aro-ink cursor-pointer"
                              onClick={() => handleRemoveFolder(folder)}
                              type="button"
                            >
                              <IconX size={11} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                    <button
                      className="flex h-[30px] items-center gap-1.5 rounded-full border border-aro-line bg-aro-raise px-3.5 text-[12px] font-medium text-aro-ink-2 transition-colors hover:bg-aro-hover hover:text-aro-ink disabled:opacity-50 cursor-pointer"
                      disabled={submitting}
                      onClick={() => void handlePickFolder()}
                      type="button"
                    >
                      <IconFolder size={13} />
                      <IconPlus size={11} />
                      <span>Choose a local folder</span>
                    </button>
                    <span className="text-[10.5px] text-aro-ink-4">
                      Sessions inside this project will run in this directory
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'add-folder' && (
            <div className="py-4 text-center">
              <button
                className="inline-flex h-[32px] items-center gap-2 rounded-[8px] bg-aro-iris px-4 text-[12.5px] font-medium text-aro-on-iris hover:brightness-110 cursor-pointer"
                disabled={submitting}
                onClick={() => void handlePickFolder()}
                type="button"
              >
                <IconFolder size={14} />
                <span>Choose Folder to Add</span>
              </button>
            </div>
          )}

          {error && (
            <p className="text-[11.5px] text-aro-rose font-medium" role="alert">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-aro-line-soft">
            <Button
              disabled={submitting}
              onClick={closeProjectDialog}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || (mode !== 'add-folder' && !name.trim())}
              type="submit"
              variant="primary"
            >
              {submitting
                ? 'Saving…'
                : mode === 'rename'
                  ? 'Save'
                  : 'Create project'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
