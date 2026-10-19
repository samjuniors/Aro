# SKILLS P10
Research questions: how do forks of large upstreams handle sync (cherry-pick vs merge vs rebase)? What does a safe `git rm` of tracked binaries need (history size, references)? Which upstream workflows publish or deploy?
Tools to prefer: `git` (`log`, `diff --stat`, `cmp -s`, `mv`), a link checker, grep. No new dependencies.
Read map: `DOCS-GOVERNANCE.md`, `.github/workflows/` (list first, open one at a time), `apps/desktop/package.json` (scripts only), `port/RELEASE_AUDIT_REPORT.md` section 6 to 9.
Never read: `AGENTS.md` whole, `locales/`, `website/`.
Evidence: `evidence/P10/baseline.txt`, `evidence/P10/ci-map.md`, the registry, the ledger.
Attack focus: a removal that breaks a link, a script, or a workflow; a doc that looked ACTIVE but was stale; a merge that silently drops the patch commits.
