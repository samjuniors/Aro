import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  $aroDraftProjectId,
  $aroSessionProjectMap,
  assignSessionToProject,
  removeProjectFromMap,
  resolveAroSessionProjectId,
  setAroDraftProject,
  unassignSessionFromProject
} from './project-session-map'
import type { ProjectInfo, SessionInfo } from '@/types/hermes'

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

    setAroDraftProject(null)
    expect($aroDraftProjectId.get()).toBeNull()
  })
})
