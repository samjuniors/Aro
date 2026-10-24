# ADR 0016: Reference Hardware Baseline for Performance Budgets
Status: accepted
Date / Author: 2026-10-21 / Aro Program Engineer & Founder
Context: Desktop apps built on Electron must perform smoothly across diverse hardware configurations without unbounded memory growth or UI thread jank. A concrete low-end reference machine is needed to benchmark performance budgets.
Decision: The reference low-end baseline for Aro v1 performance budgets is:
- CPU: 4 cores / 4-8 threads (e.g. Intel Core i5 8th gen / AMD Ryzen 3 3200U)
- RAM: 8 GB system memory
- GPU: Integrated graphics (Intel UHD 620 / AMD Radeon Vega 8)
- Display: 1080p 60Hz at 100% and 125% scaling
- Budgets: Cold start < 1800ms, idle memory < 150MB renderer / < 250MB total, transcript scroll >= 60fps with 5,000 messages, zero dropped input frames.
Alternatives considered:
- 2-core CPU / 4 GB RAM: Too constrained; modern Electron + Python runtimes exceed 4GB memory headroom under heavy multi-tasking.
- 8-core CPU / 16 GB RAM: Too high; conceals performance regressions on entry-level developer laptops.
Impact: Frame profiling, virtualization in chat transcript, ambient layer caps, memory leak profiling.
Roadmap slot: P15 Step 6.
Acceptance: Performance benchmark tables meeting or beating targets on reference machine specs.
