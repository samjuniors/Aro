# Research 13: v1 Feature Set Selection and Scoring Rubric (P13 Steps 1–2)

Date: 2026-10-19  
Branch: `aro/P13-features`  
Author: Aro Program  
Scope: Identification, evaluation, and selection of at most 5 high-impact vertical feature slices for Aro public v1.

## 1. Candidate Long List

| ID | Feature Candidate | User Problem | Target User | Current Workaround |
|---|---|---|---|---|
| **F-1** | **Diff-First Visual Review (`aro-review`)** | Autonomous agents modify multiple files; reviewing raw diffs in a terminal is error-prone and risks unnoticed regressions. | All coding agent users | External Git GUI (GitKraken) or `git diff` in terminal |
| **F-2** | **Ambient Cost/Token HUD & Budget Alert** | Users unexpectedly exhaust API credits or exceed monthly limits due to opaque token consumption (Zed anti-pattern). | Metered API users (OpenRouter, Anthropic, OpenAI) | Manually checking provider web dashboards |
| **F-3** | **Parallel Tasks Board & Plan Orchestration (`aro-tasks`)** | Single chat threads block running concurrent workflows; multi-step goals cannot be tracked visually. | Power developers & multi-taskers | Multiple terminal tabs or separate chat instances |
| **F-4** | **In-App Responsive Web & Dev-Server Preview (`browser-preview`)** | Web developers must constantly alt-tab to external browsers to inspect agent-generated web code. | Fullstack & frontend web developers | Alt-tabbing to Chrome and manually refreshing localhost |
| **F-5** | **One-Click IDE Deep Link & Editor Handoff (`editors`)** | Jumping from agent turns to exact file/line in Cursor, VS Code, or Zed requires tedious manual navigation. | Hybrid pair-programmers | Alt-tabbing to IDE, Ctrl+P, searching file & line |
| **F-6** | **Visual Rule Studio & Memory Starmap (`aro-rules`)** | Agents forget custom project rules across sessions; users repeatedly re-prompt guidelines. | Long-term daily drivers | Copy-pasting custom system instructions |
| **F-7** | **Semantic Codebase Indexing (Embeddings)** | Large repos exceed simple grep capability for finding relevant symbols across directories. | Enterprise & mono-repo developers | Manual symbol grep / ripgrep |

---

## 2. Scoring Rubric & Evaluation Table

**Criteria:**
- **Reach (1–5):** Breadth of audience using this feature daily.
- **Impact (1–5):** Increase in trust, developer velocity, and retention.
- **Confidence (1–5):** Certainty of architectural & backend feasibility without core fork drift.
- **Effort (1–5):** Development complexity & time (1 = low effort, 5 = high effort).
- **Risk (1–5):** Stability, performance, and coupling risks (1 = low risk, 5 = high risk).
- **Composite Score:** `(Reach × Impact × Confidence) / (Effort × Risk)`

| ID | Feature | Reach | Impact | Confidence | Effort | Risk | Composite Score | Shortlist Verdict |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **F-1** | Diff-First Visual Review (`aro-review`) | 5 | 5 | 5 | 2 | 2 | **31.25** | **SHORTLIST — Slice 1** |
| **F-2** | Ambient Cost/Token HUD & Budget Alert | 5 | 4 | 5 | 2 | 1 | **50.00** | **SHORTLIST — Slice 2** |
| **F-3** | Parallel Tasks Board (`aro-tasks`) | 4 | 5 | 4 | 3 | 2 | **13.33** | **SHORTLIST — Slice 3** |
| **F-4** | In-App Responsive Web Preview (`browser-preview`) | 4 | 4 | 4 | 2 | 2 | **16.00** | **SHORTLIST — Slice 4** |
| **F-5** | One-Click IDE Deep Link (`editors`) | 5 | 4 | 5 | 1 | 1 | **100.00** | **SHORTLIST — Slice 5** |
| **F-6** | Visual Rule Studio (`aro-rules`) | 3 | 4 | 3 | 4 | 3 | 3.00 | **DEFER (Post-v1)** |
| **F-7** | Semantic Codebase Indexing | 3 | 4 | 2 | 5 | 4 | 1.20 | **DEFER (Post-v1)** |

---

## 3. The 5 Selected Vertical Slices

1. **Slice 1 (13.S1): Diff-First Visual Review & Checkpoint Rollback (`aro-review`)**  
   Interactive multi-file diff inspector with per-hunk acceptance, inline comments, and checkpoint restoration.
2. **Slice 2 (13.S2): Ambient Token / Cost HUD & Proactive Quota Guard**  
   Continuous token counter and live cost estimation in status bar / composer with configurable threshold warnings.
3. **Slice 3 (13.S3): Parallel Tasks Board & Plan Orchestrator (`aro-tasks`)**  
   Visual Kanban board with draggable status columns (Todo, In Progress, Review, Done) and one-click task dispatch.
4. **Slice 4 (13.S4): In-App Responsive Web & Dev-Server Preview (`browser-preview`)**  
   Right-rail embedded browser with loopback port auto-detection, responsive viewport frames, and external browser popout.
5. **Slice 5 (13.S5): One-Click IDE Deep Link & Editor Handoff (`editors`)**  
   Direct protocol navigation (`cursor://file/...`, `vscode://file/...`, `zed://file/...`) from tool cards and review hunks into external editors.

---

## 4. Interview Batch 1 Answers & Recommendations

1. **Founder Feature Ideas:** Solicit any custom founder candidate additions (retaining the 5-feature maximum).
2. **Candidate Verdicts:**
   - F-1 through F-5: Recommended for **v1**.
   - F-6 and F-7: Recommended to **defer** post-v1.
3. **Telemetry for Measuring Success:**
   - **Recommendation: A. None, qualitative beta feedback only** (Preserves zero-telemetry offline-safe privacy posture).
4. **First User Persona:**
   - **Recommendation:** Fullstack / AI-native software engineer currently using Claude Code in terminal or Cursor in VS Code, seeking local autonomy, multi-model flexibility, and transparent diff review without proprietary vendor lock-in.
