"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils/cn";
import { AGENTS, MODES, agentById, type ModeId, type Session, type Step } from "./data/catalog";
import type { Project } from "./data/providers";
import { specFor } from "./data/design";
import { AppProvider, useApp, useResizable, type ProductMode } from "./lib/app";
import { WorkspaceProvider, useWorkspace } from "./lib/workspace";
import { DEMO_SESSIONS } from "./data/demo";
import { buildAgentResponse } from "./data/extra";
import { makeId, readStored, writeStored } from "./lib/storage";
import { streamLocalChat, type ChatMessage } from "./lib/inference";
import { fetchLiveReply, getBackend, historyFromSteps, sleep, type HistoryTurn } from "./lib/live";
import { runAgentBridge } from "./lib/bridge";
import { NAV_AGENT, NAV_CODE, Sidebar, type ViewId } from "./components/Sidebar";
import { Workbench, modeDefs } from "./components/Workbench";
import { Titlebar } from "./components/Titlebar";
import { AgentMark, IconBolt, IconCheck, IconEye, IconGit, IconTerminal, IconX, LogoMark } from "./components/Icons";
import { Badge, Button, IconButton, Kbd, Modal, Segmented, Tip, Toasts } from "./components/ui";
import { ConnectorsView, ProjectsView, SkillsView } from "./components/views3";
import { BrowserView, GitView, TasksView } from "./components/views2";
import { FleetView, ReviewView } from "./components/views";
import { AutomationsView } from "./components/views4";
import { ArtifactsView } from "./components/views5";
import { MemoryView } from "./components/MemoryView";
import { OnboardingStrip } from "./components/Onboarding";
import { SettingsView } from "./components/Settings";
import { ProjectDialog } from "./components/ProjectDialog";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutHelp } from "./components/ShortcutHelp";
import { TerminalPanel } from "./components/Terminal";
import { VoiceAgent } from "./components/VoiceAgent";
import { extractPlanTodos } from "./components/PlanTodoCorner";
import { Sheet } from "./components/Sheet";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PRESETS, type LayoutState } from "./components/LayoutControl";

const DEFAULT_MODEL = "provider:anthropic:claude-sonnet-4-6";
const EMPTY_SESSION = (product: ProductMode): Session => ({
  id: makeId("session"), title: "New session", agentId: "aro", branch: "", status: "idle", updated: "now", group: "Today", tokens: 0, cost: "$0.00", steps: [], product, modelId: DEFAULT_MODEL, permission: readStored<ModeId>("conductor.pref.permission", "agent"),
});
const TITLES: Partial<Record<ViewId, string>> = { settings: "Settings", tasks: "Tasks", skills: "Skills", connectors: "Connectors", projects: "Projects", review: "Changes", git: "Git", browser: "Browser", runs: "Fleet", automations: "Automations", memory: "Memory", artifacts: "Artifacts" };

const LABELS: Record<ProductMode, string[]> = {
  code: ["mapping call sites…", "negotiating editor capabilities…", "writing SessionChannel.flush()…", "running bridge test suite…"],
  agent: ["browsing sources…", "reading your docs…", "drafting…", "checking calendars…"],
};

/* run token — bumped on stop/switch so any in-flight scripted loop halts */
let runToken = 0;

/* seed the plan-capture signature from the persisted agent plan so revisiting
   a session with the same plan doesn't re-trigger the reveal */
function readPersistedPlanSig(): string | null {
  try {
    const raw = localStorage.getItem("conductor.agentplan.v1");
    const plan = raw ? (JSON.parse(raw) as { sessionId?: string; items?: { text: string }[] }) : null;
    return plan?.sessionId && Array.isArray(plan.items) ? `${plan.sessionId}:${plan.items.map((i) => i.text).join("|")}` : null;
  } catch { return null; }
}

function loadSessions(): Session[] {
  const legacy: Session[] = [];
  for (const product of ["code", "agent"] as const) {
    const stored = readStored<Session[]>(`conductor.sessions.${product}`, []);
    if (Array.isArray(stored)) legacy.push(...stored.filter((session) => session.id && !/^[sa]\d+$/.test(session.id) && !session.id.startsWith("copy-")).map((session) => ({ ...session, product, branch: "", tokens: 0, cost: "$0.00", status: "idle" as const, steps: (session.steps ?? []).filter((step) => step.type === "user") })));
  }
  const stored = readStored<Session[]>("conductor.workspace.v3.sessions", legacy);
  return Array.isArray(stored) ? stored.map((session) => ({ ...session, status: session.status === "running" ? "idle" as const : session.status, steps: session.steps ?? [] })) : [];
}

function buildCodeResponse(prompt: string, agentId: string, mode: ModeId): Step[] {
  const a = agentById(agentId); const topic = prompt.length > 58 ? prompt.slice(0, 58).trim() + "…" : prompt.trim();
  const plan: Step[] = [
    { id: makeId("message"), type: "thinking", ms: 3100, text: `Touches more than one file and the caller contract isn't obvious. Establish where the behaviour lives, what depends on it, and which invariants break. Mode is ${mode}, so stop at a plan.` },
    { id: makeId("message"), type: "text", text: `Working on **${topic}** with \`${a.name}\`. Here's what I found before proposing changes.` },
    { id: makeId("message"), type: "tool", tool: "grep", title: "Search", target: 'rg -n "export (function|class)" packages --type ts', status: "done", ms: 720, lines: ["packages/bridge/src/server.ts:11  export async function startBridge", "packages/bridge/src/channel.ts:3   export class SessionChannel", "packages/review/src/reviewer.ts:31  export class DiffReviewer"] },
    { id: makeId("message"), type: "tool", tool: "plan", title: "Plan", status: "done", ms: 900, lines: ["1. Throttled flush + acknowledged cursor on SessionChannel", "2. Capability negotiation at attach time", "3. Route editor patches through DiffReviewer", "4. Two-editor integration test · zero lost writes"] },
    { id: makeId("message"), type: "text", text: "Nothing written to disk. Press **⇧Tab** to switch to Agent and execute, or edit the plan in the side panel first." },
  ];
  const agent: Step[] = [
    { id: makeId("message"), type: "thinking", ms: 2200, text: "Smallest safe change first: throttled flush, then cursor. Extend to negotiation once green." },
    { id: makeId("message"), type: "text", text: `On it — taking **${topic}**. Flush + resume cursor first since everything depends on it.` },
    { id: makeId("message"), type: "checkpoint", label: "before channel rewrite", files: 3, at: "now", hash: Math.random().toString(16).slice(2, 9) },
    { id: makeId("message"), type: "tool", tool: "edit", title: "Edit", target: "packages/bridge/src/channel.ts", status: "done", ms: 410, diff: { path: "packages/bridge/src/channel.ts", adds: 9, dels: 1, lang: "ts", lines: [
      { t: "hunk", text: "@@ -2,7 +2,15 @@ export class SessionChannel", o: 2, n: 2 }, { t: "ctx", text: "  head = 0", o: 4, n: 4 }, { t: "del", text: "  push(frame: Frame) { this.buffer.push(frame) }", o: 5 },
      { t: "add", text: "  private acked = 0", n: 5 }, { t: "add", text: "  push(frame: Frame) { this.buffer.push(frame); this.schedule() }", n: 6 }, { t: "add", text: "  private schedule() {", n: 8 }, { t: "add", text: "    if (this.timer) return", n: 9 },
      { t: "add", text: "    this.timer = setTimeout(() => this.flush(), this.opts.flushEveryMs ?? 12)", n: 10 }, { t: "add", text: "  }", n: 11 }, { t: "ctx", text: "}", o: 6, n: 13 } ] } },
    { id: makeId("message"), type: "tool", tool: "bash", title: "Shell", target: "pnpm --filter @aro/bridge test --run", status: "done", ms: 1840, output: ["RUN v3.2.4 packages/bridge", " ✓ session-channel.test.ts (14 tests) 284ms", " ✓ resume-cursor.test.ts (6 tests) 92ms", "Test Files 2 passed · Tests 20 passed"] },
    { id: makeId("message"), type: "text", text: "Flush and resume cursor are in and green. Review the diff in **Changes**, or ask me to continue with capability negotiation." },
  ];
  return mode === "plan" || mode === "readonly" ? plan : agent;
}

function Shell() {
  const { product, setProduct, design, theme, setTheme, providers, toast, toasts, termOpen, setTermOpen, termPush, setTodos, setDockOpen, setTodoOpen, todoOpen, setSettingsSection } = useApp();
  const { projects, addProject, updateProject, requestProject, rules, demoEnabled, setAgentPlan, deleteProject: deleteWorkspaceProject } = useWorkspace();
  void demoEnabled;
  const [userSessions, setSessions] = useState<Session[]>(loadSessions);
  const sessions = useMemo(() => demoEnabled ? [...DEMO_SESSIONS.filter((d) => !userSessions.some((u) => u.id === d.id)), ...userSessions] : userSessions, [userSessions, demoEnabled]);
  const sessionsRef = useRef(sessions); sessionsRef.current = sessions;
  const isDemoSession = (id: string) => demoEnabled && DEMO_SESSIONS.some((d) => d.id === id);
  const [drafts, setDrafts] = useState<Record<ProductMode, Session>>(() => ({ code: EMPTY_SESSION("code"), agent: EMPTY_SESSION("agent") }));
  const [activeIds, setActiveIds] = useState<Record<ProductMode, string>>(() => ({ code: drafts.code.id, agent: drafts.agent.id }));
  const [view, setViewRaw] = useState<ViewId>("workbench");
  const [mode, setMode] = useState<ModeId>(() => readStored("conductor.pref.permission", "agent"));
  const [agentId, setAgentId] = useState("aro");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [cmdk, setCmdk] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [listOpen, setListOpen] = useState(() => window.innerWidth > 820 && localStorage.getItem("conductor.sidebar.collapsed") !== "true");
  /* Right workspace panel (Codex-style dockable review / browser pane) */
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth > 900);
  const [rightTab, setRightTab] = useState<"changes" | "browser">("changes");
  const [statusOpen, setStatusOpen] = useState(false);
  /* rotating stream label + first-run onboarding + agent-picker modal */
  const [label, setLabel] = useState(LABELS.code[0]);
  const [onboarding, setOnboarding] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newAgent, setNewAgent] = useState("aro");
  const [newMode, setNewMode] = useState<ModeId>("plan");
  const controller = useRef<AbortController | null>(null);
  /* abort for the in-flight agent-bridge run + timers for the scripted run */
  const bridgeAbort = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const sidebar = useResizable(272, 220, 460);
  const right = useResizable(540, 380, 1100, "left");
  const active = sessions.find((s) => s.id === activeIds[product]) ?? drafts[product];
  const project = projects.find((p) => p.id === active.projectId);
  const productSessions = sessions.filter((s) => (s.product ?? "code") === product);
  const streaming = runningId === active.id;

  /* ---------------- step helpers (sessions carry their steps) ---------------- */
  const appendSteps = useCallback((sid: string, steps: Step[]) => setSessions((all) => all.map((s) => s.id === sid ? { ...s, steps: [...s.steps, ...steps] } : s)), []);
  const patchStep = useCallback((sid: string, stepId: string, patch: Record<string, unknown>) => setSessions((all) => all.map((s) => s.id === sid ? { ...s, steps: s.steps.map((st) => st.id === stepId ? ({ ...st, ...patch } as Step) : st) } : s)), []);
  const appendText = useCallback((sid: string, stepId: string, word: string) => setSessions((all) => all.map((s) => s.id === sid ? { ...s, steps: s.steps.map((st) => st.id === stepId && st.type === "text" ? { ...st, text: st.text + word } : st) } : s)), []);
  const setStatus = useCallback((sid: string, status: Session["status"]) => setSessions((all) => all.map((s) => s.id === sid ? { ...s, status } : s)), []);

  useEffect(() => writeStored("conductor.workspace.v3.sessions", userSessions), [userSessions]);
  useEffect(() => localStorage.setItem("conductor.sidebar.collapsed", String(!listOpen)), [listOpen]);

  /* ---------------- sticky agent plan (composer corner) ----------------
     Whenever a session's steps contain an agent plan, capture it into the
     workspace-sticky plan so it stays visible at the composer corner across
     session/project switches until cleared or replaced by a newer plan. */
  const capturedPlanSig = useRef<string | null>(null);
  if (capturedPlanSig.current === null) capturedPlanSig.current = readPersistedPlanSig();
  useEffect(() => {
    const planLines = extractPlanTodos(active.steps);
    if (planLines.length === 0) return;
    const signature = `${active.id}:${planLines.join("|")}`;
    if (signature === capturedPlanSig.current) return;
    const fresh = capturedPlanSig.current !== null;
    capturedPlanSig.current = signature;
    setAgentPlan({
      items: planLines.map((text, i) => ({ id: `plan-${active.id}-${i}`, text, state: i === 0 ? "doing" as const : "todo" as const })),
      sessionId: active.id,
      title: active.title,
      updatedAt: Date.now(),
    });
    /* pop the corner panel open when the plan lands live during a run */
    if (fresh && runningId === active.id) window.dispatchEvent(new CustomEvent("conductor:agent-plan"));
  }, [active.steps, active.id, active.title, setAgentPlan, runningId]);
  /* agent todos created mid-run (edit checkpoints) extend the corner plan */
  const trackAgentTodo = useCallback((text: string) => {
    setAgentPlan((plan) => plan
      ? { ...plan, items: [...plan.items, { id: `ap${Date.now()}`, text, state: "doing" as const }], updatedAt: Date.now() }
      : { items: [{ id: `ap${Date.now()}`, text, state: "doing" as const }], title: "Agent checklist", updatedAt: Date.now() });
  }, [setAgentPlan]);

  useEffect(() => {
    const profile = specFor(design);
    sidebar.setSize(profile.panels.sidebar);
    if (!profile.themes.includes(theme)) setTheme(profile.defaultTheme);
  }, [design]);
  useEffect(() => { document.title = runningId ? "Working | Aro" : "Aro"; }, [runningId]);
  useEffect(() => { if (!runningId) return; const i = window.setInterval(() => setLabel(LABELS[product][Math.floor(Math.random() * LABELS[product].length)]), 2200); return () => clearInterval(i); }, [runningId, product]);
  useEffect(() => { setOnboarding(!localStorage.getItem("aro.onboarding.done")); }, []);
  const dismissOnboarding = () => { localStorage.setItem("aro.onboarding.done", "1"); setOnboarding(false); toast("Aro is ready — the doctor is in Settings if you need it", "mint"); };
  useEffect(() => () => { controller.current?.abort(); bridgeAbort.current?.abort(); clearTimers(); }, []);

  const setView = useCallback((next: ViewId) => {
    const alias: Partial<Record<ViewId, string>> = { agents: "agents", bridges: "editors", design: "design" };
    if (alias[next]) { setSettingsSection(alias[next]!); setViewRaw("settings"); return; }
    setViewRaw((current) => current === next && next !== "workbench" ? "workbench" : next);
  }, [setSettingsSection]);
  const closeSheet = useCallback(() => setViewRaw("workbench"), []);

  const patchActive = (patch: Partial<Session>) => {
    if (isDemoSession(active.id)) {
      const fork: Session = { ...active, ...patch, id: makeId("session"), title: `${active.title} (copy)`, status: "idle" as const, archived: false };
      setSessions((all) => [fork, ...all]);
      setActiveIds((all) => ({ ...all, [product]: fork.id }));
      toast("Demo is read-only — forked so you can edit freely.", "iris");
      return;
    }
    if (sessions.some((s) => s.id === active.id)) setSessions((all) => all.map((s) => s.id === active.id ? { ...s, ...patch } : s));
    else setDrafts((all) => ({ ...all, [product]: { ...all[product], ...patch } }));
  };
  const chooseProject = (id?: string, createdProject?: Project) => {
    const selected = createdProject ?? projects.find((p) => p.id === id);
    const defaults = selected?.defaults;
    const patch: Partial<Session> = { projectId: selected?.id, branch: selected?.sources?.find((s) => s.branch)?.branch ?? "", ...(active.steps.length === 0 && defaults ? { agentId: defaults.agentId ?? agentId, permission: (defaults.mode as ModeId) ?? mode, modelId: defaults.modelId ?? modelId } : {}) };
    patchActive(patch);
    if (selected && !sessions.some((session) => session.id === active.id)) setSessions((all) => all.some((session) => session.id === active.id) ? all : [{ ...active, ...patch }, ...all]);
    if (!active.steps.length && defaults) {
      if (defaults.agentId) setAgentId(defaults.agentId);
      if (defaults.mode) setMode(defaults.mode as ModeId);
      if (defaults.modelId) setModelId(defaults.modelId);
    }
  };
  const resetUtilities = () => {
    setRightOpen(false); setTermOpen(false); setDockOpen(false); setTodoOpen(false); setCmdk(false); setHelpOpen(false); setLayoutOpen(false); setStatusOpen(false); setNewOpen(false); closeSheet();
    window.dispatchEvent(new CustomEvent("conductor:voice:minimize"));
  };
  const stop = () => {
    controller.current?.abort(); bridgeAbort.current?.abort(); clearTimers(); runToken++;
    setRunningId(null);
    patchActive({ steps: [...active.steps, { id: makeId("message"), type: "notice", tone: "warn", text: "Interrupted — partial edits kept, checkpoint retained." }] });
  };
  const newSession = (adapter?: string, projectId?: string) => {
    stop();
    const selected = projects.find((p) => p.id === projectId);
    const session: Session = { ...EMPTY_SESSION(product), projectId: selected?.id, agentId: adapter ?? selected?.defaults?.agentId ?? "aro", modelId: selected?.defaults?.modelId ?? DEFAULT_MODEL, permission: (selected?.defaults?.mode as ModeId) ?? readStored<ModeId>("conductor.pref.permission", "agent") };
    setSessions((all) => [session, ...all]); setActiveIds((all) => ({ ...all, [product]: session.id }));
    setAgentId(session.agentId); setMode(session.permission!); setModelId(session.modelId!); resetUtilities();
  };
  const openNew = (agent?: string) => { if (agent) setNewAgent(agent); setNewOpen(true); };
  const selectSession = (id: string) => {
    clearTimers(); runToken++; controller.current?.abort(); bridgeAbort.current?.abort(); setRunningId(null);
    const selected = sessions.find((s) => s.id === id);
    if (!selected) return;
    const side = selected.product ?? "code";
    setProduct(side); setActiveIds((all) => ({ ...all, [side]: id })); setAgentId(selected.agentId); setMode(selected.permission ?? "agent"); setModelId(selected.modelId ?? DEFAULT_MODEL); closeSheet();
  };

  /* scripted demo run — harness steps close with a live model reply streamed word-by-word */
  const runScripted = useCallback((sid: string, text: string) => {
    clearTimers();
    const token = ++runToken;
    const full = product === "code" ? buildCodeResponse(text, agentId, mode) : buildAgentResponse(text);
    let fallback = "Done. Everything checks out — say the word if you want the diff opened for review.";
    const script = [...full];
    const last = script[script.length - 1];
    if (last && last.type === "text") { fallback = last.text; script.pop(); }
    setRunningId(sid);
    const finishTurn = () => {
      void (async () => {
        const history = historyFromSteps(sessionsRef.current.find((s) => s.id === sid)?.steps ?? []);
        const reply = await fetchLiveReply(history, fallback);
        if (token !== runToken) return;
        const id = makeId("message");
        appendSteps(sid, [{ id, type: "text", text: "", agentId }]);
        for (const w of reply.split(/(\s+)/)) {
          if (token !== runToken) return;
          await sleep(14 + Math.random() * 22);
          appendText(sid, id, w);
        }
        if (token !== runToken) return;
        setStatus(sid, "done");
        setRunningId(null);
      })();
    };
    if (script.length === 0) { timers.current.push(window.setTimeout(finishTurn, 320)); return; }
    script.forEach((s, i) => timers.current.push(window.setTimeout(() => {
      appendSteps(sid, [s]);
      if (s.type === "tool" && (s.tool === "bash" || s.tool === "test")) termPush([{ t: `$ ${s.target}`, k: "cmd" as const }, ...(s.output ?? []).map((t) => ({ t, k: t.trim().startsWith("✓") ? ("ok" as const) : t.trim().startsWith("✗") ? ("err" as const) : undefined }))]);
      if (s.type === "tool" && s.tool === "edit") { termPush([{ t: `[agent] edited ${s.target}`, k: "dim" as const }]); setTodos((t) => [{ id: `ag${Date.now()}`, text: `Verify ${s.target?.split("/").pop()} change`, state: "doing", by: "agent" as const }, ...t]); trackAgentTodo(`Verify ${s.target?.split("/").pop()} change`); }
      if (i === script.length - 1) finishTurn();
    }, 320 + i * 1100)));
  }, [product, agentId, mode, appendSteps, appendText, setStatus, termPush, setTodos, trackAgentTodo]);

  /* agent backend: real tool loop through the aro bridge (aro.jsonl/1) */
  const runAgentTurn = useCallback(async (sid: string, history: HistoryTurn[]) => {
    clearTimers();
    const token = ++runToken;
    const abort = new AbortController();
    bridgeAbort.current = abort;
    setRunningId(sid);
    const finish = (failed: boolean) => { setStatus(sid, failed ? "failed" : "done"); setRunningId(null); };
    let replyId: string | null = null;
    let errored = false;
    try {
      for await (const ev of runAgentBridge(history, abort.signal)) {
        if (token !== runToken) return;
        if (ev.type === "thinking") {
          appendSteps(sid, [{ id: makeId("message"), type: "thinking", text: ev.label, ms: ev.ms }]);
        } else if (ev.type === "tool_call") {
          appendSteps(sid, [ev.tool === "web_search"
            ? { id: ev.callId, type: "tool", tool: "browser", title: "Web search", target: String(ev.args.query ?? ""), status: "running" }
            : { id: ev.callId, type: "tool", tool: "read", title: "Read page", target: String(ev.args.url ?? ""), status: "running" }]);
        } else if (ev.type === "tool_result") {
          patchStep(sid, ev.callId, { status: ev.ok ? "done" : "error", ms: ev.ms, lines: ev.lines });
        } else if (ev.type === "assistant_delta") {
          if (!replyId) {
            replyId = makeId("message");
            appendSteps(sid, [{ id: replyId, type: "text", text: ev.text, agentId }]);
          } else {
            appendText(sid, replyId, ev.text);
          }
        } else if (ev.type === "error") {
          errored = true;
          appendSteps(sid, [{ id: makeId("message"), type: "notice", tone: "error", text: `Bridge: ${ev.message}` }]);
        } else if (ev.type === "done") {
          finish(errored);
        }
      }
    } catch (err) {
      if (abort.signal.aborted) { finish(false); return; }
      if (token !== runToken) return;
      /* bridge unreachable — fall back to the scripted demo run, like live mode does */
      appendSteps(sid, [{ id: makeId("message"), type: "notice", tone: "warn", text: `Bridge offline (${err instanceof Error ? err.message : "network error"}) — falling back to the scripted demo run.` }]);
      runScripted(sid, history[history.length - 1]?.content ?? "");
    } finally {
      if (bridgeAbort.current === abort) bridgeAbort.current = null;
    }
  }, [appendSteps, appendText, patchStep, setStatus, runScripted, agentId]);

  const send = async (text: string, attachments: File[] = []): Promise<boolean> => {
    if (runningId) { toast("Stop the current response before sending another message.", "amber"); return false; }
    let target = active;
    if (isDemoSession(active.id)) {
      target = { ...active, id: makeId("session"), title: `${active.title} (copy)`, status: "idle" as const, archived: false };
      setSessions((all) => [target, ...all]);
      setActiveIds((all) => ({ ...all, [product]: target.id }));
      toast("Demo is read-only — forked so you can continue freely.", "iris");
    }
    const backend = getBackend();
    /* history is captured before the user step lands in the transcript */
    const prior = historyFromSteps(target.steps);
    const user: Step = { id: makeId("message"), type: "user", text, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), attachments: attachments.map((file) => file.name) };
    const next: Session = { ...target, title: target.title === "New session" ? text.slice(0, 65) : target.title, steps: [...target.steps, user], status: "running", modelId, permission: mode, updated: "now" };
    setSessions((all) => all.some((s) => s.id === target.id) ? all.map((s) => s.id === target.id ? next : s) : [next, ...all]);
    setRunningId(target.id); closeSheet();

    /* agent backend — real tool loop via the aro bridge daemon */
    if (backend.mode === "agent") { void runAgentTurn(target.id, [...prior, { role: "user", content: text }]); return true; }
    /* live backend — scripted harness closes with a reply from your OpenAI-compatible endpoint */
    if (backend.mode === "live") { runScripted(target.id, text); return true; }

    /* demo backend — a connected local provider streams real local inference */
    const parts = modelId.startsWith("provider:") ? modelId.split(":") : [];
    const provider = providers.find((p) => p.id === parts[1]);
    const model = parts.slice(2).join(":");
    if (!(provider && provider.kind === "local" && provider.status === "ready" && provider.models.some((m) => m.id === model))) {
      /* no connected local model — scripted harness + the sandbox model */
      runScripted(target.id, text);
      return true;
    }
    const replyId = makeId("message");
    setSessions((all) => all.map((s) => s.id === target.id ? { ...s, steps: [...s.steps, { id: replyId, type: "text", text: "" }] } : s));
    const abort = new AbortController(); controller.current = abort;
    let reply = "";
    try {
      const fileContext: string[] = [];
      for (const file of attachments) {
        if (file.size <= 128_000 && !/^(image|video|audio)\//.test(file.type)) fileContext.push(`File: ${file.name}\n${await file.text()}`);
      }
      const messages: ChatMessage[] = [{ role: "system", content: `You are Aro, a helpful coding and task assistant. This connection supports chat only: you cannot edit files, execute commands, or claim to have tested changes. Permissions selected: ${mode}. Global rules: ${rules.join("; ")}. ${project ? `Project: ${project.name}. Project rules: ${(project.defaults?.rules ?? []).join("; ")}.` : "No project selected."}` }];
      for (const step of [...target.steps, user]) if (step.type === "user" || step.type === "text") messages.push({ role: step.type === "user" ? "user" : "assistant", content: step.text });
      if (fileContext.length) messages[messages.length - 1].content += `\n\n${fileContext.join("\n\n")}`;
      const usage = await streamLocalChat(provider, model, messages, (chunk) => {
        reply += chunk;
        setSessions((all) => all.map((s) => s.id === target.id ? { ...s, steps: s.steps.map((step) => step.id === replyId ? { id: replyId, type: "text", text: reply } : step) } : s));
      }, abort.signal);
      setSessions((all) => all.map((s) => s.id === target.id ? { ...s, status: "done", tokens: (usage.input ?? 0) + (usage.output ?? 0) } : s));
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === "AbortError";
      const message = cancelled ? "Response stopped." : error instanceof TypeError ? "Provider connection failed. Check its server and CORS settings. No tasks or files were changed." : error instanceof Error ? error.message : "The provider request failed.";
      setSessions((all) => all.map((s) => s.id === target.id ? { ...s, status: cancelled ? "idle" : "failed", steps: [...s.steps.filter((step) => step.id !== replyId || Boolean(reply)), { id: makeId("message"), type: "notice", tone: cancelled ? "info" : "error", text: message }] } : s));
    } finally { if (controller.current === abort) { controller.current = null; setRunningId(null); } }
    return true;
  };

  const archive = (id: string, archived: boolean) => { if (isDemoSession(id)) { toast("Reference demo can't be archived. Duplicate it first.", "amber"); return; } setSessions((all) => all.map((s) => s.id === id ? { ...s, archived } : s)); if (id === active.id && archived) newSession(); toast(archived ? "Session archived" : "Session restored", "mint"); };
  const deleteSession = (id: string) => { if (isDemoSession(id)) { toast("Reference demo can't be deleted. Turn off Demo to hide it.", "amber"); return; } setSessions((all) => all.filter((s) => s.id !== id)); if (id === active.id) { setActiveIds((all) => ({ ...all, [product]: drafts[product].id })); resetUtilities(); } toast("Session deleted", "amber"); };
  const moveSession = (id: string, projectId: string) => { if (isDemoSession(id)) { toast("Reference demo can't be moved. Duplicate it first.", "amber"); return; } setSessions((all) => all.map((s) => s.id === id ? { ...s, projectId } : s)); toast("Session moved", "mint"); };
  const duplicate = (id: string) => { const source = sessions.find((s) => s.id === id); if (!source) return; const copy = { ...source, id: makeId("session"), title: `${source.title} (copy)`, status: "idle" as const, archived: false }; setSessions((all) => [copy, ...all]); selectSession(copy.id); setActiveIds((all) => ({ ...all, [product]: copy.id })); };
  const createProject = (name: string) => addProject({ name, sources: [] }).id;

  /* project lifecycle: deleting a project removes its sessions; the active
     session escapes to a fresh draft if its project disappears */
  const deleteProject = (id: string) => {
    const doomed = projects.find((p) => p.id === id);
    if (!doomed) return;
    if (doomed.id === "demo-sofia-ui") { toast("Reference demo can't be deleted. Toggle Demo off instead.", "amber"); return; }
    const sessionCount = sessions.filter((s) => s.projectId === id).length;
    deleteWorkspaceProject(id);
    setSessions((all) => all.filter((s) => s.projectId !== id));
    if (sessions.some((s) => s.id === active.id && s.projectId === id)) { resetUtilities(); newSession(); }
    toast(sessionCount > 0 ? `Deleted ${doomed.name} and its ${sessionCount} session${sessionCount === 1 ? "" : "s"}.` : `Deleted ${doomed.name}.`, "amber");
  };

  const layout: LayoutState = { list: listOpen, terminal: termOpen, panel: rightOpen, status: statusOpen };
  const setLayout = (state: LayoutState) => { setListOpen(state.list); setTermOpen(state.terminal); setRightOpen(state.panel); setStatusOpen(state.status); };
  const cyclePermission = () => { const definitions = modeDefs(product); setMode(definitions[(definitions.findIndex((m) => m.id === mode) + 1) % definitions.length].id); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (e.key === "Tab" && e.shiftKey && (document.activeElement as HTMLElement | null)?.dataset.composer === "true") { e.preventDefault(); cyclePermission(); return; }
      if (!meta) { if (e.key === "Escape" && !document.querySelector('[aria-modal="true"]')) { if (cmdk) setCmdk(false); else if (helpOpen) setHelpOpen(false); else if (newOpen) setNewOpen(false); else if (view !== "workbench") closeSheet(); else if (runningId) stop(); } return; }
      if (key === "k" && !e.shiftKey) { e.preventDefault(); setCmdk((v) => !v); }
      else if (key === ",") { e.preventDefault(); setView("settings"); }
      else if (key === "/") { e.preventDefault(); setHelpOpen((v) => !v); }
      else if (key === "n") { e.preventDefault(); openNew(); }
      else if (key === "j") { e.preventDefault(); setTermOpen(!termOpen); }
      else if (key === "l" && e.shiftKey) { e.preventDefault(); setLayoutOpen((v) => !v); }
      else if (key === "l" || key === "\\") { e.preventDefault(); setRightOpen((v) => !v); }
      else if (key === "b" && e.shiftKey) { e.preventDefault(); setListOpen((v) => !v); }
      else if (key === "[") { e.preventDefault(); setRightTab((t) => (t === "changes" ? "browser" : "changes")); setRightOpen(true); }
      else if (key === "v" && e.shiftKey) { e.preventDefault(); closeSheet(); window.dispatchEvent(new CustomEvent("conductor:voice:dictate")); }
      else if (key === "f" && e.shiftKey) { e.preventDefault(); setLayout(PRESETS[1].state); }
      else if (key === "e") { e.preventDefault(); setProduct(product === "code" ? "agent" : "code"); resetUtilities(); }
      else if (/^[1-9]$/.test(key)) { const nav = product === "code" ? NAV_CODE : NAV_AGENT; const item = nav[Number(key) - 1]; if (item) { e.preventDefault(); setView(item.id); } }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });
  useEffect(() => {
    const paneEvent = (e: Event) => { const detail = (e as CustomEvent<string>).detail; setRightTab(detail === "browser" ? "browser" : "changes"); setRightOpen(true); };
    const settings = () => setViewRaw("settings");
    const providerSettings = () => { setSettingsSection("providers"); setViewRaw("settings"); };
    const help = () => setHelpOpen(true);
    const create = () => newSession();
    const terminal = () => setTermOpen(!termOpen);
    const todo = () => setTodoOpen(!todoOpen);
    const events: [string, EventListener][] = [["conductor:pane", paneEvent], ["conductor:settings", settings], ["conductor:providers", providerSettings], ["conductor:help", help], ["conductor:new-session", create], ["conductor:terminal", terminal], ["conductor:todo", todo]];
    events.forEach(([name, fn]) => window.addEventListener(name, fn));
    return () => events.forEach(([name, fn]) => window.removeEventListener(name, fn));
  });

  const latestReply = [...active.steps].reverse().find((s): s is Extract<Step, { type: "text" }> => s.type === "text")?.text.replace(/[`*#]/g, "") ?? "";
  const empty = !active.steps.length;
  const sidebarProps = { view, setView, sessions: productSessions, activeId: active.id, onSelect: selectSession, onNew: (projectId?: string) => newSession(undefined, projectId), projects, onUpdateProject: updateProject, onCreateProject: createProject, onRequestProject: () => requestProject(), onArchive: archive, onDelete: deleteSession, onMoveProject: moveSession, onDuplicate: duplicate, onTogglePin: (id: string) => { if (isDemoSession(id)) { toast("Reference demo can't be pinned. Duplicate it first.", "amber"); return; } setSessions((all) => all.map((s) => s.id === id ? { ...s, favorite: !s.favorite, pinned: false } : s)); }, onRename: (id: string, title: string) => { if (isDemoSession(id)) { toast("Reference demo can't be renamed. Duplicate it first.", "amber"); return; } setSessions((all) => all.map((s) => s.id === id ? { ...s, title } : s)); }, onCollapse: () => setListOpen(false), onDeleteProject: deleteProject };

  return <div className="app-shell flex h-full flex-col bg-base text-ink">
    <Titlebar onOpenCmdk={() => setCmdk(true)} onNew={() => openNew()} setView={setView} layout={layout} setLayout={setLayout} panelLabel="Workspace panel" layoutOpen={layoutOpen} setLayoutOpen={setLayoutOpen} onHelp={() => setHelpOpen(true)} project={project} />
    <div className="flex min-h-0 flex-1">
      {listOpen && <><button className="mobile-pane-scrim" aria-label="Close sidebar" onClick={() => setListOpen(false)} /><div style={{ width: sidebar.size }} className="app-sidebar-shell shrink-0"><Sidebar {...sidebarProps} /></div><div {...sidebar.handle} className={`${sidebar.handle.className} app-sidebar-resizer`} /></>}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-0 flex-1 flex-col">
            {onboarding && view === "workbench" && <div className="shrink-0 px-3 pt-3"><OnboardingStrip onDismiss={dismissOnboarding} /></div>}
            <div className="relative flex min-h-0 min-w-0 flex-1">
              <Workbench key={active.id} session={active} sessions={productSessions} onSelect={selectSession} onNew={() => openNew()} steps={active.steps} streaming={streaming} streamLabel={label} mode={mode} setMode={setMode} agentId={agentId} setAgentId={setAgentId} modelId={modelId} setModelId={setModelId} onSend={send} onStop={stop} project={project} onChooseProject={chooseProject} />
              {view !== "workbench" && <Sheet title={TITLES[view] ?? "Settings"} onClose={closeSheet} streaming={streaming}><ErrorBoundary key={view} label={TITLES[view]}>
                {view === "settings" && <SettingsView onStart={(id) => newSession(id)} />}
                {view === "projects" && <ProjectsView projects={projects} sessions={productSessions} onUpdate={updateProject} onNew={(id) => newSession(undefined, id)} onOpenThread={selectSession} />}
                {view === "tasks" && <TasksView onOpenSession={selectSession} />}
                {view === "skills" && <SkillsView />}{view === "connectors" && <ConnectorsView />}
                {view === "automations" && <AutomationsView />}
                {view === "memory" && <MemoryView />}
                {view === "artifacts" && <ArtifactsView />}
                {view === "git" && <GitView onReview={() => setView("review")} project={project} />}
                {view === "browser" && <BrowserView onAskAgent={(text) => void send(text)} />}
                {view === "runs" && <FleetView />}{view === "review" && <ReviewView project={project} />}
              </ErrorBoundary></Sheet>}
            </div>
          </main>
          {/* Right workspace panel — Codex-style docked review / browser pane */}
          {rightOpen && <><button className="mobile-pane-scrim app-right-scrim" aria-label="Close workspace panel" onClick={() => setRightOpen(false)} /><div {...right.handle} className={`${right.handle.className} app-right-resizer`} /><div style={{ width: right.size }} className="app-right-panel shrink-0">
            <div className="app-right-tabs">
              {([{ id: "changes", label: "Changes", icon: IconGit }, { id: "browser", label: "Browser", icon: IconEye }] as const).map((t) => (
                <button key={t.id} onClick={() => setRightTab(t.id)} className={cn("app-right-tab", rightTab === t.id && "is-active")} aria-pressed={rightTab === t.id}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
              <span className="app-right-tab-spacer" />
              <Tip label="Close panel · ⌘L"><IconButton icon={IconX} label="Close workspace panel" size={24} onClick={() => setRightOpen(false)} /></Tip>
            </div>
            <div className="app-right-body">
              {rightTab === "changes" ? <ReviewView project={project} /> : <BrowserView onAskAgent={(text) => void send(text)} />}
            </div>
          </div></>}
        </div>
        {termOpen && <TerminalPanel onAskAgent={(text) => void send(text)} />}
      </div>
    </div>
    {statusOpen && !empty && <footer className="flex h-[25px] items-center gap-3 border-t border-line-soft px-3 font-mono text-[10px] text-ink-3"><span>{streaming ? "Responding" : "Idle"}</span><span>{active.tokens ? `${active.tokens.toLocaleString()} tokens reported` : "Usage not reported"}</span>{project && <span className="truncate">{project.name}</span>}</footer>}
    <CommandPalette open={cmdk} onClose={() => setCmdk(false)} setView={setView} onSelectSession={selectSession} onNew={newSession} sessions={sessions} />
    <ProjectDialog /><ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    <VoiceAgent onSend={(text) => void send(text)} onNavigate={setView} reply={latestReply} streaming={Boolean(runningId)} />
    <Toasts items={toasts} />

    <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Start a session" sub="Pick the agent and the starting mode — both change later from the composer." width={660}>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AGENTS.map((a) => { const on = newAgent === a.id; const dis = a.status !== "connected"; return (
            <button key={a.id} disabled={dis} onClick={() => setNewAgent(a.id)} className={cn("flex cursor-pointer items-start gap-2 rounded-[10px] border p-2.5 text-left transition-all", on ? "border-iris/50 bg-iris-tint shadow-glow-iris" : "border-line-soft bg-raise hover:border-line-strong", dis && "cursor-not-allowed opacity-40")}>
              <AgentMark glyph={a.glyph} from={a.from} to={a.to} size={22} /><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-ink">{a.name}</span><span className="block truncate font-mono text-[9.5px] text-ink-4">{dis ? a.status.replace("-", " ") : a.models[0]?.label ?? a.vendor}</span></span>{on && <IconCheck size={12} className="text-iris-soft" />}
            </button>); })}
        </div>
        <div>
          <span className="mb-2 block font-mono text-[9.5px] tracking-[.16em] text-ink-4 uppercase">starting mode</span>
          <Segmented value={newMode} onChange={setNewMode} size="md" items={MODES.map((m) => ({ value: m.id, label: m.label, tone: m.tone }))} />
          <p className="mt-2 text-[12px] text-ink-3">{modeDefs(product).find((m) => m.id === newMode)!.desc}</p>
        </div>
        <div className="flex items-center gap-2 border-t border-line-soft pt-3">
          <Badge tone="neutral" mono dot>aro/platform</Badge>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-4"><Kbd>⌘N</Kbd> opens this dialog</span>
          <div className="ml-auto flex gap-2"><Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" icon={IconBolt} onClick={() => { const a = newAgent; const m = newMode; setNewOpen(false); newSession(a); setMode(m); }}>Start</Button></div>
        </div>
      </div>
    </Modal>
    <Boot />
  </div>;
}

function Boot() {
  const [gone, setGone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGone(true), 380); return () => clearTimeout(t); }, []);
  if (gone) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-void">
      <LogoMark size={42} />
      <span className="font-display text-[13px] font-semibold tracking-[0.22em] text-ink-3 uppercase">Aro</span>
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-4"><IconTerminal size={10} className="animate-breathe text-iris-soft" />attaching daemon…</span>
    </div>
  );
}

export default function App() {
  return <AppProvider><WorkspaceProvider><ErrorBoundary label="Aro"><Shell /></ErrorBoundary></WorkspaceProvider></AppProvider>;
}
