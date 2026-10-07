"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { makeId, readStored, writeStored } from "../lib/storage";
import { IconBrain, IconGit, IconGlobe, IconPin, IconTerminal, IconX } from "./Icons";
import { Menu, MenuSep, Tip } from "./ui";
import { BrowserView } from "./views2";
import { ReviewView } from "./views";
import { ArtifactsView } from "./views5";
import { MemoryView } from "./MemoryView";

/* =====================================================================
   WORKSPACE PANEL — Codex-style docked workspace with real tabs.
   Every tool (browse / changes / artifacts / terminal / memory) opens as
   its own tab; tabs can be added with "+", closed individually, and the
   whole panel snaps away when dragged towards the screen edge. The layout
   (width, tabs, active tab) persists across reloads; a fresh user starts
   with just the chat and the single corner icon.
   ===================================================================== */

export type WorkspaceTool = "browse" | "changes" | "artifacts" | "terminal" | "memory";
export const WORKSPACE_TOOLS: { id: WorkspaceTool; label: string; icon: ComponentType<{ size?: number; className?: string }>; desc: string }[] = [
  { id: "browse", label: "Browse", icon: IconGlobe, desc: "Live page previews at any device width" },
  { id: "changes", label: "Changes", icon: IconGit, desc: "Review the working diff before committing" },
  { id: "artifacts", label: "Artifacts", icon: IconPin, desc: "Pinned outputs from agent sessions" },
  { id: "terminal", label: "Terminal", icon: IconTerminal, desc: "Shell output streamed next to chat" },
  { id: "memory", label: "Memory", icon: IconBrain, desc: "Everything the agent remembers" },
];
export const toolMeta = (tool: WorkspaceTool) => WORKSPACE_TOOLS.find((t) => t.id === tool)!;

export type PanelTab = { id: string; tool: WorkspaceTool };
type PersistedPanel = { tabs: PanelTab[]; activeId: string | null; size: number };
const PANEL_KEY = "conductor.workspace.panel.v1";
const DEFAULT_SIZE = 540;
const SNAP_CLOSE_AT = 300; /* dragging below this width releases → panel closes */

export function WorkspacePanel({ open, onOpenChange, project, onAskAgent }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onAskAgent: (text: string) => void;
}) {
  const { toast } = useApp();
  const [panel, setPanel] = useState<PersistedPanel>(() => {
    const saved = readStored<PersistedPanel>(PANEL_KEY, { tabs: [], activeId: null, size: DEFAULT_SIZE });
    return { tabs: Array.isArray(saved.tabs) ? saved.tabs.filter((t) => WORKSPACE_TOOLS.some((tool) => tool.id === t.tool)) : [], activeId: saved.activeId, size: Math.max(360, Math.min(1100, saved.size || DEFAULT_SIZE)) };
  });
  const [dragging, setDragging] = useState(false);
  const [snapHint, setSnapHint] = useState(false);
  const snapRef = useRef(false);
  const active = panel.tabs.find((t) => t.id === panel.activeId) ?? panel.tabs[panel.tabs.length - 1] ?? null;

  /* persist the layout + announce the tab count (footer listens) */
  useEffect(() => {
    writeStored(PANEL_KEY, panel);
    window.dispatchEvent(new CustomEvent("conductor:workspace-tabs", { detail: panel.tabs.length }));
  }, [panel]);

  const addTab = useCallback((tool: WorkspaceTool) => {
    const tab: PanelTab = { id: makeId("wtab"), tool };
    setPanel((p) => ({ ...p, tabs: [...p.tabs, tab], activeId: tab.id }));
  }, []);

  const closeTab = (id: string) => {
    const index = panel.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const tabs = panel.tabs.filter((t) => t.id !== id);
    if (tabs.length === 0) {
      setPanel((p) => ({ ...p, tabs, activeId: null }));
      onOpenChange(false); /* closing the last tab hides the panel */
      return;
    }
    setPanel((p) => ({ ...p, tabs, activeId: p.activeId === id ? (tabs[Math.max(0, index - 1)]?.id ?? tabs[0].id) : p.activeId }));
  };

  /* external "open this tool here" requests — focus an existing tab or
     create one (App opens the panel itself from the same event) */
  useEffect(() => {
    const pane = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "cycle") {
        setPanel((p) => {
          if (p.tabs.length < 2) return p;
          const index = p.tabs.findIndex((t) => t.id === (p.activeId ?? p.tabs[0].id));
          return { ...p, activeId: p.tabs[(index + 1) % p.tabs.length].id };
        });
        return;
      }
      const tool: WorkspaceTool = detail === "browser" || detail === "browse" ? "browse" : "changes";
      setPanel((p) => {
        const existing = p.tabs.find((t) => t.tool === tool);
        if (existing) return { ...p, activeId: existing.id };
        const id = makeId("wtab");
        return { ...p, tabs: [...p.tabs, { id, tool }], activeId: id };
      });
    };
    window.addEventListener("conductor:pane", pane as EventListener);
    return () => window.removeEventListener("conductor:pane", pane as EventListener);
  }, []);

  /* ------- resizable split: drag to adjust, drag to the edge to close ------- */
  const onResizeDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const s0 = panel.size;
    setDragging(true);
    snapRef.current = false;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => {
      const next = Math.max(216, Math.min(1100, s0 - (ev.clientX - x0)));
      snapRef.current = next < SNAP_CLOSE_AT;
      setSnapHint(snapRef.current);
      setPanel((p) => ({ ...p, size: next }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDragging(false);
      setSnapHint(false);
      if (snapRef.current) {
        setPanel((p) => ({ ...p, size: s0 })); /* restore width for next open */
        onOpenChange(false);
        toast("Workspace hidden — ⌘L or the corner icon brings it back", "iris");
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (!open) return null;
  return <>
    <button className="mobile-pane-scrim workspace-scrim" aria-label="Close workspace panel" onClick={() => onOpenChange(false)} />
    <div
      onMouseDown={onResizeDown}
      onDoubleClick={() => setPanel((p) => ({ ...p, size: DEFAULT_SIZE }))}
      data-active={dragging}
      className={cn("resizer workspace-resizer", snapHint && "will-snap")}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize workspace — drag to the edge to hide"
      title="Drag to resize · double-click to reset"
    />
    <section style={{ width: panel.size }} className={cn("app-workspace-panel shrink-0", snapHint && "is-snapping")} aria-label="Workspace panel">
      <div className="workspace-tabstrip" role="tablist" aria-label="Workspace tools">
        {panel.tabs.map((tab) => {
          const meta = toolMeta(tab.tool);
          const on = tab.id === active?.id;
          return (
            <div key={tab.id} role="tab" aria-selected={on} className={cn("workspace-tab", on && "is-active")}>
              <button type="button" className="workspace-tab-main" onClick={() => setPanel((p) => ({ ...p, activeId: tab.id }))} title={meta.label}>
                <meta.icon size={11} />
                <span className="workspace-tab-title">{meta.label}</span>
              </button>
              <button type="button" className="workspace-tab-close" onClick={() => closeTab(tab.id)} aria-label={`Close ${meta.label} tab`}><IconX size={9} /></button>
            </div>
          );
        })}
        <Menu align="right" width={236} trigger={() => <button type="button" className="workspace-tab-new" aria-label="Add a tool tab" title="Add a tool tab"><span className="text-[13px] leading-none">+</span></button>}>
          {(close) => <>
            {WORKSPACE_TOOLS.map((tool) => (
              <button key={tool.id} onClick={() => { addTab(tool.id); close(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-ink-2 transition-colors hover:bg-hover hover:text-ink">
                <span className="flex w-4 shrink-0 items-center justify-center text-ink-3"><tool.icon size={13} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[12.5px]">{tool.label}</span><span className="block text-[10.5px] leading-tight text-ink-4">{tool.desc}</span></span>
              </button>
            ))}
            <MenuSep />
            <button disabled={panel.tabs.length === 0} onClick={() => { setPanel((p) => ({ ...p, tabs: [], activeId: null })); onOpenChange(false); close(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-[12.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
              <span className="flex w-4 shrink-0 items-center justify-center"><IconX size={12} /></span>Close all tabs
            </button>
          </>}
        </Menu>
        <span className="min-w-0 flex-1" />
        <Tip label="Hide workspace · ⌘L">
          <button type="button" className="workspace-panel-close" onClick={() => onOpenChange(false)} aria-label="Hide workspace panel"><IconX size={13} /></button>
        </Tip>
      </div>
      <div className="workspace-body">
        {panel.tabs.map((tab) => (
          <div key={tab.id} role="tabpanel" aria-hidden={tab.id !== active?.id} className={cn("workspace-tabpane", tab.id === active?.id && "is-active")}>
            {tab.tool === "browse" && <BrowserView onAskAgent={onAskAgent} />}
            {tab.tool === "changes" && <ReviewView project={project} />}
            {tab.tool === "artifacts" && <ArtifactsView />}
            {tab.tool === "terminal" && <PanelTerminal onAskAgent={onAskAgent} />}
            {tab.tool === "memory" && <MemoryView />}
          </div>
        ))}
        {panel.tabs.length === 0 && (
          <div className="workspace-picker">
            <p className="workspace-picker-eyebrow">workspace</p>
            <h3 className="workspace-picker-title">Add a tool</h3>
            <p className="workspace-picker-sub">Every tool opens as its own tab — combine them however you work. Drag the panel's left edge to the screen to hide it again.</p>
            <div className="workspace-picker-grid">
              {WORKSPACE_TOOLS.map((tool) => (
                <button key={tool.id} onClick={() => addTab(tool.id)} className="workspace-picker-card">
                  <span className="workspace-picker-icon"><tool.icon size={16} /></span>
                  <span className="workspace-picker-name">{tool.label}</span>
                  <span className="workspace-picker-desc">{tool.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  </>;
}

/* --------------------------- terminal tab body --------------------------- */
function PanelTerminal({ onAskAgent }: { onAskAgent: (text: string) => void }) {
  const { termFeed, toast } = useApp();
  const [prompt, setPrompt] = useState("");
  const toneFor = (k?: string) => k === "cmd" ? "text-ink-2" : k === "ok" ? "text-mint" : k === "err" ? "text-rose" : k === "warn" ? "text-amber" : k === "dim" ? "text-ink-4" : k === "info" ? "text-cyan" : "text-ink-3";
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="scroll-thin min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-[1.7]">
      {termFeed.length ? termFeed.map((line, index) => <div key={index} className={toneFor(line.k)}>{line.t}</div>) : <>
        <p className="text-ink-3">No shell is connected.</p>
        <p className="mt-1 text-[10px] text-ink-4">Agent commands stream here once a runtime is connected. Until then you can ask the assistant about commands below.</p>
      </>}
    </div>
    <div className="flex items-center gap-2 border-t border-line-soft px-3 py-2">
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && prompt.trim()) { onAskAgent(prompt); setPrompt(""); toast("The request was sent to your composer model, not executed in a shell.", "iris"); } }} placeholder="Ask the assistant about a command" className="h-[26px] min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none" />
      <span className="font-mono text-[9px] tracking-[.12em] text-ink-4 uppercase">⏎ ask</span>
    </div>
  </div>;
}
