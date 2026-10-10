# Contract file templates

## GLOSSARY.md
| Prototype term | Hermes term | Kind (screen/entity/field/action/setting) | Evidence | Confidence |
|---|---|---|---|---|
| Workspace | Session | entity | proto `types/workspace.ts` shape matches hermes `session` schema fields id,title,createdAt | high |

Rules: UI code uses the prototype column. Only adapters use the Hermes column. Include field-level renames for any entity that crosses the adapter boundary. Include a `Notes` row for restructurings (one Hermes screen split into several prototype screens, or the reverse).

## FEATURE_MAP.md
One row per feature (id is stable, kebab-case).
| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|

Status values:
- `wired`: prototype UI, backed by Hermes.
- `partial`: some behaviour wired, some local; list which in Notes.
- `local`: prototype only, local-only state, backend later.
- `hermes-only`: exists in Hermes, rebuilt in prototype style, no prototype origin.
- `dropped`: exists in Hermes and the user's prototype intentionally removed it. Do not rebuild it unless the backend still requires it for correct behaviour (then mark `hermes-only` and log why). If unsure whether removal was intentional, keep it as `hermes-only` and log the doubt.

## SETTINGS_MERGE.md
| Setting id | Prototype UI | Hermes key | Case | Resolution |
|---|---|---|---|---|
Case values: `proto-only` (local adapter, persisted locally), `hermes-only` (placed in the nearest prototype settings section, restyled), `both` (prototype control, Hermes key and value shape; check defaults and migrate stored values). If a setting is in both with conflicting defaults, Hermes's stored user value is preserved; prototype default applies only to fresh installs. Never drop a Hermes setting that the backend reads.

## DECISIONS.md (append only)
```
### D-<n> <title>
Date / phase:
Decision:
Reason / evidence:
Alternatives considered:
Reversibility: easy | moderate | hard
```

## Adapter registry pattern
```ts
// src/adapters/index.ts
export interface ChatAdapter { /* prototype-named methods */ }
const registry = {
  chat: hermesChatAdapter,       // wired
  notes: localNotesAdapter,      // local: BACKEND-TODO(notes)
};
export const adapters = registry;
```
Each adapter file starts with a header: feature ids covered, glossary rows used, and status. Swapping local to hermes is a one-line change in the registry plus a new adapter file; component code does not change.
