# Port DECISIONS (append-only log)

Format: decision, reason, alternatives, reversibility. One entry per decision made during any phase. Append-only — never edit existing entries.

---

## Phase 0 (Discovery)

**D-0001 — Wire baseline source = merge-base tree `1cb25c3e335a`, not upstream HEAD, not the working tree.**
- Reason: user directive ("take the wire baseline from the original Hermes UI (upstream or git history), not the half-ported tree") + the fork's backend is merge-base + fork commits; upstream HEAD (3,125 commits ahead) contains wire the fork's backend does not have, and the working tree contains Aro-only changes.
- Alternatives: upstream HEAD (rejected: would list wire the fork cannot serve); current tree (rejected: would launder half-ported changes into the "original" contract).
- Reversibility: high (document-only; re-extract from another commit if the base moves).

**D-0002 — Fork-added wire surface (aroBridge IPC, `hermes:git:cloneRepository`, `branchSwitch` create param, `aro.jsonl/1` protocol) is recorded in WIRE_BASELINE §G and treated as allowed extensions of the baseline.**
- Reason: these are already in production use on this branch (AroBridgeView, project dialog/git picker); removing them would break working features. The skill's "the port may only call things on the baseline" is honored by keeping §G a closed, explicit list.
- Alternatives: exclude them entirely (rejected: would force removal of working features, violating resume mode); fold into §A–F silently (rejected: would corrupt the "original Hermes" baseline).
- Reversibility: high (move entries between sections as needed).

**D-0003 — Resume mode confirmed; existing in-renderer port architecture adopted (runtime skill Option B de facto).**
- Reason: skill "Mode detection" — the port is underway with prototype UI rebuilt inside the Hermes React/Vite renderer (4-layer graft: additive `--aro-*` tokens, `host-theme.css` attribute restyle, mount-seam component swaps, contributed `/aro-*` routes); `apps/desktop/src/api` + `src/sdk` are byte-identical to merge-base, proving wire discipline. Prototype has near-zero server coupling (4 thin route handlers + fonts — all movable), so neither Option A (static export) nor Option C (Next server in Electron) is warranted.
- Alternatives: Option A static export (rejected: duplicate build pipeline, loses Hermes renderer runtime); Option C (rejected: heaviest, no server-only need).
- Reversibility: medium — final runtime decision is formally Phase 2 work; this records the evidence and continues the existing approach. Any change would need a dedicated migration.

**D-0004 — `pane.reveal` pane names and `layout.apply` preset ids are backend-visible UI names; keep the Python-side enum and renderer-side maps in sync when restructuring the workspace UI.**
- Reason: `tools/focus_pane_tool.py:9` hardcodes `PANES = ("chat","files","terminal","review","sessions")`; renderer resolves via `src/store/pane-focus.ts` `PANE_REVEALERS`. The Aro workspace panel restructure renames UI surfaces; the wire values must not drift or the backend tool breaks (returns tool_error for unknown pane).
- Alternatives: none viable silently. A deliberate rename is possible only as an atomic both-sides change logged here first.
- Reversibility: low once the ported UI ships — treat as a frozen contract.

**D-0005 — `hermes:desktop:zoomLevel` localStorage key preserved (only main↔renderer storage coupling).**
- Reason: Electron main reads/writes it via `executeJavaScript` as the legacy mirror of `zoom-state.json` (main.ts:7071/7116; zoom.ts:9). Renaming breaks zoom recovery on pre-JSON installs.
- Alternatives: drop the mirror (possible later, needs a deprecation pass — not in this port's scope).
- Reversibility: medium.

**D-0006 — Server→client request methods (13) must keep being answered by the ported UI.**
- Reason: `approval`, `sudo`, `secret`, `vault.*`, `clarify`, `terminal.read`, `preview.act/read`, `window.read`, `tour`, `display.install.sudo` are backend-initiated RPCs the renderer answers; unanswered requests get `-32601` declines — backend survives but features (approvals, vault prompts) degrade. The Aro UI must route these to Aro-styled prompts/cards.
- Reversibility: high (UI-side only).

**D-0007 — Prototype dead template dependencies are not ported.**
- Reason: ~40 of ~50 prototype package.json deps (full shadcn/ui set, zustand, framer-motion, prisma + db.ts, next-auth, react-query, dnd-kit, recharts, etc.) have zero imports; they are sandbox scaffolding. The fork's desktop app already has its own equivalents where needed.
- Alternatives: port them (rejected: dead weight, licensing review burden).
- Reversibility: high.

**D-0008 — Prototype L4 route handlers resolved as: `/api/chat` → Hermes gateway (L3; SOUL-flavored SYSTEM_PROMPT text preserved as an agent-config artifact, not a runtime dependency); `/api/workbench/stt` → Hermes `/api/audio/transcribe` (already wired in Task 7) with the browser-engine fallback kept client-side; `/api/workbench/tts` → Hermes `/api/audio/speak` with the ≤1000-char chunk-splitting logic portable to a local adapter if needed; `/api` (hello) → dropped.**
- Reason: skill Local-adapter rules + precedence rule 1 (backend correctness). Exact adapter boundaries get formalized in Phase 3.
- Reversibility: high.

**D-0009 — TasksView (user tasks per project) and Hermes todos (agent plan) are NOT the same feature.**
- Reason: only signal 4 (naming-ish similarity) — prototype tasks are user-managed project checklists persisted locally; Hermes `todo.updated` is the agent's own plan during a turn. Per phase0-discovery §4, low-confidence pairs are not merged.
- Alternatives: merge into one entity (rejected: would delete user data semantics or change agent behavior).
- Reversibility: high (can revisit in Phase 1 FEATURE_MAP with user input if desired).

**D-0010 — `hermes:sync-status`/`getSyncStatus` recorded as dead wire at merge-base (handler exists, preload never wired). Not removed, not ported; marked UNKNOWN whether upstream re-added it.**
- Reason: record-don't-assume (skill rule 6).
- Reversibility: high.

**D-0011 — Prototype storage namespace (`conductor.*`, `aro.*`) and Hermes namespace (`hermes.desktop.*`, `hermes:desktop:*`) are disjoint; both are kept as-is in the port.**
- Reason: zero collisions verified; presentation-layer keys are free to differ from wire names (skill naming layers), and keeping the prototype keys makes the Aro view code portable without rewrites.
- Reversibility: high (a future unified settings store would migrate values, not names).

**D-0012 — Feature runtime status is UNKNOWN until the port runs against a live Python backend.**
- Reason: skill resume mode: "a feature's status comes from running it against the real backend". Sandbox has no Hermes Python venv; Task 7 verified render + unit tests only. INVENTORY §9 marks live behaviors UNKNOWN rather than claiming them.
- Reversibility: n/a (fact recording).

## Phase 1 (Contract)

**D-0013 — Live-backend verification harness established in-sandbox; Phase 1 statuses determined by running the real app, not by reading code.**
- Reason: skill resume mode requires feature status from running against the real backend; Phase 0 had marked this UNKNOWN (no Python toolchain). Solved by: `uv python install 3.14` + `uv venv .venv` at repo root (exactly the interpreter path Electron's source-python ladder looks for) + `uv pip install -e .`; launched `hermes serve --host 127.0.0.1 --port 0` (backend 127.0.0.1:38541, ledger pid 18023); `npm install` at repo root; vite renderer on 127.0.0.1:5174; Electron under `Xvfb :97` with CDP 9222. Electron attach-first found the running serve and connected the renderer WS with the session token.
- Alternatives: continue with UNKNOWN statuses (rejected: user directive + skill rule); tests-js mock lane (rejected: mock is not the real backend).
- Reversibility: high (harness only; no repo code changed; .venv/node_modules untracked).

**D-0014 — Feature status evidence = observed behavior in the live run (2026-10-10); no successful model turn exists (provider credentials absent).**
- Reason: `model.options` reports `model:"z-ai/glm-5.2"` but `providers:[]` and no API key exists in the sandbox. The send path was still fully exercised: composer → trusted-Enter → session `20261010_075711_e591cc` created (`message_count:1, source:"desktop"`) → turn dispatched → backend error streamed back → Aro error card with Retry/Open logs/Send diagnostics. Chat completion remains UNKNOWN (needs provider key or Nous free tier `/login`); the wire path is proven.
- Alternatives: ask user for an API key (not a hard stop — verification achieved without it; credentials are only required for the *positive* turn, which Phase 5 can do on the dev machine).
- Reversibility: high.

**D-0015 — Approval modes: Aro pill exposes `smart`/`manual`/`off` only; `yolo` reachable solely via palette "Toggle yolo". Prototype `readonly`/`plan` modes have no Hermes approval-mode counterpart and are not merged.**
- Reason: `approval-mode-pill.tsx` APPROVAL_MODES (3) vs Hermes `approvals.mode` domain (smart/manual/off/yolo). Live round-trip verified: pill → `config.set {key:"approvals.mode"}` → backend `/api/config` flips smart↔manual → pill updates. Parity gap (yolo missing from pill) logged for Phase 4; prototype-only modes dropped from the pill per precedence rule 3.
- Alternatives: add yolo to the pill now (deferred: Phase 4 UI work, contract phase records only); map readonly/plan to toolsets (rejected: speculative backend change).
- Reversibility: easy (UI-side addition).

**D-0016 — Sidebar Skills/Connectors nav rows are highlight-only stubs (`activeNav` state, no rendered view). The capabilities page is the real, verified surface for both.**
- Reason: live run — clicking the rows only toggles `aria-current`; `AroSidebar.tsx:870` has no view branch for them. `#/capabilities` renders Skills 53 / Tools 25 / Connectors / Plugins from the backend (live ✓). Wiring the rows (routes or re-pointing at capabilities) is a Phase 4 decision, recorded as an open choice.
- Alternatives: none needed now (record, don't build in a contract phase).
- Reversibility: high.

**D-0017 — Low/medium-confidence pairs are NOT merged; each side is listed as its own feature (user directive: merge only high-confidence matches).**
- Pairs kept separate: user Tasks (proto) vs agent todos (D-0009); Rules (proto) vs SOULs/profiles (Hermes); AgentsView adapters (proto) vs subagents (Hermes); CodeSearchView (proto) vs grep tool (Hermes); BrowserView iframe (proto) vs right-rail browser/`preview.*` (Hermes); onboarding doctor sweep (proto) vs `/api/ops/doctor` (Hermes); sandbox pref (proto) vs Connections (Hermes).
- Reason: signals are 3–4 only (purpose/naming), no shared wire or data shape; merging would either delete user-data semantics or change backend behavior (skill hard-stop territory if forced).
- Reversibility: high (a later phase may merge with evidence).

**D-0018 — Wire param shape verified live: `config.set` takes `{key, value}` (my `{path, value}` probe was rejected; the ported UI uses the correct shape — proven by the approval-mode round-trip).**
- Reason: record-don't-assume; corrects nothing in the baseline (WIRE_BASELINE §C already derives from code), but now has runtime proof.
- Reversibility: n/a (fact).

**D-0019 — Voice/dictation/TTS statuses: controls + engine wiring present; live audio round-trips UNKNOWN (headless Xvfb, no mic/speakers).**
- Reason: "Voice dictation" composer button, voice orb ("Aro voice · Idle · click to open") render; `/api/audio/transcribe` + `/api/audio/speak` wiring adopted from Task 7; actual capture/playback cannot be exercised in this sandbox. Recorded as UNKNOWN, not guessed.
- Reversibility: n/a (fact).

**D-0020 — GLOSSARY scope: only terms that cross the adapter boundary or map features; presentation-only names (component/CSS class names) are excluded.**
- Reason: skill naming layers — component names never reach the backend; enumerating them would bloat the contract without adding wire safety.
- Alternatives: full component-name map (rejected: no contract value).
- Reversibility: high.

**D-0021 — Aro pages status: `/aro-agent` bridge = wired (full daemon round-trip: thinking → web_search tool → results → reply, demo engine); `/aro-review` and `/aro-tasks` = partial (pages render with honestly-labeled "demo data"; review wire exists, tasks has a live `todo_list` hook).**
- Reason: live run 2026-10-10. The bridge demo engine is by design (`--engine demo`); the openai engine is the real path.
- Reversibility: n/a (status recording).

**D-0022 — Wire discipline re-verified under load: the whole live session ran through the ported UI with zero wire additions or renames; attach-first connected to the externally-spawned serve instance.**
- Reason: supports Phase 5's parity gate in advance; `src/api/*` + `src/sdk/*` remain untouched.
- Reversibility: n/a (fact).

**D-0023 — Effort mapping recorded: Aro 5-stop slider (Minimal/Low/Medium/High/Ultra) over Hermes `REASONING_EFFORTS` (minimal…ultra), with `xhigh→High` and `max→Ultra` presentation folding and `ultra→max` wire clamp on OpenAI-compatible routes.**
- Reason: `aro-model-menu-panel.tsx` EFFORTS + `reasoning-effort.ts`; live ✓ slider value 4 → pill `data-level="ultra"` with description swap. Prototype's "effort 0–4" is the same 5-stop control.
- Reversibility: high (presentation-only).
