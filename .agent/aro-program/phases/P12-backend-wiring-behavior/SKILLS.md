# SKILLS P12
Research questions: what does the Hermes API/bridge already offer for each item (read the code, do not guess)? How do comparable agent UIs persist rules, tasks, and agents? What is the AudioWorklet migration path for capture?
Tools to prefer: `grep`, the adapter test files in `apps/desktop/src/adapters/`, the wire baseline, `pytest` for any bridge change, Playwright for end-to-end flows.
Read map: `aro_bridge/protocol.md`, `aro_bridge/daemon.py`, `port/WIRE_BASELINE.md`, `port/DECISIONS.md`, `apps/desktop/src/adapters/` (list, then the one you change), `port/FEATURE_MAP.md` (relevant section only).
Never read: `port/AREA_PLAN.md` whole, upstream Python modules unrelated to the item.
Evidence: contract test output, before/after screenshots of each state, traces for NB-001.
Attack focus: backend slow or absent, stale data after reconnect, two windows, schema migration of stored data, secrets leaking into logs.
