# Fleet plan: running the port with several agents

A single agent can run all phases, and for a solo repo that is the default: one agent, area by area, one commit each. Parallel agents add merge conflicts and contract drift, so use them only when areas share no files. Use multiple agents only for Phase 4, after Phases 0-3 are committed, because they all depend on the contract and adapter layer.

## Roles
- **Lead**: owns Phases 0-3 and 5, owns `port/` files, assigns areas, resolves conflicts, merges branches. Only the lead edits GLOSSARY, DECISIONS (others propose entries in their report).
- **Area agents** (one per area, e.g. chat, settings, navigation/shell, onboarding, plus any prototype-only areas): port one area end to end. Each owns a disjoint set of files (list them in the assignment). May edit their rows in FEATURE_MAP.md.
- **Verifier**: runs Phase 5 independently of the area agents and does not trust their reports; checks against the real backend.

## Assignment brief (give each area agent exactly this)
1. Area name and feature ids from FEATURE_MAP.md.
2. Files you own; files you must not touch (everything else, especially adapters index and shared components; request changes through the lead).
3. Contract files to read before starting: GLOSSARY, FEATURE_MAP rows, SETTINGS_MERGE rows for your area, DECISIONS.
4. Definition of done: UI matches prototype, goes through adapters only, statuses updated, typecheck passes, area launches in Electron.
5. Report format: files changed, rows updated, proposed DECISIONS entries, UNKNOWNs, anything blocked.

## Ordering and parallelism
- Shell/navigation first (other areas mount inside it). Then areas in parallel.
- Settings last among parallel areas, because other areas may add settings.
- Shared component changes: lead batches them before parallel work or serialises them.

## Conflict handling
- Same feature claimed by two areas: lead splits by feature id, not by file.
- Contract disagrees with code: fix the contract, note in DECISIONS.
- Area agent needs a missing adapter method: adds it to the interface in a small separate commit that the lead approves, then implements both hermes and local versions.

## Hygiene
Commit per area. Never force-push. Never edit upstream Hermes backend directories; if a backend change is required for correctness, record it in DECISIONS.md as a backend-change request and implement a local fallback.
