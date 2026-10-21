# Privacy Network Map & Data Flow Audit (Phase 15, Step 3)

## 1. Network Call Inventory
Every network call possible within Aro Desktop and Aro core runtime, its target, payload, and user opt-in trigger:

| Flow / Component | Destination | Data Sent | Trigger / Opt-in | Leaves Device? |
| --- | --- | --- | --- | --- |
| **Model Inferences** | User-configured provider (`api.openai.com`, `api.anthropic.com`, etc.) | User prompts, system prompt, conversation history, tool results | Explicit user prompt in active chat session | Yes (to chosen model provider) |
| **Local Model / Ollama** | `127.0.0.1:<port>` (localhost) | Chat prompt and tool outputs | User selects local model | No (local loopback only) |
| **Aro Local Bridge IPC** | `127.0.0.1:<port>` (stdio / JSONL / WebSocket) | Session messages, UI state events | Desktop application runtime | No (local loopback only) |
| **Web Search Tool** | Configured search provider (Brave, DuckDuckGo, Tavily, etc.) | Search query string | Explicit agent tool call invoked by query | Yes (query only) |
| **Web Preview / Fetch** | Target web URL requested by user or agent | HTTP GET request headers | Browser preview pane or fetch tool | Yes (to target host) |
| **Application Updater** | GitHub Releases or Cloudflare R2 bucket feed | Current client version header | Startup update check (can be disabled in Settings) | Yes (metadata only; no telemetry) |
| **Telemetry & Metrics** | **NONE** | **NONE** | Strict Zero Telemetry Posture (ADR 0012) | **NO** |
| **Crash Reporting** | **NONE** | **NONE** | Crashes saved to local log files only; never auto-uploaded | **NO** |

---

## 2. Sensitive Data & Secrets Posture
- **API Keys & Credentials**: Stored locally in `~/.aro/.env` (or `~/.hermes/.env` during migration). Never committed, never shared between profiles, never synced to cloud.
- **Log Redaction**: All log writers (`main.ts`, `ssh-connection.ts`, `hermes_logging.py`) pass text through regex token scrubbers (`redactSecrets` / `redact_sensitive_text`) removing `ARO_*`, `HERMES_*`, Bearer tokens, OpenAI/Anthropic/Google API keys, and URL tickets.
- **Diagnostics Bundles**: Diagnostics exports are strictly local on-disk archives. Redaction is enforced by default (`--redact`), replacing any credential-shaped substrings with `<redacted>`.

---

## 3. User-Facing Privacy Summary (Draft for Release Documentation)
> ### Privacy at Aro
> Aro is designed as a local-first, private AI assistant.
> 
> 1. **Zero Outbound Telemetry**: We do not collect analytics, usage metrics, telemetry, or user interaction tracking. No background tracking pixels or metric pings are embedded in the app.
> 2. **Your Data Stays Yours**: Your conversations, local tools, documents, and workspace memory reside exclusively on your machine in your local user directory (`~/.aro`).
> 3. **Direct Model Communication**: When you chat with an AI model, your prompt and context are sent directly to the model API provider you have chosen and configured (e.g. OpenAI, Anthropic, Google, or local Ollama). Aro never routes your model traffic through proxy servers.
> 4. **No Automated Crash Uploads**: Application logs and crash details are stored locally on your disk. They are never transmitted over the network unless you explicitly inspect and share a diagnostics file.
