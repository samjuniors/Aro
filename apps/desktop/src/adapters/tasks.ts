/**
 * TASKS ADAPTER (local) — the prototype's user tasks per project.
 *
 * Contract refs:
 * - Feature ids: `aro-tasks` (port/FEATURE_MAP.md — partial: board renders
 *   live agent todos + demo seeds; THIS adapter owns the user-task half).
 * - Glossary rows: Task (user task per project) — deliberately NOT merged
 *   with Hermes todos (D-0009: the agent's todo_list is the agent's plan;
 *   user tasks are the user's checklist — different owners, kept separate).
 * - Backend-todo shape: `tasks.list/create/update` per project
 *   (port/FEATURE_MAP.md, `aro-tasks` row).
 *
 * Interface = prototype names (`WorkspaceTask`, statuses todo/doing/done —
 * prototype `lib/workspace.tsx`). Persistence = the prototype's own storage
 * key `conductor.workspace.v3.tasks`, adopted as-is. Swapping to a real
 * backend later means implementing this interface against Hermes RPC and
 * changing one registry entry (src/adapters/index.ts).
 */

import { atom } from 'nanostores'

import { readLocalRecord, WORKSPACE_KEY, writeLocalRecord } from './storage'

/** Prototype status vocabulary (NOT the board's 5-column graph). */
export type WorkspaceTaskStatus = 'todo' | 'doing' | 'done'

/** Prototype entity: prototype/src/workbench/lib/workspace.tsx `WorkspaceTask`. */
export interface WorkspaceTask {
  id: string
  title: string
  projectId?: string
  status: WorkspaceTaskStatus
  createdAt: string
}

export type NewTaskInput = Pick<WorkspaceTask, 'title'> &
  Partial<Pick<WorkspaceTask, 'projectId'>>

export interface TasksAdapter {
  /** All user tasks (every project). */
  list(): WorkspaceTask[]
  /** Create and persist a task; returns the stored record. */
  create(input: NewTaskInput): WorkspaceTask
  /** Patch a task (title/status/project); no-op when the id is unknown. */
  update(id: string, patch: Partial<Omit<WorkspaceTask, 'id' | 'createdAt'>>): WorkspaceTask | null
  /** Remove a task; returns whether a record was deleted. */
  remove(id: string): boolean
}

/* ============================ persistence ============================ */

function isTaskStatus(value: unknown): value is WorkspaceTaskStatus {
  return value === 'todo' || value === 'doing' || value === 'done'
}

export function sanitizeTasks(value: unknown): WorkspaceTask[] {
  if (!Array.isArray(value)) {return []}

  const out: WorkspaceTask[] = []

  for (const item of value) {
    if (item == null || typeof item !== 'object') {continue}
    const t = item as Record<string, unknown>

    if (typeof t.id !== 'string' || typeof t.title !== 'string') {continue}

    const record: WorkspaceTask = {
      id: t.id,
      title: t.title,
      status: isTaskStatus(t.status) ? t.status : 'todo',
      createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString()
    }

    if (typeof t.projectId === 'string') {record.projectId = t.projectId}

    out.push(record)
  }

  return out
}

/* ============================== adapter ============================== */

let seq = 0

function makeTaskId(): string {
  seq += 1

  return `task-${Date.now().toString(36)}-${seq.toString(36)}`
}

// BACKEND-TODO(tasks): local persistence only — the future backend call is
// `tasks.create` per project (see port/FEATURE_MAP.md `aro-tasks`).
export const localTasksAdapter: TasksAdapter = {
  list() {
    return $userTasks.get()
  },

  create(input) {
    const task: WorkspaceTask = {
      id: makeTaskId(),
      title: input.title.trim(),
      status: 'todo',
      createdAt: new Date().toISOString()
    }

    if (input.projectId) {task.projectId = input.projectId}

    const next = [...$userTasks.get(), task]
    $userTasks.set(next)

    return task
  },

  update(id, patch) {
    const tasks = $userTasks.get()
    const index = tasks.findIndex(t => t.id === id)

    if (index === -1) {return null}

    const current = tasks[index]
    const next: WorkspaceTask = { ...current }

    if (typeof patch.title === 'string' && patch.title.trim()) {next.title = patch.title.trim()}

    if (patch.status != null) {next.status = patch.status}

    if (patch.projectId !== undefined) {next.projectId = patch.projectId}

    $userTasks.set([...tasks.slice(0, index), next, ...tasks.slice(index + 1)])

    return next
  },

  remove(id) {
    const tasks = $userTasks.get()
    const next = tasks.filter(t => t.id !== id)

    if (next.length === tasks.length) {return false}

    $userTasks.set(next)

    return true
  }
}

/* ============================== store ============================== */

/**
 * The reactive store behind the adapter. UI components subscribe to this
 * (or call the adapter methods, which write through it) — they never touch
 * storage directly. Seed is read once at module init; writes persist
 * immediately.
 */
export const $userTasks = atom<WorkspaceTask[]>(readLocalRecord(WORKSPACE_KEY.tasks, [], sanitizeTasks))

$userTasks.subscribe(tasks => {
  // BACKEND-TODO(tasks): replace with the real `tasks.list` sync when the
  // backend lands; until then this is the persistence point.
  writeLocalRecord(WORKSPACE_KEY.tasks, tasks)
})
