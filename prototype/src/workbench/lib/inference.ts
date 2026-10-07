import type { ModelProvider } from "../data/providers";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Usage = { input?: number; output?: number };

/** Actual local inference only. No scripted replies or synthetic progress. */
export async function streamLocalChat(provider: ModelProvider, model: string, messages: ChatMessage[], onToken: (text: string) => void, signal: AbortSignal): Promise<Usage> {
  if (provider.kind !== "local") throw new Error("Cloud inference requires an authenticated runtime connection.");
  const root = (provider.baseUrl || provider.defaultUrl || "").replace(/\/$/, "");
  const ollama = provider.id === "ollama";
  const endpoint = ollama ? `${root}/api/chat` : `${root}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Accept: ollama ? "application/x-ndjson" : "text/event-stream" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 220);
    throw new Error(`Provider returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (!response.body) throw new Error("The provider did not return a response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let received = false;
  let usage: Usage = {};
  const consume = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;
    const data = ollama ? trimmed : trimmed.startsWith("data:") ? trimmed.slice(5).trim() : "";
    if (!data || data === "[DONE]") return;
    let parsed: { error?: string | { message?: string }; message?: { content?: string }; choices?: { delta?: { content?: string } }[]; prompt_eval_count?: number; eval_count?: number; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    try { parsed = JSON.parse(data); } catch { return; }
    if (parsed.error) throw new Error(typeof parsed.error === "string" ? parsed.error : parsed.error.message || "Inference failed");
    const content = ollama ? parsed.message?.content : parsed.choices?.[0]?.delta?.content;
    if (content) { received = true; onToken(content); }
    if (parsed.prompt_eval_count !== undefined || parsed.usage) usage = { input: parsed.prompt_eval_count ?? parsed.usage?.prompt_tokens, output: parsed.eval_count ?? parsed.usage?.completion_tokens };
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      lines.forEach(consume);
    }
    pending += decoder.decode();
    if (pending.trim()) consume(pending);
    if (!received) throw new Error("The model returned no text.");
    return usage;
  } finally { reader.releaseLock(); }
}