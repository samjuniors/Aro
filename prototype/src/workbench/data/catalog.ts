export type AgentKind = "terminal" | "ide" | "cloud" | "hybrid";
export type AgentStatus = "connected" | "auth-required" | "not-installed" | "degraded";
export type Agent = {
  id: string; name: string; vendor: string; glyph: string; from: string; to: string; kind: AgentKind; status: AgentStatus;
  version: string; models: { id: string; label: string; ctx: string; price: string }[];
  strengths: string[]; weakSpots: string[]; invocations: number; successRate: number; p50: string;
};

// Adapter catalog, not an installation or activity report.
export const AGENTS: Agent[] = [
  { id: "aro", name: "Aro Agent", vendor: "samjuniors", glyph: "AR", from: "#6EE7B7", to: "#10B981", kind: "hybrid", status: "connected", version: "v1.5.0",
    models: [{ id: "aro-4-405b", label: "Aro 4 405B", ctx: "131k", price: "free" }, { id: "aro-4-70b", label: "Aro 4 70B", ctx: "131k", price: "free" }, { id: "glm-4.6", label: "GLM 4.6 (routed)", ctx: "200k", price: "$0 / sub" }],
    strengths: ["Self-improving loop", "39 model providers", "Runs anywhere"], weakSpots: ["No inline editor yet"], invocations: 96, successRate: 86, p50: "1.6s" },
  { id: "claude-code", name: "Claude Code", vendor: "Anthropic", glyph: "CC", from: "#d4aa91", to: "#c9845b", kind: "hybrid", status: "connected", version: "2.1.4", models: [{ id: "claude-sonnet-4-6", label: "Sonnet 4.6", ctx: "200k", price: "provider pricing" }] },
  { id: "codex", name: "Codex", vendor: "OpenAI", glyph: "CX", from: "#babdb8", to: "#86af9a", kind: "hybrid", status: "connected", version: "1.9.0", models: [{ id: "gpt-5.4-codex", label: "GPT-5.4-Codex", ctx: "provider managed", price: "provider pricing" }] },
  { id: "cursor", name: "Cursor", vendor: "Cursor", glyph: "CU", from: "#b4b9c4", to: "#7c8fa8", kind: "ide", status: "degraded", version: "1.2.0", models: [] },
  { id: "hermes", name: "Hermes", vendor: "Nous Research", glyph: "HR", from: "#caaad3", to: "#ac78a7", kind: "terminal", status: "connected", version: "4.70b", models: [] },
  { id: "glm-code", name: "GLM Code", vendor: "Z.ai", glyph: "GL", from: "#add6c4", to: "#57a98f", kind: "terminal", status: "connected", version: "1.4.2", models: [] },
  { id: "zed", name: "Zed", vendor: "Zed Industries", glyph: "ZD", from: "#d1c193", to: "#c6a259", kind: "ide", models: [] },
].map((a) => { const extra = a as { status?: AgentStatus; version?: string; strengths?: string[]; weakSpots?: string[]; invocations?: number; successRate?: number; p50?: string }; return { ...a, kind: a.kind as AgentKind, status: extra.status ?? "not-installed", version: extra.version ?? "", strengths: extra.strengths ?? [], weakSpots: extra.weakSpots ?? [], invocations: extra.invocations ?? 0, successRate: extra.successRate ?? 0, p50: extra.p50 ?? "" }; });
export const agentById = (id: string): Agent => AGENTS.find((a) => a.id === id) ?? AGENTS[0];

export type ModeId = "plan" | "agent" | "readonly" | "full";
export const MODES: { id: ModeId; label: string; hint: string; tone: "iris" | "cyan" | "amber" | "rose"; shortcut: string; rules: string[] }[] = [
  { id: "agent", label: "Approve for me", hint: "Ask before risky actions in the selected project.", tone: "cyan", shortcut: "Shift+Tab", rules: ["Approval for destructive actions"] },
  { id: "readonly", label: "Read only", hint: "Read and explain without changing files.", tone: "amber", shortcut: "Shift+Tab", rules: ["No file writes"] },
  { id: "plan", label: "Plan first", hint: "Propose a plan before making changes.", tone: "iris", shortcut: "Shift+Tab", rules: ["Wait for plan approval"] },
  { id: "full", label: "Full access", hint: "Allow a connected runtime to edit and run project commands.", tone: "rose", shortcut: "Shift+Tab", rules: ["Explicit permission required"] },
];
export type DiffLine = { t: "ctx" | "add" | "del" | "hunk"; text: string; o?: number; n?: number };
export type DiffFile = { path: string; adds: number; dels: number; lang: string; lines: DiffLine[] };
export type Step =
  | { id: string; type: "user"; text: string; at: string; attachments?: string[] }
  | { id: string; type: "text"; text: string; agentId?: string }
  | { id: string; type: "thinking"; text: string; ms: number }
  | { id: string; type: "tool"; tool: "read" | "edit" | "write" | "bash" | "grep" | "mcp" | "browser" | "test" | "plan"; title: string; target?: string; status: "done" | "running" | "error" | "pending"; ms?: number; lines?: string[]; output?: string[]; diff?: DiffFile }
  | { id: string; type: "approval"; command: string; reason: string; risk: "low" | "medium" | "high"; state: "open" | "allowed" | "denied" }
  | { id: string; type: "checkpoint"; label: string; files: number; at: string; hash: string }
  | { id: string; type: "notice"; tone: "info" | "warn" | "error"; text: string };
export type Session = {
  id: string; title: string; agentId: string; branch: string; status: "running" | "idle" | "waiting" | "done" | "failed";
  updated: string; group: "Today" | "Yesterday" | "Earlier"; tokens: number; cost: string; steps: Step[];
  pinned?: boolean; projectId?: string; archived?: boolean; favorite?: boolean; modelId?: string; permission?: ModeId; product?: "code" | "agent";
};
export type PlanTask = { id: string; title: string; state: "done" | "active" | "todo" | "blocked"; agentId?: string; files: string[]; note?: string };
export type Run = { id: string; title: string; agentId: string; worktree: string; progress: number; status: "running" | "queued" | "review" | "done" | "failed"; cost: string; tokens: number; eta: string; variant?: string; steps: string[] };
export type Bridge = { id: string; ide: string; version: string; status: "live" | "ready" | "offline" | "update"; latency: string; capabilities: string[]; activeSession?: string; note: string };
export const SESSIONS: Session[] = [];
export const PLAN_TASKS: PlanTask[] = [];
export const RUNS: Run[] = [];
export const BRIDGES: Bridge[] = [];
export const PINNED_FILES: { path: string; tokens: number; tone: "iris" | "cyan" | "amber" | "neutral" }[] = [];
export const MCP_SERVERS: { name: string; tools: number; status: string; tone: "mint" | "amber" }[] = [];
export const RULES: { id: string; text: string; scope: string; on: boolean }[] = [];
export const SLASH_COMMANDS = [
  { cmd: "/plan", desc: "Switch to plan-first permissions", hint: "" },
  { cmd: "/project", desc: "Choose or create a project", hint: "" },
  { cmd: "/models", desc: "Manage model providers", hint: "" },
];
export const DS_COLORS = [
  { group: "Surfaces", swatches: [{ name: "base", hex: "#0c0e14", usage: "Primary workspace" }, { name: "raise", hex: "#12151d", usage: "Interactive surfaces" }, { name: "line", hex: "#1f232f", usage: "Separators" }] },
  { group: "Ink", swatches: [{ name: "ink", hex: "#eaecf3", usage: "Primary text" }, { name: "ink-2", hex: "#a3acbe", usage: "Secondary text" }, { name: "ink-3", hex: "#727c94", usage: "Metadata" }] },
  { group: "Signals", swatches: [{ name: "iris", hex: "#7c6bff", usage: "Selected state" }, { name: "mint", hex: "#46d68f", usage: "Success" }, { name: "rose", hex: "#ff6b7a", usage: "Error" }] },
];
export const DS_RADII = [{ token: "sm", px: 5, usage: "Chips" }, { token: "md", px: 7, usage: "Controls" }, { token: "lg", px: 10, usage: "Panels" }, { token: "xl", px: 14, usage: "Dialogs" }];
export const DS_MOTION = [
  { token: "rise", curve: "cubic-bezier(.16,1,.3,1)", dur: "220ms", usage: "New content" },
  { token: "pop", curve: "cubic-bezier(.16,1,.3,1)", dur: "180ms", usage: "Popovers" },
  { token: "sheet", curve: "cubic-bezier(.16,1,.3,1)", dur: "260ms", usage: "Utility panels" },
  { token: "breathe", curve: "ease-in-out", dur: "2.6s", usage: "Verified running state" },
];