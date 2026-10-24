# ADR 0004: Supported OS platform list and order for public v1
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Founder Decision D-4)
Context: Aro targets desktop deployment across platforms, but packaging, testing, and notarization need prioritized execution.
Decision: Support Windows, then macOS, then Linux for the public v1 release in that explicit sequence.
Alternatives considered:
- Windows only (rejected: limits reach for users on macOS/Linux).
- macOS then Windows (rejected: current active development and validation environment is Windows).
Impact: Phase 11 (packaging) and Phase 16 (release) execution order prioritizes Windows installers (.exe / MSIX / NSIS), followed by macOS (.dmg / notarization), and Linux (.AppImage / .deb).
Roadmap slot: P11.1, P15.2, P16.1.
Acceptance: Working, validated packaging pipelines for Windows, macOS, and Linux in the agreed order.
