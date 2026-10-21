# Legal, Brand, Font & Asset Inventory (Phase 16, Step 1)

> **Disclaimer**: This technical inventory was prepared by the engineering team to audit open-source license compliance. It does not constitute formal legal counsel. Formal counsel review is recommended before public release.

---

## 1. Codebase Ownership & Upstream Attribution
- **Product Name**: Aro (Aro Agent, Aro Desktop, Aro CLI, Aro Harness).
- **Owner / Maintainer**: `samjuniors` (Decision D-17, `docs/brand/BRAND.md`).
- **Upstream Project**: Fork of `Hermes Agent` by Nous Research.
- **License**: MIT License (per `LICENSE`).
- **Attribution & Notice**:
  - Maintained in root [`NOTICE`](file:///e:/Projects/SamjuniorsProducts/Aro/NOTICE).
  - Maintained in Desktop About / Version dialog (`apps/desktop/src/components/version-details.tsx`): *"Aro Agent by samjuniors · Forked from Hermes Agent under MIT License"*.
  - Upstream marks ("Hermes") are preserved strictly for technical identifier compatibility and attribution.

---

## 2. Bundled Typography & Font Licenses
Every font file bundled under `apps/desktop/src/fonts/` is licensed under permissive open-source licenses permitting software bundling and desktop redistribution:

| Font Family | Files | Upstream Author / Foundry | License |
| --- | --- | --- | --- |
| **Geist** | `Geist-Variable.woff2` | Vercel | SIL Open Font License 1.1 |
| **Inter** | `Inter-Variable.woff2` | Rasmus Andersson | SIL Open Font License 1.1 |
| **JetBrains Mono** | `JetBrainsMono-*.woff2` | JetBrains | SIL Open Font License 1.1 / Apache 2.0 |
| **Cascadia Code** | `CascadiaCode-Regular.woff2` | Microsoft | SIL Open Font License 1.1 |
| **Monaspace Neon** | `MonaspaceNeon-Regular.woff2` | GitHub | SIL Open Font License 1.1 |
| **DM Sans** | `DMSans-Variable.woff2` | Colophon Foundry / Google | SIL Open Font License 1.1 |
| **Newsreader** | `Newsreader-Variable.woff2` | Production Type / Google | SIL Open Font License 1.1 |
| **Space Grotesk** | `SpaceGrotesk-Variable.woff2` | Florian Karsten | SIL Open Font License 1.1 |
| **KaTeX Fonts** | `KaTeX_*.woff2`, `.woff` | Khan Academy | SIL Open Font License 1.1 / MIT |

---

## 3. UI Icons & Visual Assets
- **Tabler Icons** (`@tabler/icons-react`): MIT License.
- **Lucide Icons** (`lucide-react`): ISC License.
- **VS Code Codicons** (`@vscode/codicons`): MIT License / Creative Commons.
- **Aro Brand Mark & Iconography**: Original artwork by samjuniors (`assets/aro-icon.svg`, `apps/desktop/public/aro-icon.svg`).
- **Telemetry & Tracking Pixels**: Zero third-party analytics scripts or beacon assets bundled.

---

## 4. Public README & Marketing Claims Audit
Every capability claimed in the public README and documentation corresponds to implemented and verified test coverage:
- **Desktop Application**: Verified via Electron packaging tests and `e2e/core/boot-lifecycle.spec.ts`.
- **Zero Outbound Telemetry**: Verified via `docs/research/21-privacy-network-map.md` and ADR 0012.
- **Diff-First Visual Review**: Verified via `apps/desktop/src/aro/DiffCard.tsx` and `accessibility-journeys.test.tsx`.
- **Proactive Cost HUD**: Verified via `apps/desktop/src/aro/AroCostBudgetView.tsx` and `pages.test.tsx`.
- **Parallel Subagent Tasks Board**: Verified via `apps/desktop/src/aro/TasksBoard.tsx` and `TasksBoard.test.tsx`.
- **In-App Responsive Web Preview**: Verified via `apps/desktop/src/aro/InAppBrowserPreview.tsx` and `InAppBrowserPreview.test.tsx`.
- **One-Click IDE Deep Link**: Verified via `apps/desktop/src/aro/IdeDeepLink.tsx` and `IdeDeepLink.test.tsx`.
- **WCAG 2.2 AA Accessibility**: Verified via `apps/desktop/src/aro/accessibility-journeys.test.tsx` (13/13 tests green).
