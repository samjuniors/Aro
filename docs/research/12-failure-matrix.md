# Research 12: Failure Matrix Specification and Verification (P12 Step 7)

Date: 2026-10-19  
Branch: `aro/P12-backend`  
Scope: Aro Desktop failure states, designed screens, user-facing copy, and automated test coverage.

## Overview

Aro Desktop adheres to the principle that **no failure state should leave the user stranded with a frozen screen, an unhandled rejection, an unhelpful technical stack trace, or a dead-end UI**. Every failure state must have:
1. A designed visual state with clear hierarchy (headline, explanation, technical details collapsed).
2. Actionable recovery buttons mapped to working application handlers.
3. Automated unit or integration test coverage verifying the contract.

---

## The 7 Failure Scenarios

| # | Failure Scenario | Trigger Condition | Designed UI State | User-Facing Copy / i18n | Recovery Actions | Automated Test Coverage |
|---|---|---|---|---|---|---|
| **1** | **Gateway Down** | Gateway process killed, socket disconnected, or host unreachable during boot/heartbeat. | Status indicator turns amber/red (`reconnecting`/`disconnected`); global notification toast with recovery action. | Headline: *"Gateway connection lost"*<br>Body: *"Attempting to reconnect..."* | • Auto-reconnect with exponential backoff<br>• "Reconnect Gateway" action<br>• "Restart Gateway" via system actions | `src/store/gateway-reconnect.test.ts`<br>`src/lib/json-rpc-gateway-recovery.test.ts`<br>`src/aro/failure-matrix.test.tsx` |
| **2** | **No Model or Credentials** | Missing/invalid API key (`auth`, `auth_permanent`) or unconfigured model (`model_not_found`). | Error card in thread with provider badge; raw HTTP/API error demoted to collapsed Details disclosure; Retry button suppressed for non-retryable keys. | `auth`: *"Update API key for [Provider]"*<br>`model_not_found`: *"Model not available on [Provider]"* | • "Update API key" (deep-links to `Settings → Keys`)<br>• "Choose a model" (opens model picker)<br>• "Switch provider" | `src/components/assistant-ui/thread/assistant-message.test.tsx`<br>`src/lib/error-surface.test.ts`<br>`src/aro/failure-matrix.test.tsx` |
| **3** | **Rate Limit** | Provider returns HTTP 429 (`rate_limit`, `upstream_rate_limit`, `overloaded`). | Error card names failing provider; if reset timestamp (`resetsAt`) provided, displays live countdown clock; retains manual Retry. | Title: *"Rate limit reached"*<br>Body: *"The provider rejected requests due to rate limits."*<br>Countdown: *"Retrying at HH:mm — in Xm Ys"* | • "Retry" (manual)<br>• "Retry when the limit resets (HH:mm)" with automatic timer trigger on expiry<br>• "Switch provider" | `src/components/assistant-ui/thread/assistant-message.test.tsx`<br>`src/aro/failure-matrix.test.tsx` |
| **4** | **Tool Error** | Tool execution failure (non-zero exit, file missing, command syntax error). | Assistant preserves partial transcript; tool call card displays failed badge (`Tool execution failed`); error output captured in collapsible container without breaking turn loop. | Tool status: *"Tool call failed"*<br>Collapsible details: standard error stream output (`stderr`) | • Agent auto-recovery / error reflection turn<br>• Manual turn retry via AssistantMessage reload<br>• Edit user prompt | `src/lib/chat-messages/tool-result-preservation.test.ts`<br>`src/aro/failure-matrix.test.tsx` |
| **5** | **Network Loss** | Sudden TCP drop mid-turn or loss of internet connectivity (`stream_drop`, `timeout`). | Liveness monitor detects dead socket; mid-turn stream is marked incomplete with retryable error card; active reconnect runs in background. | Title: *"Connection dropped mid-response"*<br>Body: *"The network stream was interrupted. You can retry the message."* | • "Retry"<br>• Automatic background socket reconnection | `src/lib/gateway-liveness-policy.test.ts`<br>`src/store/gateway-connection-lifecycle.test.ts`<br>`src/aro/failure-matrix.test.tsx` |
| **6** | **Huge Output** | Model or tool generates massive text/JSON payload exceeding buffer or context (`payload_too_large`, `context_overflow`). | Output virtualized to prevent DOM jank; context overflow error card replaces runaway thread; Retry suppressed to prevent repeating overflow. | `context_overflow`: *"Conversation exceeds model context"*<br>`payload_too_large`: *"Message payload too large to process"* | • "Compress conversation" (executes `/compress`)<br>• "Start new session"<br>• Retry suppressed | `src/components/assistant-ui/thread/assistant-message.test.tsx`<br>`src/aro/failure-matrix.test.tsx` |
| **7** | **Session Restore After Crash** | App crashes or ungracefully terminates mid-turn; on reboot session has lingering lease (`SESSION_NOT_OWNED`). | Previous transcript restored from local tail cache; raw PID/lease string hidden behind Details disclosure; clean recovery card presented. | Headline: *"Session already has a live owner"*<br>Body: *"Another surface owns this session or previous process crashed."* | • "Start new session" (clears stranded lease)<br>• Transcripts preserved on disk<br>• Retry suppressed | `src/components/assistant-ui/thread/assistant-message.test.tsx`<br>`src/store/session-watchdog.test.ts`<br>`src/aro/failure-matrix.test.tsx` |

---

## Verification Summary

All 7 failure states are covered by automated contract and unit tests. In addition to area-specific suites, `apps/desktop/src/aro/failure-matrix.test.tsx` provides an integration verification suite exercising all 7 scenarios against the application's actual error recovery and state dispatchers.
