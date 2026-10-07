import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { IconBranch, IconEye, IconGit, IconHelp, IconPanelLeft, IconSearch, IconSettings, IconTerminal } from "./Icons";
import { IconButton, Tip } from "./ui";
import { LayoutControl, type LayoutState } from "./LayoutControl";
import type { ViewId } from "./Sidebar";

/* Titlebar — quiet, crisp, state-aware. Left: mode + project. Right: a single
   row of 28px icon actions that all target the docked workspace (Git opens a
   Changes tab, Browse opens a Browse tab, Terminal toggles the shell) so the
   chrome never duplicates what the workspace already does. The external-editor
   picker lives in Settings ▸ Editor connections. */
export function Titlebar({ onOpenCmdk, setView, layout, setLayout, layoutOpen, setLayoutOpen, onHelp, project }: {
  onOpenCmdk: () => void; onNew: () => void; setView: (view: ViewId) => void; layout: LayoutState; setLayout: (layout: LayoutState) => void;
  panelLabel: string; layoutOpen: boolean; setLayoutOpen: (open: boolean) => void; onHelp: () => void; project?: Project;
}) {
  const { product, setProduct, setTermOpen } = useApp();
  const source = project?.sources?.[0];
  const isDemo = project?.id === "demo-sofia-ui";
  const openWorkspace = (tool: "changes" | "browse") => window.dispatchEvent(new CustomEvent("conductor:pane", { detail: tool }));
  return <header className="app-titlebar minimal-titlebar">
    {!layout.list && <Tip label="Show sidebar · ⇧⌘B" side="bottom"><IconButton icon={IconPanelLeft} label="Show sidebar" size={28} onClick={() => setLayout({ ...layout, list: true })} /></Tip>}
    <div className="product-switcher" role="group" aria-label="Workspace mode">
      {(["code", "agent"] as const).map((item) => <button key={item} onClick={() => setProduct(item)} aria-pressed={product === item} className={cn("product-option", product === item && "selected")}>{item === "code" ? "Code" : "Agent"}</button>)}
    </div>
    {project && <div className="selected-project-title"><span className="truncate">{project.name}</span>{isDemo && <span className="titlebar-demo">DEMO</span>}{source?.branch && <span className="hidden items-center gap-1 font-mono text-[10px] text-ink-4 lg:flex"><IconBranch size={10} />{source.branch}</span>}</div>}
    <div className="titlebar-spacer" />
    <Tip label="Search · ⌘K" side="bottom"><IconButton icon={IconSearch} label="Search sessions and commands" onClick={onOpenCmdk} size={28} /></Tip>
    <div className="titlebar-optional-controls contents">
      <Tip label="Changes — workspace tab" side="bottom"><IconButton icon={IconGit} label="Open changes in the workspace" size={28} onClick={() => openWorkspace("changes")} /></Tip>
      <Tip label="Browse — workspace tab" side="bottom"><IconButton icon={IconEye} label="Open a browser tab in the workspace" size={28} onClick={() => openWorkspace("browse")} /></Tip>
      <Tip label="Terminal · ⌘J" side="bottom"><IconButton icon={IconTerminal} label="Toggle terminal" size={28} active={layout.terminal} onClick={() => setTermOpen(!layout.terminal)} /></Tip>
    </div>
    <LayoutControl state={layout} setState={setLayout} panelLabel="Workspace" open={layoutOpen} setOpen={setLayoutOpen} />
    <span className="titlebar-divider-v" />
    <span className="hidden sm:inline-flex"><IconButton icon={IconHelp} label="Keyboard shortcuts" onClick={onHelp} size={28} /></span>
    <IconButton icon={IconSettings} label="Settings" size={28} onClick={() => setView("settings")} />
  </header>;
}

export function PageHeader({ title, sub, eyebrow, right }: { title: string; sub: string; eyebrow: string; right?: React.ReactNode }) {
  return <div className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line-soft bg-base">
    <div className="min-w-0"><span className="text-[10px] font-medium tracking-[.08em] text-ink-4 uppercase">{eyebrow}</span><h1 className="ds-display mt-1 font-display font-semibold tracking-[-.03em] text-ink">{title}</h1><p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-ink-3">{sub}</p></div>
    {right && <div className="page-header-actions flex flex-wrap items-center gap-2">{right}</div>}
  </div>;
}
export function Grid({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("grid gap-3", className)}>{children}</div>; }
