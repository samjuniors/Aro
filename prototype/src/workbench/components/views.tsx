import { AGENTS } from "../data/catalog";
import { INSTALLED_IDES } from "../data/extra";
import { useApp } from "../lib/app";
import { AgentMark, IconLayers, IconMonitor, IconSettings, IdeMark } from "./Icons";
import { Button, EmptyState } from "./ui";
import { PageHeader } from "./Titlebar";

export function AgentsView({ onStart }: { onStart: (id: string) => void }) {
  const { toast } = useApp();
  return <div className="scroll-thin flex-1 overflow-auto"><PageHeader eyebrow="configuration" title="Coding agent adapters" sub="Available adapter types. Installation and connection status are not assumed." /><div className="divide-y divide-line-soft px-5">{AGENTS.map((agent) => <div key={agent.id} className="flex items-center gap-3 py-4"><AgentMark glyph={agent.glyph} from={agent.from} to={agent.to} size={28} /><div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-ink">{agent.name}</p><p className="text-[11px] text-ink-4">{agent.vendor} · runtime not configured</p></div><Button size="xs" onClick={() => { onStart(agent.id); toast("Session adapter selected. A runtime connection is still required.", "iris"); }}>Use in a session</Button></div>)}</div></div>;
}
export function BridgesView() {
  const { toast } = useApp();
  return <div className="scroll-thin flex-1 overflow-auto"><PageHeader eyebrow="integrations" title="External editors" sub="Choose an editor preference. This browser cannot discover installed desktop software." /><div className="divide-y divide-line-soft px-5">{INSTALLED_IDES.map((editor) => <div key={editor.id} className="flex items-center gap-3 py-4"><IdeMark kind={editor.id} size={26} /><div className="flex-1"><p className="text-[13px] font-medium text-ink-2">{editor.name}</p><p className="text-[11px] text-ink-4">Not attached · installation unverified</p></div><Button size="xs" onClick={() => { localStorage.setItem("conductor.editor", editor.id); toast(`${editor.name} saved as your preferred editor`, "mint"); }}>Set preferred</Button></div>)}</div><EmptyState icon={IconMonitor} title="No live editor bridge" body="Connect a desktop runtime before opening local files or synchronizing editor edits." /></div>;
}
export function FleetView() {
  const { setSettingsSection } = useApp();
  return <div className="flex flex-1 flex-col"><PageHeader eyebrow="execution" title="Fleet" sub="Background jobs appear here only when a connected runtime starts them." /><EmptyState icon={IconLayers} title="No runs yet" body="There are no queued, running or completed jobs. No demonstration jobs are generated." action={<Button size="sm" icon={IconSettings} onClick={() => { setSettingsSection("terminal"); window.dispatchEvent(new CustomEvent("conductor:settings")); }}>Runtime settings</Button>} /></div>;
}
import type { Project } from "../data/providers";
import { ChangesPanelContent, repoStateFor } from "./RepoDock";

export function ReviewView({ project }: { project?: Project }) {
  const state = repoStateFor(project);
  return (
    <div className="flex flex-1 flex-col h-full bg-base overflow-hidden">
      <ChangesPanelContent project={project} state={state} />
    </div>
  );
}