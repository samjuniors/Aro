import { useState } from "react";
import { cn } from "../utils/cn";
import type { Project } from "../data/providers";
import { useWorkspace } from "../lib/workspace";
import { useApp } from "../lib/app";
import { makeId } from "../lib/storage";
import { IconCheck, IconEye, IconExternal, IconFolder, IconGit, IconList, IconPlus, IconTrash } from "./Icons";
import { Button, EmptyState, Input, Modal } from "./ui";
import { PageHeader } from "./Titlebar";

export function TasksView({ onOpenSession: _onOpenSession }: { onOpenSession: (id: string) => void }) {
  const { tasks, setTasks, projects } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const add = () => { if (!title.trim()) return; setTasks((all) => [...all, { id: makeId("task"), title: title.trim(), status: "todo", projectId: projectId || undefined, createdAt: new Date().toISOString() }]); setTitle(""); setAdding(false); };
  return <div className="flex flex-1 flex-col overflow-auto"><PageHeader eyebrow="workspace" title="Tasks" sub="Your tasks, not example tickets. Create tasks and organize them under a project." right={<Button icon={IconPlus} onClick={() => setAdding(true)}>New task</Button>} />
    {!tasks.length ? <EmptyState icon={IconList} title="No tasks yet" body="Add your first task or let a connected coding runtime create a real plan." action={<Button size="sm" onClick={() => setAdding(true)}>Add a task</Button>} /> : <div className="divide-y divide-line-soft px-5">{tasks.map((task) => <div className="flex items-center gap-3 py-3" key={task.id}><button aria-label={`Mark ${task.title} ${task.status === "done" ? "incomplete" : "complete"}`} onClick={() => setTasks((all) => all.map((t) => t.id === task.id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))} className={cn("flex size-4 items-center justify-center rounded-[4px] border", task.status === "done" ? "border-mint bg-mint-tint text-mint" : "border-line-strong")}>{task.status === "done" && <IconCheck size={10} />}</button><div className="min-w-0 flex-1"><p className={cn("text-[12.5px] text-ink-2", task.status === "done" && "text-ink-4 line-through")}>{task.title}</p>{task.projectId && <p className="mt-1 text-[10px] text-ink-4">{projects.find((p) => p.id === task.projectId)?.name}</p>}</div><button aria-label="Delete task" onClick={() => setTasks((all) => all.filter((t) => t.id !== task.id))} className="text-ink-4 hover:text-rose"><IconTrash size={12} /></button></div>)}</div>}
    <Modal open={adding} onClose={() => setAdding(false)} title="New task" width={440}><form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-3 p-5"><Input autoFocus placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} /><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 w-full rounded-[7px] border border-line bg-base px-2 text-[12px]"><option value="">No project</option>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select><div className="flex justify-end"><Button type="submit" disabled={!title.trim()}>Create task</Button></div></form></Modal>
  </div>;
}

export function GitView({ project, onReview }: { project?: Project; onReview: () => void }) {
  const { requestProject } = useWorkspace();
  const { toast } = useApp();
  const repositories = project?.sources?.filter((s) => s.kind === "git" || s.branch || s.remoteUrl) ?? [];
  const isDemo = project?.id === "demo-sofia-ui";
  return <div className="flex flex-1 flex-col overflow-auto"><PageHeader eyebrow="source control" title="Git" sub={isDemo ? "Reference demo repository with pre-filled branches, checks and pull-request state." : "Repository references are user-supplied. Commits, pull requests and merge status require a Git runtime."} right={<Button size="sm" icon={IconFolder} onClick={() => requestProject()}>Add project</Button>} />
    {isDemo ? <div className="space-y-4 px-5 py-4">
      <div className="rounded-[11px] border border-line-soft bg-raise p-4">
        <div className="flex items-center gap-2"><IconGit size={14} className="text-ink-3" /><span className="text-[13px] font-medium text-ink">samjuniors/SofiaUI</span><span className="rounded-[3px] bg-iris-tint px-1 font-mono text-[8px] font-bold text-iris-soft">DEMO</span></div>
        <div className="mt-3 space-y-1.5">{["arena/01a0ebb-sofiaui", "arena/01a0ebb-polish", "main"].map((b, i) => <div key={b} className="flex items-center gap-2 font-mono text-[11px]"><span className={i === 0 ? "text-mint" : "text-ink-4"}>{i === 0 ? "●" : "○"}</span><span className={i === 0 ? "text-ink" : "text-ink-3"}>{b}</span>{i === 0 && <span className="ml-auto text-[10px] text-ink-4">↑12 · +316,847 −2,083</span>}</div>)}</div>
      </div>
      <div className="rounded-[11px] border border-line-soft bg-raise p-4">
        <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium text-ink">PR #482 · SofiaUI polish</span><Button size="xs" onClick={() => toast("Demo: PR would merge now.", "mint")}>Merge PR</Button></div>
        <p className="mt-1 text-[11px] text-ink-3">arena/01a0ebb-sofiaui → main</p>
        <p className="mt-1.5 font-mono text-[10.5px] text-ink-4"><span className="text-mint">11/12 checks passing</span> · 1 approval needed</p>
        <Button size="xs" variant="ghost" className="mt-2" onClick={onReview}>Open changes</Button>
      </div>
    </div>
    : repositories.length ? <div className="px-5 py-4">{repositories.map((repository) => <div key={repository.id} className="border-b border-line-soft pb-4"><div className="flex items-center gap-2 text-[13px] text-ink-2"><IconGit size={14} />{repository.name}</div><p className="mt-1 font-mono text-[11px] text-ink-4">{repository.remoteUrl ?? repository.path}</p>{repository.branch && <p className="mt-1 text-[11px] text-ink-3">Detected branch: {repository.branch}</p>}<p className="mt-2 text-[11px] text-ink-4">Reference saved. Live synchronization is not connected.</p></div>)}<Button size="xs" className="mt-3" onClick={onReview}>Open changes</Button></div> : <EmptyState icon={IconGit} title="No repository selected" body="Choose a project with a local Git folder or repository URL from the composer." />}
  </div>;
}

export function BrowserView({ onAskAgent }: { onAskAgent: (text: string) => void }) {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const open = () => { try { const parsed = new URL(input.includes("://") ? input : `https://${input}`); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); setUrl(parsed.href); setError(""); } catch { setError("Enter a valid HTTP or HTTPS URL."); } };
  return <div className="flex min-h-0 flex-1 flex-col"><div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3"><IconEye size={13} className="text-ink-3" /><Input placeholder="Enter a preview URL" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && open()} className="min-w-[160px] flex-1 font-mono text-[11px]" /><Button size="sm" disabled={!input.trim()} onClick={open}>Open</Button>{url && <Button size="sm" icon={IconExternal} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>External</Button>}</div>
    {error && <p className="px-4 py-2 text-[11px] text-rose">{error}</p>}
    {url ? <><p className="border-b border-line-soft px-4 py-2 text-[10px] text-ink-4">Some sites block embedded previews. If the pane is blank, open the URL externally. Browser automation is not connected.</p><iframe title="Website preview" src={url} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" className="min-h-0 flex-1 border-0 bg-white" /><div className="border-t border-line-soft p-3"><Button size="xs" onClick={() => onAskAgent(`Help me understand this page: ${url}. I will provide any content you need.`)}>Discuss this URL</Button></div></> : <EmptyState icon={IconEye} title="No page open" body="Enter a URL to open a real preview. No example page or fake console output is shown." />}
  </div>;
}