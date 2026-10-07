import { useState } from "react";
import { cn } from "../utils/cn";
import type { Session } from "../data/catalog";
import { useApp } from "../lib/app";
import { useWorkspace } from "../lib/workspace";
import { readStored, writeStored } from "../lib/storage";
import { SHORTCUTS, SHORTCUT_GROUPS } from "../lib/shortcuts";
import { getBackend, setBackend, testBackend, type BackendConfig, type BackendMode } from "../lib/live";
import { IconBrain, IconFile, IconGit, IconLayers, IconMic, IconMonitor, IconPalette, IconPlug, IconPlus, IconSearch, IconSettings, IconShield, IconSpark, IconTerminal, IconTrash, IconZap } from "./Icons";
import { Badge, Button, EmptyState, Input, Kbd, Segmented, Select, Toggle } from "./ui";
import { AgentsView, BridgesView } from "./views";
import { SkillsView, ConnectorsView } from "./views3";
import { AppearanceSettings } from "./AppearanceSettings";
import { ProviderSettings } from "./ProviderSettings";
import { DesignSystemView } from "./DesignSystemView";
import { modeDefs } from "./Workbench";

const GROUPS = [
  { label: "Workspace", sections: [{ id: "general", label: "General", icon: IconSettings }, { id: "appearance", label: "Appearance", icon: IconPalette }, { id: "keyboard", label: "Keyboard", icon: IconTerminal }, { id: "voice", label: "Voice & audio", icon: IconMic }] },
  { label: "Models & agents", sections: [{ id: "providers", label: "Providers & models", icon: IconBrain }, { id: "backend", label: "Reply backend", icon: IconZap }, { id: "agents", label: "Agent adapters", icon: IconLayers }, { id: "permissions", label: "Permissions", icon: IconShield }, { id: "rules", label: "Rules", icon: IconFile }, { id: "skills", label: "Skills", icon: IconSpark }] },
  { label: "Integrations", sections: [{ id: "connectors", label: "Connectors", icon: IconPlug }, { id: "editors", label: "External editors", icon: IconMonitor }, { id: "git", label: "Git", icon: IconGit }, { id: "terminal", label: "Terminal & runtime", icon: IconTerminal }, { id: "gateway", label: "Messaging gateway", icon: IconPlug }] },
  { label: "Reference", sections: [{ id: "usage", label: "Usage", icon: IconLayers }, { id: "design", label: "Design system", icon: IconPalette }] },
];

function Page({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="scroll-thin min-h-0 flex-1 overflow-auto"><div className="settings-page mx-auto max-w-[760px] space-y-5 p-6"><div><h1 className="font-display text-[22px] font-semibold tracking-[-.03em] text-ink">{title}</h1><p className="mt-1 text-[12px] leading-relaxed text-ink-3">{description}</p></div>{children}</div></div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-[11px] border border-line bg-raise"><h2 className="border-b border-line-soft px-4 py-3 text-[12px] font-medium text-ink-2">{title}</h2><div className="divide-y divide-line-soft">{children}</div></section>; }
function Row({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) { return <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[12px] text-ink-2">{title}</p>{detail && <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-4">{detail}</p>}</div>{children}</div>; }
function PreferenceSelect({ preference, initial, options }: { preference: string; initial: string; options: { value: string; label: string }[] }) {
  const [value, setValue] = useState(() => readStored(`conductor.pref.${preference}`, initial));
  return <Select className="w-[160px]" align="right" value={value} onChange={(v) => { setValue(v); writeStored(`conductor.pref.${preference}`, v); }} options={options} />;
}
function PreferenceToggle({ preference, initial = false }: { preference: string; initial?: boolean }) {
  const [value, setValue] = useState(() => readStored(`conductor.pref.${preference}`, initial));
  return <Toggle checked={value} onChange={(v) => { setValue(v); writeStored(`conductor.pref.${preference}`, v); }} />;
}
function General() { return <Page title="General" description="Workspace data is saved on this device. Nothing is preloaded as an example."><Group title="Workspace"><Row title="Remember appearance" detail="Design, theme, density and motion preferences persist automatically."><span className="text-[11px] text-ink-4">Enabled</span></Row><Row title="Session data" detail="Only your messages, tasks, skills, connectors and projects are saved."><span className="text-[11px] text-ink-4">Local storage</span></Row></Group><Group title="Runtime preferences"><Row title="Ask before destructive actions" detail="Used by a connected agent runtime; this browser cannot execute commands."><PreferenceToggle preference="askDestructive" initial /></Row><Row title="New-session permissions"><PreferenceSelect preference="permission" initial="agent" options={modeDefs("code").map((m) => ({ value: m.id, label: m.label }))} /></Row></Group></Page>; }
function Keyboard() { return <Page title="Keyboard" description="Command on macOS, Control on Windows and Linux. Composer Shift+Tab cycles permissions.">{SHORTCUT_GROUPS.map((group) => <Group key={group} title={group}>{SHORTCUTS.filter((s) => s.group === group && !["compact", "approve", "fork", "rewind"].includes(s.id)).map((shortcut) => <Row title={shortcut.label} detail={shortcut.note} key={shortcut.id}><span className="flex gap-1">{shortcut.keys.map((key, index) => <Kbd key={index}>{key}</Kbd>)}</span></Row>)}</Group>)}</Page>; }
function VoiceSettings() {
  const [language, setLanguage] = useState(() => localStorage.getItem("conductor.voice.language") || navigator.language || "en-US");
  const [orb, setOrb] = useState(() => localStorage.getItem("conductor.voice.orb") === "true");
  return <Page title="Voice & audio" description="Use the waveform beside Send to record speech directly into the composer. Nothing is sent automatically.">
    <Group title="Speech to text"><Row title="Recognition engine" detail="Whisper requires a separate transcription service; browser recognition is available now."><span className="text-[11px] text-ink-3">Browser speech service</span></Row><Row title="Recognition language"><Select className="w-[140px]" align="right" value={language} onChange={(v) => { setLanguage(v); localStorage.setItem("conductor.voice.language", v); }} options={["en-US", "en-GB", "fr-FR", "de-DE", "es-ES", "ja-JP"].map((l) => ({ value: l, label: l }))} /></Row></Group>
    <Group title="Optional voice assistant"><Row title="Show animated voice orb" detail="A separate hands-free interface. Off unless you enable it."><Toggle checked={orb} onChange={(v) => { setOrb(v); localStorage.setItem("conductor.voice.orb", String(v)); window.dispatchEvent(new CustomEvent("conductor:voice:orb", { detail: v })); }} /></Row></Group>
    <p className="text-[11px] leading-relaxed text-ink-4">Speech recognition depends on your browser and microphone permissions. It may use the browser vendor's speech service, rather than run fully offline.</p>
  </Page>;
}
function Permissions() { return <Page title="Permissions" description="Select permissions from the composer, not an Agent mode label. Local-model chat does not have file-write or terminal access."><Group title="Session default"><Row title="Default permission"><PreferenceSelect preference="permission" initial="agent" options={modeDefs("code").map((m) => ({ value: m.id, label: m.label }))} /></Row></Group><Group title="Runtime safeguards"><Row title="Checkpoint before changes" detail="Available after an agent runtime connects."><PreferenceToggle preference="checkpoints" initial /></Row><Row title="Network access"><PreferenceSelect preference="network" initial="ask" options={[{ value: "block", label: "Block" }, { value: "ask", label: "Ask" }, { value: "allow", label: "Allow" }]} /></Row></Group></Page>; }
function Rules() {
  const { rules, setRules } = useWorkspace();
  const [draft, setDraft] = useState("");
  return <Page title="Rules" description="Global instructions you write. Project-specific rules are managed under each project."><Group title="Your rules">{rules.map((rule, index) => <Row key={index} title={rule}><button aria-label="Remove rule" className="text-ink-4 hover:text-rose" onClick={() => setRules((all) => all.filter((_, i) => i !== index))}><IconTrash size={12} /></button></Row>)}{!rules.length && <p className="px-4 py-4 text-[11px] text-ink-4">No global rules added.</p>}<form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; setRules((all) => [...all, draft.trim()]); setDraft(""); }}><Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an instruction" /><Button type="submit" size="sm" icon={IconPlus} disabled={!draft.trim()}>Add</Button></form></Group></Page>;
}
function GitSettings() { const { projects } = useWorkspace(); const sources = projects.flatMap((p) => (p.sources ?? []).filter((s) => s.kind === "git" || s.branch).map((s) => ({ ...s, project: p.name }))); return <Page title="Git" description="Sources here are your references, not connected or cloned repositories."><Group title="Repository sources">{sources.map((source) => <Row key={source.id} title={source.name} detail={source.remoteUrl ?? source.path}><span className="text-[10px] text-ink-4">{source.project}</span></Row>)}{!sources.length && <p className="px-4 py-4 text-[11px] text-ink-4">No Git sources added.</p>}</Group><Group title="Connected runtime defaults"><Row title="Merge strategy"><PreferenceSelect preference="merge" initial="squash" options={[{ value: "squash", label: "Squash" }, { value: "rebase", label: "Rebase" }, { value: "merge", label: "Merge commit" }]} /></Row></Group></Page>; }
function RuntimeSettings() { return <Page title="Terminal & runtime" description="No execution runtime is connected. This web interface does not run commands on your computer."><Group title="Saved execution preferences"><Row title="Preferred sandbox"><PreferenceSelect preference="sandbox" initial="local" options={[{ value: "local", label: "Local" }, { value: "docker", label: "Docker" }, { value: "ssh", label: "SSH" }]} /></Row><Row title="Command timeout"><PreferenceSelect preference="timeout" initial="180" options={[{ value: "60", label: "60 seconds" }, { value: "180", label: "180 seconds" }, { value: "600", label: "10 minutes" }]} /></Row></Group><p className="text-[11px] leading-relaxed text-ink-4">These settings describe the intended runtime configuration. They do not create a sandbox, shell, or daemon process.</p></Page>; }
function Gateway() { return <Page title="Messaging gateway" description="No Slack, Telegram, Discord, or email account is connected."><EmptyState icon={IconPlug} title="Gateway not connected" body="Messaging delivery and off-device approvals require an authenticated runtime gateway." /></Page>; }
function Usage() {
  const sessions = readStored<Session[]>("conductor.workspace.v3.sessions", []);
  const tokens = sessions.reduce((sum, s) => sum + (s.tokens || 0), 0);
  return <Page title="Usage" description="Only usage reported by a real model response is included."><Group title="This device"><Row title="Saved sessions"><span className="font-mono text-[12px] text-ink-2">{sessions.length}</span></Row><Row title="Tokens reported in saved responses"><span className="font-mono text-[12px] text-ink-2">{tokens.toLocaleString()}</span></Row><Row title="Billing"><span className="text-[11px] text-ink-4">No billing service connected</span></Row></Group></Page>;
}

function BackendSettings() {
  const { toast } = useApp();
  const [cfg, setCfg] = useState<BackendConfig>(() => getBackend());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string; ms: number } | null>(null);
  const setMode = (mode: BackendMode) => { setBackend({ ...cfg, mode }); setCfg({ ...cfg, mode }); setResult(null); };
  const runTest = async () => { setTesting(true); setResult(null); const r = await testBackend(cfg); setResult(r); setTesting(false); };
  const save = () => { setBackend(cfg); toast("Backend saved — replies follow your Aro agent now", "mint"); };
  return <Page title="Reply backend" description="Where replies come from. Demo uses this sandbox's z-ai model; agent runs the aro-bridge daemon with real tools; live points at any OpenAI-compatible endpoint — like your Aro agent's api_server on :8642.">
    <Group title="Mode"><Row title="Reply backend" detail="Takes effect immediately for new messages."><Segmented value={cfg.mode} onChange={setMode} items={[{ value: "demo", label: "Demo" }, { value: "agent", label: "Agent" }, { value: "live", label: "Live" }]} /></Row></Group>
    {cfg.mode === "agent" ? (
      <Group title="Agent bridge">
        <Row title="aro-bridge daemon" detail="Real tool loop — web_search and page_reader — streamed over the aro.jsonl/1 protocol."><span className="flex items-center gap-2"><Badge tone="cyan" mono dot>real tools</Badge><Badge tone="iris" mono>aro.jsonl/1</Badge></span></Row>
        <Row title="Connection" detail="Probe the bridge daemon (5s timeout). Unreachable falls back to the scripted demo run."><span className="flex items-center gap-2">{result ? (result.ok ? <Badge tone="mint" mono dot>reachable · {result.ms}ms</Badge> : <Badge tone="rose" mono dot>unreachable</Badge>) : <Badge tone="neutral" mono>{testing ? "testing…" : "not tested"}</Badge>}<Button variant="secondary" disabled={testing} onClick={runTest}>{testing ? "Testing…" : "Test connection"}</Button></span></Row>
      </Group>
    ) : cfg.mode === "live" ? (
      <Group title="Live endpoint">
        <Row title="Base URL" detail="Any server that speaks POST /chat/completions."><div className="w-[250px]"><Input value={cfg.baseUrl} onChange={(e) => setCfg((c) => ({ ...c, baseUrl: e.target.value }))} placeholder="http://localhost:8642/v1" className="h-[28px] font-mono text-[11px]" /></div></Row>
        <Row title="Model" detail="Model id sent with every completion."><div className="w-[200px]"><Input value={cfg.model} onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))} placeholder="aro-4-70b" className="h-[28px] font-mono text-[11px]" /></div></Row>
        <Row title="API key" detail="Optional for local servers."><div className="w-[200px]"><Input type="password" value={cfg.key} onChange={(e) => setCfg((c) => ({ ...c, key: e.target.value }))} placeholder="sk-…" className="h-[28px] font-mono text-[11px]" /></div></Row>
        <Row title="Connection" detail="GET /models with the key, 5s timeout."><span className="flex items-center gap-2">{result ? (result.ok ? <Badge tone="mint" mono dot>reachable · {result.ms}ms</Badge> : <Badge tone="rose" mono dot>unreachable · check host</Badge>) : <Badge tone="neutral" mono>{testing ? "testing…" : "not tested"}</Badge>}<Button variant="secondary" disabled={testing} onClick={runTest}>{testing ? "Testing…" : "Test connection"}</Button><Button variant="primary" onClick={save}>Save</Button></span></Row>
      </Group>
    ) : (
      <Group title="Demo"><Row title="Sandbox model" detail="Scripted tool steps close with a real reply from the sandbox model (GLM via z-ai). Falls back to the scripted text when offline."><Badge tone="mint" mono dot>POST /api/chat</Badge></Row></Group>
    )}
    <div className="flex items-start gap-2 rounded-[10px] border border-amber/20 bg-amber-tint/40 px-3 py-2.5 text-[11px] leading-[1.55] text-amber"><IconZap size={12} className="mt-0.5 shrink-0" /><span>Agent and live modes point the workbench at a real backend. Demo data elsewhere (sessions, tasks) stays seeded.</span></div>
  </Page>;
}
export function SettingsView({ onStart }: { onStart: (agent: string) => void }) {
  const { settingsSection: selected, setSettingsSection } = useApp();
  const [search, setSearch] = useState("");
  return <div className="settings-shell flex min-h-0 flex-1">
    <aside className="settings-nav flex w-[212px] shrink-0 flex-col border-r border-line-soft bg-sunken">
      <div className="relative px-3 py-3"><IconSearch size={12} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-4" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search settings" className="h-[29px] pl-7" /></div>
      <nav className="settings-nav-list scroll-thin min-h-0 flex-1 overflow-auto px-2 pb-3">{GROUPS.map((group) => { const sections = group.sections.filter((s) => s.label.toLowerCase().includes(search.toLowerCase())); if (!sections.length) return null; return <div key={group.label} className="settings-nav-group mb-3"><span className="block px-2 pt-1 pb-1.5 text-[9px] font-medium tracking-[.1em] text-ink-4 uppercase">{group.label}</span>{sections.map((section) => <button key={section.id} onClick={() => setSettingsSection(section.id)} className={cn("flex h-[29px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[11.5px] transition-colors", selected === section.id ? "bg-hover/70 font-medium text-ink" : "text-ink-3 hover:bg-hover/35 hover:text-ink-2")}><section.icon size={12} />{section.label}</button>)}</div>; })}</nav>
    </aside>
    <div className="settings-content flex min-h-0 min-w-0 flex-1 flex-col bg-base" key={selected}>
      {selected === "general" && <General />}{selected === "appearance" && <AppearanceSettings />}{selected === "keyboard" && <Keyboard />}{selected === "voice" && <VoiceSettings />}
      {selected === "providers" && <ProviderSettings />}{selected === "backend" && <BackendSettings />}{selected === "agents" && <AgentsView onStart={onStart} />}{selected === "permissions" && <Permissions />}{selected === "rules" && <Rules />}
      {selected === "skills" && <SkillsView />}{selected === "connectors" && <ConnectorsView />}{selected === "editors" && <BridgesView />}{selected === "git" && <GitSettings />}{selected === "terminal" && <RuntimeSettings />}{selected === "gateway" && <Gateway />}{selected === "usage" && <Usage />}{selected === "design" && <DesignSystemView />}
    </div>
  </div>;
}