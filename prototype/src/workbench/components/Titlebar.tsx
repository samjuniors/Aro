import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useApp } from "../lib/app";
import { IconBranch, IconEye, IconGit, IconHelp, IconPanelLeft, IconSearch, IconSettings, IconTerminal, IdeMark } from "./Icons";
import { IconButton, Menu, MenuItem, MenuLabel, MenuSep, Tip } from "./ui";
import { LayoutControl, type LayoutState } from "./LayoutControl";
import type { ViewId } from "./Sidebar";
import { INSTALLED_IDES } from "../data/extra";

export function Titlebar({ onOpenCmdk, setView, layout, setLayout, layoutOpen, setLayoutOpen, onHelp, project }: {
  onOpenCmdk: () => void; onNew: () => void; setView: (view: ViewId) => void; layout: LayoutState; setLayout: (layout: LayoutState) => void;
  panelLabel: string; layoutOpen: boolean; setLayoutOpen: (open: boolean) => void; onHelp: () => void; project?: Project;
}) {
  const { product, setProduct, setSettingsSection, setTermOpen, toast } = useApp();
  const source = project?.sources?.[0];
  const isDemo = project?.id === "demo-sofia-ui";
  const openContext = (section: string) => window.dispatchEvent(new CustomEvent("conductor:pane", { detail: section }));
  return <header className="app-titlebar minimal-titlebar">
    {!layout.list && <IconButton icon={IconPanelLeft} label="Show sidebar" size={30} onClick={() => setLayout({ ...layout, list: true })} />}
    <div className="product-switcher" role="group" aria-label="Workspace mode">
      {(["code", "agent"] as const).map((item) => <button key={item} onClick={() => setProduct(item)} aria-pressed={product === item} className={cn("product-option", product === item && "selected")}>{item === "code" ? "Code" : "Agent"}</button>)}
    </div>
    {project && <div className="selected-project-title"><span className="truncate">{project.name}</span>{isDemo && <span className="titlebar-demo">DEMO</span>}{source?.branch && <span className="hidden items-center gap-1 font-mono text-[10px] text-ink-4 lg:flex"><IconBranch size={10} />{source.branch}</span>}</div>}
    <div className="titlebar-spacer" />
    <Tip label="Search · ⌘K" side="bottom"><IconButton icon={IconSearch} label="Search sessions and commands" onClick={onOpenCmdk} size={30} /></Tip>
    <div className="titlebar-optional-controls contents">
      <Tip label="Git" side="bottom"><IconButton icon={IconGit} label="Open Git panel" size={30} onClick={() => openContext("git")} /></Tip>
      <Tip label="Browser" side="bottom"><IconButton icon={IconEye} label="Open browser panel" size={30} onClick={() => openContext("browser")} /></Tip>
      <Tip label="Terminal · ⌘J" side="bottom"><IconButton icon={IconTerminal} label="Toggle terminal" size={30} active={layout.terminal} onClick={() => setTermOpen(!layout.terminal)} /></Tip>
    </div>
    <LayoutControl state={layout} setState={setLayout} panelLabel="Context" open={layoutOpen} setOpen={setLayoutOpen} />
    <Menu width={235} align="right" trigger={() => <button className="external-editor-trigger" aria-label="External editor preferences"><IdeMark kind="cursor" size={16} /></button>}>
      {(close) => <>
        <MenuLabel>Preferred external editor</MenuLabel>
        {INSTALLED_IDES.map((editor) => <MenuItem key={editor.id} icon={<IdeMark kind={editor.id} size={14} />} label={editor.name} onClick={() => { localStorage.setItem("conductor.editor", editor.id); close(); toast(`${editor.name} selected. Opening local folders requires a desktop runtime.`, "iris"); }} />)}
        <MenuSep /><MenuItem icon={<IconSettings size={12} />} label="Editor connections" onClick={() => { setSettingsSection("editors"); setView("settings"); close(); }} />
      </>}
    </Menu>
    <span className="titlebar-divider-v" />
    <span className="hidden sm:inline-flex"><IconButton icon={IconHelp} label="Keyboard shortcuts" onClick={onHelp} size={30} /></span>
    <IconButton icon={IconSettings} label="Settings" size={30} onClick={() => setView("settings")} />
  </header>;
}

export function PageHeader({ title, sub, eyebrow, right }: { title: string; sub: string; eyebrow: string; right?: React.ReactNode }) {
  return <div className="page-header flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line-soft bg-base">
    <div className="min-w-0"><span className="text-[10px] font-medium tracking-[.08em] text-ink-4 uppercase">{eyebrow}</span><h1 className="ds-display mt-1 font-display font-semibold tracking-[-.03em] text-ink">{title}</h1><p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-ink-3">{sub}</p></div>
    {right && <div className="page-header-actions flex flex-wrap items-center gap-2">{right}</div>}
  </div>;
}
export function Grid({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn("grid gap-3", className)}>{children}</div>; }