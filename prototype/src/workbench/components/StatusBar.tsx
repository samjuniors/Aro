"use client";

import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { useApp } from "../lib/app";

/* =====================================================================
   STATUS BAR — the dynamic footer. Every item is state-driven: it only
   appears when it has something to say (streaming label, model + effort,
   thinking flag, permission, project/branch, token usage, workspace tabs,
   terminal). Clickable items toggle the surface they describe.
   ===================================================================== */

export const EFFORT_FOOT = [
  { label: "Minimal", color: "var(--color-ink-3)" },
  { label: "Low", color: "var(--color-cyan)" },
  { label: "Medium", color: "var(--color-iris-soft)" },
  { label: "High", color: "var(--color-amber)" },
  { label: "Ultra", color: "var(--color-rose)" },
];

export function StatusBar({ streaming, streamLabel, modelLabel, modelGlyph, permission, backend, projectName, projectBranch, tokens, panelOpen, onTogglePanel, onOpenLayout }: {
  streaming: boolean;
  streamLabel: string;
  modelLabel: string;
  modelGlyph: string;
  permission: string;
  backend: string;
  projectName?: string;
  projectBranch?: string;
  tokens: number;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onOpenLayout: () => void;
}) {
  const { termOpen, setTermOpen } = useApp();
  /* effort + thinking live in the composer's model menu — mirror them here
     through the same events the menu emits so the footer always matches */
  const [effort, setEffort] = useState(() => Number(localStorage.getItem("conductor.pref.effort") ?? 2));
  const [thinking, setThinking] = useState(() => localStorage.getItem("conductor.pref.thinking") !== "false");
  /* workspace tab count — announced by the panel on every change */
  const [tabCount, setTabCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("conductor.workspace.panel.v1") || "{}") as { tabs?: unknown[] };
      return Array.isArray(saved.tabs) ? saved.tabs.length : 0;
    } catch { return 0; }
  });
  useEffect(() => {
    const onEffort = (e: Event) => setEffort(Number((e as CustomEvent<number>).detail));
    const onThinking = (e: Event) => setThinking(Boolean((e as CustomEvent<boolean>).detail));
    const onTabs = (e: Event) => setTabCount(Number((e as CustomEvent<number>).detail));
    window.addEventListener("conductor:effort", onEffort as EventListener);
    window.addEventListener("conductor:thinking", onThinking as EventListener);
    window.addEventListener("conductor:workspace-tabs", onTabs as EventListener);
    return () => { window.removeEventListener("conductor:effort", onEffort as EventListener); window.removeEventListener("conductor:thinking", onThinking as EventListener); window.removeEventListener("conductor:workspace-tabs", onTabs as EventListener); };
  }, []);
  const effortMeta = EFFORT_FOOT[Math.min(EFFORT_FOOT.length - 1, Math.max(0, effort))];

  return <footer className="app-statusbar" role="status" aria-label="Session status">
    <span className={cn("status-item status-state", streaming && "is-live")} title={streaming ? "Agent is working" : "Waiting for input"}>
      <i aria-hidden />{streaming ? streamLabel : "Ready"}
    </span>
    <span className="status-sep" aria-hidden />
    <span className="status-item status-model" title={`Model — ${modelLabel}`}>
      <b className="status-glyph" aria-hidden>{modelGlyph}</b>
      <span className="status-model-name">{modelLabel}</span>
      <span className="status-effort" style={{ ["--effort-color" as string]: effortMeta.color }}>
        <i className="status-effort-dot" aria-hidden />{effortMeta.label}
      </span>
      {thinking && <span className="status-thinking" title="Extended thinking on">✦</span>}
    </span>
    <span className="status-sep" aria-hidden />
    <span className="status-item status-secondary" title={`Permissions — ${permission}`}>{permission}</span>
    {projectName && <>
      <span className="status-sep status-secondary" aria-hidden />
      <span className="status-item status-secondary" title="Attached project">
        {projectBranch ? `${projectName} · ${projectBranch}` : projectName}
      </span>
    </>}
    {tokens > 0 && <span className="status-item status-secondary" title="Tokens reported by the provider">{tokens.toLocaleString()} tok</span>}
    <span className="status-spacer" />
    <span className="status-item status-secondary" title="Reply backend">{backend}</span>
    <button type="button" className="status-item status-click" onClick={onTogglePanel} title={panelOpen ? "Hide workspace · ⌘L" : "Show workspace · ⌘L"}>
      {panelOpen ? `workspace · ${tabCount} tab${tabCount === 1 ? "" : "s"}` : "workspace closed"}
    </button>
    {termOpen && <button type="button" className="status-item status-click" onClick={() => setTermOpen(false)} title="Hide terminal · ⌘J">terminal live</button>}
    <button type="button" className="status-item status-click" onClick={onOpenLayout} title="Layout presets · ⌘⇧L">layout</button>
    <span className="status-item status-secondary" aria-hidden>⌘K</span>
  </footer>;
}
