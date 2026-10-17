import { beforeEach, describe, expect, it } from 'vitest'

import { $projectScope, ALL_PROJECTS } from '@/store/project-scope'
import { $activeProjectId } from '@/store/projects'
import { $configuredDefaultProjectDir, $currentCwd, $sessions } from '@/store/session'
import type { ProjectInfo, SessionInfo } from '@/types/hermes'

import {
  $aroDraftProjectId,
  $aroSessionProjectMap,
  assignSessionToProject,
  clearAroProjectAndRevertToDefault,
  removeProjectFromMap,
  resolveAroDraftProjectId,
  resolveAroSessionProjectId,
  setAroDraftProject,
  unassignSessionFromProject
} from './project-session-map'

describe('project-session-map', () => {
  const dummyProjects: ProjectInfo[] = [
    {
      id: 'p_alpha',
      name: 'Alpha Project',
      folders: [{ path: '/projects/alpha', label: null, is_primary: true }],
      primary_path: '/projects/alpha',
      archived: false
    } as ProjectInfo,
    {
      id: 'p_beta',
      name: 'Beta Project',
      folders: [{ path: '/projects/beta', label: null, is_primary: true }],
      primary_path: '/projects/beta',
      archived: false
    } as ProjectInfo
  ]

  beforeEach(() => {
    $aroSessionProjectMap.set({})
    $aroDraftProjectId.set(null)
    localStorage.clear()
  })

  it('assigns session to project in atom and localStorage', async () => {
    await assignSessionToProject('s_101', 'p_alpha')
    expect($aroSessionProjectMap.get()['s_101']).toBe('p_alpha')
    expect(JSON.parse(localStorage.getItem('aro.session.projectMap') || '{}')['s_101']).toBe('p_alpha')
  })

  it('unassigns session from project', () => {
    $aroSessionProjectMap.set({ s_101: 'p_alpha' })
    unassignSessionFromProject('s_101')
    expect($aroSessionProjectMap.get()['s_101']).toBeUndefined()
  })

  it('removes project mappings when project is deleted', () => {
    $aroSessionProjectMap.set({ s_101: 'p_alpha', s_102: 'p_beta' })
    removeProjectFromMap('p_alpha')
    expect($aroSessionProjectMap.get()['s_101']).toBeUndefined()
    expect($aroSessionProjectMap.get()['s_102']).toBe('p_beta')
  })

  it('resolves explicit Aro project assignment before backend fallback', () => {
    const session: SessionInfo = {
      id: 's_custom',
      cwd: '/other/folder',
      git_repo_root: null
    } as SessionInfo

    // Before mapping: no project match
    expect(resolveAroSessionProjectId(session, dummyProjects, undefined, {})).toBeNull()

    // With explicit mapping: resolves immediately to target project
    expect(resolveAroSessionProjectId(session, dummyProjects, undefined, { s_custom: 'p_beta' })).toBe('p_beta')
  })

  it('falls back to Hermes folder matching when no explicit mapping exists', () => {
    const sessionInAlpha: SessionInfo = {
      id: 's_auto',
      cwd: '/projects/alpha/src',
      git_repo_root: '/projects/alpha'
    } as SessionInfo

    expect(resolveAroSessionProjectId(sessionInAlpha, dummyProjects, undefined, {})).toBe('p_alpha')
  })

  it('tracks draft project intent', () => {
    setAroDraftProject('p_alpha')
    expect($aroDraftProjectId.get()).toBe('p_alpha')
    expect(resolveAroDraftProjectId($aroDraftProjectId.get(), ALL_PROJECTS)).toBe('p_alpha')

    setAroDraftProject(null)
    expect($aroDraftProjectId.get()).toBeNull()
  })

  it('keeps a renderer-only draft association local until the first send', async () => {
    await assignSessionToProject('draft_123', 'p_alpha')

    expect($aroSessionProjectMap.get()['draft_123']).toBe('p_alpha')
    expect(JSON.parse(localStorage.getItem('aro.session.projectMap') || '{}')['draft_123']).toBe('p_alpha')
  })

  it('clears project and reverts session and workspace to default location', async () => {
    $configuredDefaultProjectDir.set('/workspace/default')
    $aroDraftProjectId.set('p_alpha')
    $projectScope.set('p_alpha')
    $activeProjectId.set('p_alpha')
    $sessions.set([{ id: 's_101', cwd: '/projects/alpha' } as SessionInfo])
    $aroSessionProjectMap.set({ s_101: 'p_alpha' })

    await clearAroProjectAndRevertToDefault('s_101')

    expect($aroDraftProjectId.get()).toBeNull()
    expect($projectScope.get()).toBe(ALL_PROJECTS)
    expect($activeProjectId.get()).toBeNull()
    expect($aroSessionProjectMap.get()['s_101']).toBeUndefined()
    expect($currentCwd.get()).toBe('/workspace/default')
    expect($sessions.get().find(s => s.id === 's_101')?.cwd).toBe('/workspace/default')
  })
})
