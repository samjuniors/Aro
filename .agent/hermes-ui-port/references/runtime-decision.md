# Runtime decision: how the prototype runs inside Electron

The user has not chosen. Decide from evidence in Phase 0 and log it in DECISIONS.md. Evaluate in this order and take the first that fits:

## Option A: Static export loaded by Electron (preferred default)
Use when the prototype uses no server-only features, or those uses are easily replaced (data fetching moved to the adapter layer, no API routes).
- Next.js: `output: 'export'`, `images.unoptimized: true`, relative `assetPrefix`/`basePath` as needed for `file://` or a custom protocol.
- Load via a custom `app://` protocol or `loadFile`; avoid `file://` if routing breaks.
- All backend access goes through the preload-exposed bridge (contextBridge) into the adapter layer.
- Pros: smallest attack surface, no extra process, simplest packaging. Cons: must remove server features.

## Option B: Move components into Hermes's existing renderer setup
Use when Hermes's renderer is already React (Vite or similar) and the prototype's value is components, styling, and layout, with Next-specific routing replaceable by the existing router.
- Port routes to the existing router, keep prototype components and CSS tokens.
- Pros: one build system, no Next dependency. Cons: more mechanical rewriting; Next-specific APIs (`next/link`, `next/navigation`, `next/image`, `next/font`) must be shimmed or replaced.
- Prefer this over A if the prototype leans on Next conventions only for routing and image/font helpers, and Hermes's toolchain is healthy.

## Option C: Run a Next.js server inside Electron
Last resort. Use only if the prototype genuinely requires server runtime (route handlers that hold logic that cannot move to the backend or adapters, server actions).
- Costs: bundled Node server, port management, packaging size, security review of exposed local port. Bind to `127.0.0.1` on a random port, use a per-launch token.

## Checks before deciding
- List every server-only usage found in Phase 0 and mark each: movable to adapter, replaceable, or blocking.
- If none block, choose A or B (B if Hermes renderer is React with a working build; otherwise A).
- Verify the choice with a minimal spike: one real prototype screen rendered in Electron with one real backend call through the adapter. Log the result. If the spike fails, fall to the next option and log why.

## Always
- Keep `contextIsolation: true`, `nodeIntegration: false` unless Hermes already differs and removing the difference is out of scope; if it differs, record it in DECISIONS.md as a known risk, do not silently change it.
- Preload exposes a narrow, typed API; renderer never imports Node modules directly.
