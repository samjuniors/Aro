# SKILLS P16
Research questions: current signing and notarization requirements per OS; auto-update security (signature verification, downgrade protection); how comparable open-source desktop apps run betas and handle support; license obligations of each bundled font and dependency.
Tools to prefer: `electron-builder` configuration in the repo, the existing release workflows (read first; they may point at upstream infrastructure, see P10.6), a license checker, an SBOM generator.
Read map: `apps/desktop/electron-builder.config.cjs`, `.github/workflows/desktop-bundled-release.yml`, `.github/workflows/canary-release.yml`, `NOTICE`, `LICENSE`, `docs/brand/BRAND.md`, P10 fork-safety list.
Never read or handle: private keys, tokens, `.env` files; ask the founder to run steps that need them.
Evidence: dry-run logs, license table, checklist with links, beta report.
Attack focus: a workflow that publishes to upstream's channels, an update that cannot be rolled back, a missing license text, a README claim you cannot demonstrate, first-run failure on a machine without developer tools.
