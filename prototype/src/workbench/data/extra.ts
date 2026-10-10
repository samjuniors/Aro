import type { Step } from "./catalog";

// Editor candidates are preferences, not claims about software on this device.
export const INSTALLED_IDES = [
  { id: "cursor", name: "Cursor", version: "", scheme: "cursor://", installed: false, attached: false },
  { id: "vscode", name: "VS Code", version: "", scheme: "vscode://", installed: false, attached: false },
  { id: "zed", name: "Zed", version: "", scheme: "zed://", installed: false, attached: false },
  { id: "windsurf", name: "Windsurf", version: "", scheme: "windsurf://", installed: false, attached: false },
];
export const ASSISTANT = { name: "Aro", glyph: "A", from: "#6EE7B7", to: "#10B981", model: "auto-routed" };

/** Scripted agent-product reply — used by the demo/live backends for the "agent" product. */
export function buildAgentResponse(prompt: string): Step[] {
  const id = () => Math.random().toString(36).slice(2, 8);
  const topic = prompt.length > 56 ? prompt.slice(0, 56).trim() + "…" : prompt;
  return [
    { id: id(), type: "thinking", ms: 1900, text: "Decompose into research → produce → deliver. Pick the cheapest capable model per sub-step; escalate only if confidence is low." },
    { id: id(), type: "text", text: `On **${topic}**. I'll gather what I need first, then produce the artefact, and only ask you when something leaves the workspace.` },
    { id: id(), type: "tool", tool: "browser", title: "Browser", target: "search → 3 sources opened, 1 kept", status: "done", ms: 2400, lines: ["opened: docs.example.com/pricing", "opened: github.com/…/README", "kept: 2 relevant excerpts (1.1k tokens)"] },
    { id: id(), type: "tool", tool: "mcp", title: "Files", target: "workspace.write('outputs/summary.md')", status: "done", ms: 300, lines: ["wrote 84 lines"] },
    { id: id(), type: "text", text: "Done — the result is in `outputs/summary.md` and pinned to this session. Want me to turn it into a Slack post, an email, or a task list?" },
  ];
}
export type Task = { id: string; key: string; title: string; status: "backlog" | "ready" | "running" | "review" | "done"; priority: "p0" | "p1" | "p2" | "p3"; source: "linear" | "github" | "manual" | "agent"; assignee?: string; human?: boolean; estimate: string; deps?: string[]; sessionId?: string; criteria: string[]; tags: string[]; cost?: string };
export const TASKS: Task[] = [];
export const REPOS: { id: string; name: string; path: string; remote: string; branch: string; ahead: number; behind: number; dirty: number; provider: string; default: boolean }[] = [];
export const COMMITS: { hash: string; msg: string; by: string; when: string; files: number; agent: boolean }[] = [];
export const PRS: { num: number; title: string; branch: string; author: string; agent: boolean; status: "open" | "ready" | "merged"; checks: { pass: number; fail: number; pending: number }; reviews: string; adds: number; dels: number; mergeable: boolean }[] = [];
export const CHANGED_FILES: { path: string; adds: number; dels: number; status: string; origin: string }[] = [];