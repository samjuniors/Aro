---
name: hermes-ui-port
description: Port a forked Hermes agent desktop (Electron) app to a custom prototype UI (Next.js or other) while keeping Hermes's real backend working. Builds a port contract (glossary, feature map, adapter layer, decisions log) by diffing both codebases, then executes the port with minimal questions, merges Hermes-only features such as settings into the prototype's layout, and puts features with no backend on local-only state behind swappable adapters. Use this skill whenever the user mentions redesigning, reskinning, replacing, migrating, or merging the Hermes desktop UI with their prototype, renamed or restructured features between prototype and Hermes, wiring a prototype frontend to the Hermes backend, or running a multi-agent UI port, even if they do not say "skill" or "port".
---

# Hermes UI Port

Goal: the prototype is the base for UI, UX, interaction, styling and structure. Hermes supplies the working backend and any good UI the prototype lacks. The result is a desktop app that looks and behaves like the prototype and does everything Hermes's backend does today.

## Operating rules (read first)

1. **Do not interview the user.** Everything needed is discoverable by diffing the two codebases. When a choice is needed, apply the precedence rules below, log it in `port/DECISIONS.md`, and continue. Stop and ask only for the cases listed under "Hard stops".
2. **Prototype wins** on structure, naming in UI code, layout, styling, interaction. **Hermes wins** on backend behaviour, data shapes, IPC channels, and anything the prototype does not cover.
3. **Naming layers.** Names are not one decision, they are three:
   - *Wire and persisted names* keep Hermes's, always: IPC channels, routes, payload and config keys, DB fields, preload API names, event names, and storage keys (electron-store, localStorage). Never rename these. They are what breaks the backend.
   - *Presentation names* are the prototype's: components, screens, labels, view-model types, CSS. Component names never reach the backend, so they are free to differ.
   - *New backend surface for `local` features* uses the prototype's names, defined once in the adapter interface. That interface is the contract the future backend implements.
   Translation between the first two happens only in the adapter layer.
4. **Never delete Hermes UI** until the parity gate in Phase 5 passes. Keep it intact until then.
5. **Work on a new git branch** (`ui-port/<date>`). Commit per phase so any step can be reverted.
6. **Record, don't assume.** Anything inferred goes in the contract files with a confidence level. Anything unverifiable is marked `UNKNOWN`, never guessed.

## Mode detection (before Phase 0)

Check `git log`, branches and whether `port/` exists. If the port is already underway (prototype code is inside the Electron app, some features wired), run in **resume mode**:
- Phase 0 inventories the current state instead of assuming a clean start.
- Working code is adopted, never rewritten. Existing names are recorded in the glossary as they are.
- A feature's status comes from running it against the real backend, not from reading code or commit messages.
- Skip Phase 2 if the prototype already launches inside Electron (launch it to verify). Redo only what fails.
- Contract files are reconstructed from what exists, then used as normal.

## Precedence for any conflict

1. Backend correctness (Hermes) beats everything for data and behaviour.
2. Prototype beats Hermes for anything the user sees or touches.
3. If both have a version of the same feature, prototype UI plus Hermes wiring.
4. If only Hermes has it, keep it, restyled with prototype components, placed in the nearest matching prototype section.
5. If only the prototype has it, keep it, implemented on local-only state (see Local adapters).

## Phases

Run in order. Each phase writes files under `port/` at the repo root. Read the reference file named in each phase before starting it.

### Phase 0: Discovery (read-only, no code changes)
Read `references/phase0-discovery.md`. Produce `port/INVENTORY.md`: both apps' stack, entry points, routes/screens, components, state, IPC/API surface, settings, and the runtime situation (see `references/runtime-decision.md`).
Also produce `port/WIRE_BASELINE.md`: every wire name and payload shape the original Hermes UI uses (channels, routes, messages, config and storage keys). It is the proof, in Phase 5, that the backend contract was not broken.
Classify all prototype logic into L1-L4 (see `references/phase0-discovery.md` section 3). This decides where each piece of logic lives.

### Phase 1: Contract
Read `references/contract-templates.md`. Produce:
- `port/GLOSSARY.md` prototype term to Hermes term, with evidence (file and symbol).
- `port/FEATURE_MAP.md` every feature on both sides with status: `wired`, `partial`, `local` (UI only, no backend), `hermes-only`, `dropped`.
- `port/SETTINGS_MERGE.md` per setting: prototype-only / Hermes-only / both, and the resolution.
- `port/DECISIONS.md` append-only log: decision, reason, alternatives, reversibility.

Commit. The contract is now the shared source of truth for every agent. If the contract and the code disagree later, fix the contract in the same commit.

### Phase 2: Runtime shell
Read `references/runtime-decision.md`. Choose how the prototype runs inside Electron, log the choice, and get an empty prototype window opening in the Hermes Electron shell with preload and IPC bridge in place. Verify it launches before continuing.

### Phase 3: Adapter layer
Create one boundary module (default `src/adapters/`) exposing a typed interface per feature area, using prototype names. Two implementations per area:
- `hermes` adapter: calls the real backend, translating names and shapes per the glossary.
- `local` adapter: same interface, persisted local-only state, for `local` features.

UI components import only the interface, never IPC or backend code directly. A feature moves from `local` to `hermes` later by changing one registry entry. See `references/contract-templates.md` for the registry pattern.

### Phase 4: Port by area
Read `references/fleet-plan.md`. Work area by area (or dispatch parallel agents with disjoint file ownership). For each area: build/adjust the prototype UI, wire it through the adapter, update the feature map status, commit.

Merging Hermes-only UI: rebuild it with prototype components and tokens. Do not copy Hermes styling. Preserve behaviour and every option the backend honours.

### Phase 5: Verification and parity gate
Run: typecheck, lint, production build of the Electron app, launch smoke test. Then diff every wire call the new UI makes against `WIRE_BASELINE.md`: each must exist in the baseline with the same shape, or be logged in DECISIONS.md as a backend change. Then walk `FEATURE_MAP.md`: every `wired` row must be exercised against the real backend and ticked; every `local` row must work offline and survive restart; every `hermes-only` row must be reachable in the new UI. Write `port/PARITY_REPORT.md`. Only when no `wired` or `hermes-only` row is failing may the old Hermes renderer be removed, and only as a separate commit.

## Local adapters (features with no backend yet)

Fully functional UI, persisted locally (Electron store/file in userData, or IndexedDB; pick what the existing app already uses). Requirements: realistic latency-free behaviour, survives restart, same method signatures the future backend call would have, a `// BACKEND-TODO(<feature-id>)` marker at each place where a real call will replace it, and a row in `FEATURE_MAP.md` with the intended backend endpoint shape. Never present local-only data as if it came from Hermes.

## Hard stops (the only reasons to ask the user)

- An action that would destroy uncommitted work or rewrite git history.
- Credentials, API keys, or accounts are required that are not in the repo or environment.
- Two features are plausibly the same but merging them would delete user data or change backend behaviour, and the evidence is genuinely 50/50.
- The prototype and Hermes disagree on a license, or a dependency would change the app's licensing.

When stopping, ask one specific question, state your default, and say what you did meanwhile.

## Final report format

End with: runtime decision, counts per feature status, list of `UNKNOWN`s, list of decisions that were hard to reverse, and what remains for backend work (all `BACKEND-TODO` ids). Keep it under 40 lines.
