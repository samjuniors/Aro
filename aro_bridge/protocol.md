# aro_bridge — `aro.jsonl/1`

The desktop twin of the sandbox aro-bridge: a **real agent loop** behind the
Aro Workbench, as a stdlib-only Python daemon speaking JSONL over stdio.
Model completions + JSON-protocol tool-calling (no native function calling),
with tools **delegated to the host** (`web_search`, `page_reader`).

## Architecture (the wiring decision)

```
┌──────────────┐   preload IPC    ┌─────────────────┐   spawn + JSONL stdio   ┌──────────────────┐
│   renderer   │◄─aro:event────────│  Electron main   │◄────────────────────────│  aro_bridge       │
│ (workbench)  │──aro:send───────►│ (process owner) │──user_message───────────►│  daemon (python) │
└──────────────┘                  └─────────────────┘                          └──────────────────┘
```

- **Electron main owns the daemon subprocess** (`electron/aro-ipc.ts`). It
  spawns the checkout's venv interpreter (`resolveSourcePython` — never a PATH
  python) as `python -m aro_bridge.daemon` with `PYTHONPATH=<repo root>`,
  keeps the stdin/stdout pipes, and parses one JSON object per line from
  stdout. Single owner, clean lifecycle, no ports, no CORS, renderer sandbox
  intact.
- **The renderer never touches the daemon.** It receives events through the
  preload `contextBridge` (`window.hermesDesktop.aroBridge.onEvent` / `.send`)
  on per-session channels (`hermes:aro:bridge:<sessionId>:event`), exactly the
  embedded-terminal pattern.
- **Tools execute in the host.** After emitting a `tool_call` the daemon
  BLOCKS reading the next stdin line, which must be that call's
  `tool_result` (fed back to the model as `TOOL_RESULT …`) or an `interrupt`
  (aborts the turn with `error "interrupted"` + `done`).

## Command line

```
python -m aro_bridge.daemon [--engine demo|openai] [--base-url URL]
                            [--model NAME] [--api-key KEY] [--max-tool-calls N]
```

- `--engine demo` (default) — deterministic, no network: a canned
  think → search → compose → stream sequence per turn, for wiring tests and
  the UI without an endpoint.
- `--engine openai` — real loop against an OpenAI-compatible chat completions
  endpoint (`--base-url`, default `http://localhost:8642/v1` — the Aro
  api_server; `--model`, default `aro-4-70b`).

## stdin — one JSON object per line

| Input | Fields | Meaning |
| --- | --- | --- |
| `{"type":"user_message","text":…}` | `text` | Start a turn |
| `{"type":"tool_result","callId":…,"ok":…,"output":…}` | `callId`, `ok`, `output` | Answer a pending `tool_call` |
| `{"type":"interrupt"}` | — | Abort the in-flight turn (ignored while idle) |

Unknown types → stderr warning, ignored. stdin EOF → clean exit 0.

## Event protocol (`aro.jsonl/1`) — stdout, one JSON object per line

```ts
type AroEvent =
  | { type: "session_start"; sessionId: string; model: string; tools: string[] }
  | { type: "thinking"; label: string; ms: number }
  | { type: "tool_call"; callId: string; tool: "web_search" | "page_reader"; args: object }
  | { type: "tool_result"; callId: string; ok: boolean; ms: number; summary: string; lines: string[] }
  | { type: "assistant_delta"; text: string }
  | { type: "reply_done"; ms: number }
  | { type: "error"; message: string }
  | { type: "done"; ms: number; toolCalls: number };
```

Rules (identical to the sandbox twin):

- `session_start` is always first (emitted once at daemon start, carrying the
  `as_<base36 time><random>` session id); `done` is always last per turn —
  even after `error`.
- `tool_call` → `tool_result` pair up on `callId`; results carry
  pre-formatted `lines` so any client can render them without knowing the
  tool.
- `assistant_delta` chunks (~2 words each, ~20ms apart) accumulate into the
  final reply; `reply_done` closes it with the composing latency.
- `thinking` reports the measured model latency right before what it
  produced.
- Tool budget: at most `--max-tool-calls` (default 3) calls per turn, then
  the model must answer in text; the loop gives up after 7 rounds.

## The aro-model shim (why JSON protocol)

The model has no native function calling. The system prompt (verbatim from
the sandbox twin) instructs it to reply with a single JSON object
(`{"tool":…, "args":…}`) when a tool would help and plain text otherwise;
the daemon parses it (fenced or bare, first `{`…last `}` span, tool name
validated), asks the host to execute the real tool, and feeds `TOOL_RESULT …`
back as the next user message.
