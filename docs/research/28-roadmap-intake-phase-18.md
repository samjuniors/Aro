# Research 28: Roadmap Intake & Phase 18 Proposal

> **Phase 17: Operate and Evolve**  
> **Status:** APPROVED & SPECIFIED  
> **Kit Reference:** `.agent/aro-program/PROGRAM.md` Section 14 (Extending the Program)  

---

## 1. Roadmap Intake Governance

New features, architectural evolutions, and significant user feedback enter the Aro development lifecycle through a standardized 4-stage intake pipeline:

```
[ Community Feedback / Issues ]
              ↓
[ Backlog Proposals & Candidate ADRs ] (docs/adr/drafts/)
              ↓
[ Founder Phase Sizing & Selection ] (Selection of max 3-5 focus themes)
              ↓
[ Phase Kit Instantiation ] (.agent/aro-program/phases/P18-<slug>/)
```

### Stage 1: Community & Beta Signal Harvesting
- Feedback harvested from GitHub Discussions, sanitized diagnostics, and beta review meetings.
- Aggregated into thematic clusters: UI Observability, Agent Performance, Platform Integrations, Hardware Support.

### Stage 2: Backlog ADR Authoring
- Architectural proposals must be authored using the standard ADR template (`docs/adr/0000-template.md`).
- Must answer the fundamental invariants: Does it preserve prompt caching? Does it respect Zero Outbound Telemetry? Is it narrow-waist compatible?

### Stage 3: Phase Sizing & Founder Approval
- Large features are grouped into an overarching Phase (e.g. `P18-extensions-and-voice`).
- Sized into 3 to 5 gates with crisp exit criteria and performance budgets.

### Stage 4: Phase Kit Initialization
- Create `.agent/aro-program/phases/P18-<slug>/`:
  - `ROADMAP.md`: Steps, gates, founder interview batches.
  - `START-PROMPT.md`: Standard bootstrap prompt for resuming agent execution.
  - `SKILLS.md`: Tooling, research questions, and read-maps.
- Append new phase to `MASTER-ROADMAP.md`.

---

## 2. Phase 18 Candidate Themes & Backlog ADRs

Based on the completion of v1.0.0 and feedback during development, three candidate themes have been drafted for Phase 18:

### Theme A: Visual Extension & Plugin Hub (Candidate ADR 0022)
- **Problem:** Currently, installing skills, plugins, and MCP servers requires CLI commands (`hermes tools`, `hermes setup`) or manual YAML configuration.
- **Proposal:** A dedicated in-app Settings pane ("Aro Hub") enabling one-click discovery, toggling, and configuration of local skills, MCP servers, and tools.
- **Invariants Checked:** Edges-only capability; session-gated tool discovery; prompt caching preserved via deferred reload.

### Theme B: Full-Duplex Streaming Voice Engine (Candidate ADR 0023)
- **Problem:** ADR 0011 scoped voice to Push-to-Talk (PTT) with `AudioWorkletNode`. Users desire hands-free continuous duplex conversation.
- **Proposal:** Integrate local voice activity detection (VAD) using Silero/WebAudio with low-latency streaming audio duplex to Gemini Live or local Whisper/Kokoro backends.
- **Invariants Checked:** Local processing for VAD; zero audio stream egress without explicit user engagement.

### Theme C: Multi-Workspace State Sync & Worktrees (Candidate ADR 0024)
- **Problem:** Developers working across multiple git branches or worktrees desire isolated agent session states per worktree with unified checkpoint review.
- **Proposal:** Git worktree detection with scoped `.aro/worktrees/<hash>/` state databases and cross-worktree diff merging.

---

## 3. Template for Starting Phase 18

When the founder decides to initiate Phase 18:
1. Update `MASTER-ROADMAP.md`:
   ```markdown
   Active phase: P18-extensions-and-voice
   Active step: 18.1
   Last gate tag: aro-gate/P17-G17.1
   ```
2. Initialize directory `.agent/aro-program/phases/P18-extensions-and-voice/`.
3. Check out branch `aro/P18-extensions`.
4. Run `node .agent/aro-program/tools/context-pack.mjs`.
5. Execute Founder Interview Batch 1 and commence development.
