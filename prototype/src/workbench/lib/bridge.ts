"use client";

/**
 * aro-bridge client — talks to the bridge daemon (:3004 through the sandbox
 * gateway) over the aro.jsonl/1 event protocol. This is the renderer-side twin
 * of the desktop preload IPC: same events, fetched as an NDJSON stream instead
 * of arriving through window.aro.onEvent.
 */

import type { HistoryTurn } from "./live";

export const ARO_BRIDGE_PORT = 3004;

export type BridgeToolName = "web_search" | "page_reader";

export type BridgeEvent =
  | { type: "session_start"; sessionId: string; model: string; tools: string[] }
  | { type: "thinking"; label: string; ms: number }
  | { type: "tool_call"; callId: string; tool: BridgeToolName; args: { query?: string; url?: string; num?: number } }
  | { type: "tool_result"; callId: string; ok: boolean; ms: number; summary: string; lines: string[] }
  | { type: "assistant_delta"; text: string }
  | { type: "reply_done"; ms: number }
  | { type: "error"; message: string }
  | { type: "done"; ms: number; toolCalls: number };

/** Probe the bridge daemon without ever throwing. */
export async function bridgeHealth(): Promise<{ ok: boolean; detail: string; ms: number }> {
  const t0 = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`/health?XTransformPort=${ARO_BRIDGE_PORT}`, { signal: controller.signal });
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}`, ms };
    const data = (await res.json()) as { ok?: boolean; protocol?: string };
    return { ok: data.ok === true, detail: data.protocol ? `bridge up · ${data.protocol}` : "bridge up", ms };
  } catch (error) {
    const ms = Math.round(performance.now() - t0);
    const detail = error instanceof Error ? (error.name === "AbortError" ? "timed out (5s)" : error.message) : "network error";
    return { ok: false, detail, ms };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run one agent turn; yields protocol events as they arrive from the NDJSON
 * stream. Aborting the signal cancels the run (the daemon observes the
 * disconnect and stops its loop).
 */
export async function* runAgentBridge(messages: HistoryTurn[], signal: AbortSignal): AsyncGenerator<BridgeEvent> {
  const res = await fetch(`/agent/start?XTransformPort=${ARO_BRIDGE_PORT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`bridge ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          yield JSON.parse(line) as BridgeEvent;
        } catch {
          /* skip malformed line — protocol is line-delimited JSON */
        }
      }
      nl = buf.indexOf("\n");
    }
  }
}
