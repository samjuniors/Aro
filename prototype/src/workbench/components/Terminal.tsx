import { useState } from "react";
import { useApp, useResizableY } from "../lib/app";
import { IconChevronDown, IconTerminal, IconX } from "./Icons";
import { Button, IconButton } from "./ui";

export function TerminalPanel({ onAskAgent }: { onAskAgent: (text: string) => void }) {
  const { termOpen, setTermOpen, termFeed, toast } = useApp();
  const height = useResizableY(210, 120, 480);
  const [prompt, setPrompt] = useState("");
  if (!termOpen) return null;
  return <><div {...height.handle} /><section style={{ height: height.size }} className="flex shrink-0 flex-col border-t border-line-soft bg-sunken">
    <header className="flex h-[34px] shrink-0 items-center gap-2 border-b border-line-soft px-3"><IconTerminal size={12} className="text-ink-3" /><span className="text-[11.5px] text-ink-2">Terminal</span><span className="ml-auto font-mono text-[9.5px] text-ink-4">Runtime not connected</span><IconButton icon={IconChevronDown} label="Minimize terminal" size={24} onClick={() => setTermOpen(false)} /><IconButton icon={IconX} label="Close terminal" size={24} onClick={() => setTermOpen(false)} /></header>
    <div className="scroll-thin flex-1 overflow-auto p-3 font-mono text-[11px] text-ink-3">{termFeed.length ? termFeed.map((line, index) => <div key={index}>{line.t}</div>) : <><p>No shell is connected.</p><p className="mt-1 text-[10px] text-ink-4">A browser cannot run local commands directly. Connect a desktop runtime to start a shell.</p></>}</div>
    <div className="flex items-center gap-2 border-t border-line-soft px-3 py-2"><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the assistant about a command" className="h-[28px] min-w-0 flex-1 bg-transparent text-[11.5px] outline-none" /><Button size="xs" disabled={!prompt.trim()} onClick={() => { if (!prompt.trim()) return; onAskAgent(prompt); setPrompt(""); toast("The request was sent to your composer model, not executed in a shell.", "iris"); }}>Ask</Button></div>
  </section></>;
}