# Research 16: Slice 3 Specification — Parallel Subagent Work-Graph & Tasks Board (`aro-tasks`)

Date: 2026-10-19  
Branch: `aro/P13-S3-tasks`  
Author: Aro Program  
Scope: Specification, state machine, UX flows, subagent integration, and acceptance criteria for Slice 3.

---

## 1. Problem Statement
Complex software engineering tasks require decomposing goals into parallel subtasks executed by specialized agents (Aro Agent, Claude Code, Codex, GLM Code) alongside human oversight. A linear chat transcript becomes chaotic when multiple agents operate concurrently.

The Tasks Board (`/aro-tasks`) delivers a spatial, 5-stage work-graph that visualizes task dependencies, active worker assignments, acceptance criteria, and cost/estimate accounting.

---

## 2. User Flows & Core Capabilities

### 2.1 Kanban Columns & Lifecycle
Tasks move through 5 distinct states:
1. **Backlog (neutral)**: Decomposed goals waiting to be scheduled.
2. **Ready (sky)**: Tasks with all upstream dependencies resolved.
3. **Running (cyan)**: Currently active task under execution (shows pulsing progress bar).
4. **Review (amber)**: Work completed, awaiting human verification or test checks.
5. **Done (mint)**: Verified and finished tasks.

### 2.2 Task Card Semantics
- **Priority Badge**: P0 (critical/rose), P1 (high/amber), P2 (medium/sky), P3 (low/neutral).
- **Key & Source**: Issue identifier (`T-101`) and provenance badge (`LIN`, `GH`, `ME`, `AGT`).
- **Worker Assignment**: Agent glyph avatar (Aro Agent, Claude Code, Codex, Cursor, GLM Code) or Human ("you").
- **Dependency Guard**: Automatic `blocked` badge when any upstream task in `deps` is not yet in `done` status.
- **Cost & Time**: Estimated duration and accumulated spend.

### 2.3 Task Detail & Orchestration Drawer
Selecting a task card opens the right drawer:
- **Criteria Checklist**: Interactive checkboxes representing definition-of-done requirements.
- **Blocked By Links**: One-click navigation to upstream blocking tasks.
- **Worker Dispatch**: "Run with agent" triggers autonomous execution; "Start" marks human work.
- **Decompose / Split**: Ask agent to split large tasks into parallel subtasks.

---

## 3. State Machine & Visual States

| State | Condition | Rendered UX | Actions Available |
|---|---|---|---|
| **Disabled** | `parallelTasksBoard: false` | Gated banner explaining feature flag | Enable in settings |
| **Empty** | No tasks in session or local storage | Clean dashed empty panel | "Add your first task" |
| **Active Board** | Tasks present, layout = `board` | 5-column Kanban board with drop slots | Filter, Create, Drag/Move, Select |
| **Active List** | Tasks present, layout = `list` | Dense multi-column data table | Sort, Filter, Select |
| **Detail Drawer** | Task selected (`sel !== null`) | Slide-over inspector panel with criteria & deps | Change status, Run with agent, Delete |

---

## 4. Accessibility & Layout
- Layout switcher: Board (spatially grouped by status) vs List (dense scannable view).
- ARIA semantics: `aria-label="Filter tasks"`, `aria-label="New task title"`, keyboard Enter to submit task, Escape to dismiss detail drawer.
- Theme harmony: Tested across Obsidian, Daylight, Nord, Ember, Paper.

---

## 5. Feature Flag Plan
- Governed by `aro.features.parallelTasksBoard` in `src/aro/flags.ts` (default: true).
- Fallback when disabled: Explanatory banner with link to enable feature flag.

---

## 6. Acceptance Criteria
1. Tasks board hides cleanly behind feature flag when `parallelTasksBoard` is disabled.
2. Renders all 5 columns with correct counts and color indicators.
3. Calculates task stats (in progress, needs you, blocked, done) accurately.
4. Correctly flags blocked tasks based on upstream dependencies.
5. Task detail drawer displays acceptance criteria, estimates, and blocked-by dependencies.
6. Local task creation, status updates, and deletion function smoothly.
7. Unit and acceptance tests pass with 100% test coverage.
