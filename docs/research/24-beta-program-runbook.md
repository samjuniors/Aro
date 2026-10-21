# Closed Beta Program Runbook (Phase 16, Step 4)

## 1. Beta Cohort & Objectives
- **Cohort Size**: 25 to 50 active software engineers.
- **Duration**: 2 weeks.
- **Primary Goal**: Identify installation, runtime bridge, and platform-specific edge cases prior to unrestricted public release.
- **Success Criteria**:
  - Zero fatal crashes or unhandled fatal exceptions in daily workflow.
  - Zero data loss or corruption incidents.
  - >= 80% task completion success across the 10 default user journeys.

---

## 2. Beta Invite & Onboarding Flow
1. **Invites**: Distributed via email / direct developer outreach with download links to GitHub Releases pre-release tags (`v0.1.0-beta.1`).
2. **First Run**: Testers follow `docs/user/INSTALL.md` and `docs/user/FIRST-RUN.md`.
3. **Check-In**: Automated check-in at Day 3 and Day 10 asking for friction points.

---

## 3. Feedback Intake & Triage Board
- **Bug Reports**: Tagged with `label:beta-bug` and `severity:P0..P3` on GitHub Issues.
  - `P0` (Blocker): Fatal crash on launch, data corruption, security vulnerability. SLA: Fix within 24 hours.
  - `P1` (Critical): Core journey failure with no workaround. SLA: Fix within 48 hours.
  - `P2` (Moderate): Visual defect, non-blocking friction, performance warning. SLA: Address before public launch.
  - `P3` (Minor): Cosmetic papercuts, enhancement suggestions. SLA: Defer to post-v1 roadmap.
- **Daily Review Protocol**: Maintainers review all incoming issues at 09:00 UTC daily; issues are moved to **In Progress**, **Fixed in Next Canary**, or **Consciously Deferred in Writing**.

---

## 4. Exit Criteria for Public Release
- All `P0` and `P1` issues resolved and verified on Canary channel.
- Signed off by founder on Gate 16.3.
