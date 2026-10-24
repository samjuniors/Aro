# ADR 0008: Backend Python Runtime and Execution Model for Aro Desktop
Status: accepted
Date: 2026-10-19 / Aro Program (Step P11.2 Spike & Decision)
Context:
Hermes/Aro requires a Python 3.11+ backend executing the TUI Gateway daemon (`tui_gateway/server.py`). The audit (`port/RELEASE_AUDIT_REPORT.md` Finding 1) verified that on clean Windows machines, invoking bare `python` triggers the Windows Store execution alias (exit code 9009), causing silent crash loops in `tui_gateway_crash.log`.

Options evaluated during spike:
1. Option A (Bundled Python runtime): Ship standalone embedded CPython or staged payload within the app installer (`resources/agent-payload`).
   - Advantage: Completely independent of host machine; works 100% offline on first run with zero user friction.
   - Tradeoff: Increases packaged installer size by ~40-70 MB.
2. Option B (Managed environment via uv on first run): Download and provision isolated venv in `~/.aro/venv` upon first launch.
   - Advantage: Smaller initial download; clean separation.
   - Tradeoff: Adds 15-45s first-run delay; fails if first run has no network.
3. Option C (Require user-installed system Python):
   - Advantage: Zero installer size overhead.
   - Tradeoff: High consumer failure rate; triggers Windows Store 9009 error; unacceptable for a public consumer product.

Decision:
Adopt a tiered runtime resolution model:
1. **Tier 1 (Packaged Releases):** Primary release builds (`dist:bundled`) bundle the Python runtime and dependencies into `resources/agent-payload` (Option A), guaranteeing instant offline first-run.
2. **Tier 2 (Managed Environment Fallback):** If running from an unpackaged build or unbundled release, check for managed venv in `~/.aro/venv` or `~/.hermes/hermes-agent/venv` before probing PATH.
3. **Tier 3 (Windows Store Alias Defense & Detection):** In `windows-hermes-path.ts` and `backend-probes.ts`, explicitly probe resolved `python` binaries with `--version`. If exit code is 9009 or stderr matches "Microsoft Store", immediately disqualify the candidate and present a clear diagnostic overlay with a "Install / Repair Runtime" action.

Impact:
- Zero crashes on Windows clean machines.
- Fully offline first launch out-of-the-box for packaged distributions.
- Robust diagnostic messaging when host runtime is corrupted.

Roadmap slot: P11.2 (spike & ADR), P11.3 (implementation), P11.4 (matrix verification).
Acceptance: Packaged `Aro.exe` boots clean without global Python in PATH; Windows Store alias produces actionable remediation screen rather than silent crash loop.
