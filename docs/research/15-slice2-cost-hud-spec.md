# Research 15: Slice 2 Specification — Ambient Cost HUD & Token Burn Forensics (`aro-cost`)

Date: 2026-10-19  
Branch: `aro/P13-S2-cost`  
Author: Aro Program  
Scope: Specification, state machine, UX flows, accessibility, and acceptance criteria for Slice 2.

---

## 1. Problem Statement
Developers using metered frontier LLM models (Claude 3.7 Sonnet, OpenAI GPT-4.5 / o3, DeepSeek R1) experience constant anxiety over unexpected token usage spikes, repetitive tool loops, and runaway session costs. Existing CLI and desktop agents hide token counts deep in debug logs or delay reporting until provider invoices arrive.

Aro's core invariant establishes that **prompt caching is sacred**. The Ambient Cost HUD provides continuous ambient visibility into token expenditure, prompt cache hit ratio, context window utilization, and configurable budget boundaries directly in the shell titlebar.

---

## 2. User Flows & Capabilities

### 2.1 Ambient HUD Pill (Titlebar Integration)
- Located on the right cluster of `AroTitlebar` (next to Profile & Quick Settings).
- Compact display: `$X.XX · Y.Zk` (e.g., `$0.04 · 12.5k`).
- Color-coded indicator dot based on budget threshold:
  - **Normal / Mint**: Expenditure < 75% of soft budget limit.
  - **Caution / Amber**: Expenditure between 75% and 100% of soft budget limit.
  - **Alert / Rose**: Expenditure exceeds soft budget or approaches hard limit.
- Hover tooltip provides quick summary: `Session Cost: $X.XX · Total: Y.Zk tokens · Cache hit: W%`.

### 2.2 Token Forensics Popover
Clicking the HUD pill opens an elevation-4 popover detailing session token metrics:
1. **Financial Overview**:
   - Live estimated or actual session cost (`cost_usd`).
   - Comparison against active budget limits.
2. **Token Distribution Matrix**:
   - Prompt (Input) Tokens.
   - Completion (Output) Tokens.
   - Total Tokens consumed across all turn steps.
3. **Cache Efficiency Indicator**:
   - Sacred prompt cache hit percentage (`cache_hit_pct`).
   - Explanatory note detailing cached prefix cost savings (~75%–90% cheaper).
4. **Context Window Gauge**:
   - Current context utilization (`context_used` / `context_max`).
   - Visual progress bar showing remaining context headroom before automatic compression.
5. **Proactive Budget Guard**:
   - Soft Alert threshold setting (defaults: $2.00).
   - Hard Quota threshold setting (defaults: $5.00).
   - Instant visual warning when session spend crosses either threshold.

---

## 3. State Machine & Visual States

| State | Condition | Indicator Color | Popover Banner | Action Available |
|---|---|---|---|---|
| **Zero / Idle** | No turns executed ($0.00 / 0 tokens) | Neutral Ink-4 | "No token burn recorded yet" | Set budgets |
| **Normal** | Spend < soft budget (e.g. < $2.00) | Mint | "Normal consumption within budget" | Adjust budget |
| **Caution** | Spend ≥ 75% soft budget (e.g. ≥ $1.50) | Amber | "Approaching session soft limit ($2.00)" | Adjust budget |
| **Warning** | Spend ≥ soft budget (e.g. ≥ $2.00) | Amber/Rose | "Soft budget limit reached ($2.00)" | Acknowledge / Increase |
| **Exceeded** | Spend ≥ hard budget (e.g. ≥ $5.00) | Rose | "Hard budget ceiling reached ($5.00)" | Halt / Override limit |

---

## 4. Accessibility & Responsive Design
- ARIA semantics: `role="status"` on HUD pill, `aria-label="Session cost: $0.04, 12.5k tokens, status: normal"`.
- Popover keyboard support: Open with Enter/Space on pill, dismiss with Escape, Tab-traversable input fields.
- Contrast compliance: Badges and indicators meet WCAG AA contrast against dark (Obsidian, Nord, Ember) and light (Daylight, Paper) themes.
- Responsive collapse: Collapses from `$X.XX · Y.Zk` to `$X.XX` on narrow viewports (< 768px).

---

## 5. Feature Flag Plan
- Governed by `aro.features.ambientCostHud` in `apps/desktop/src/aro/flags.ts`.
- When disabled:
  - HUD pill is completely unmounted from the Titlebar.
  - No background polling or memory overhead.
- Flag togglable via Aro Appearance Settings and DevTools.

---

## 6. Acceptance Criteria
1. HUD pill renders correctly in Titlebar when `ambientCostHud` is enabled.
2. HUD pill hides cleanly when `ambientCostHud` is disabled.
3. Renders formatted cost (USD) and token count (k / M notation).
4. Popover opens on click, displaying input tokens, output tokens, total tokens, and cache hit percentage.
5. Budget thresholds (soft and hard limits) calculate correct warning states (normal, caution, alert, exceeded).
6. Local storage persistence for custom budget thresholds.
7. Acceptance tests pass with 100% coverage across component and store functions.
