import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Step } from "../data/catalog";
import { useWorkspace } from "../lib/workspace";
import { IconCheck, IconChevronDown, IconPlus, IconSpark, IconTrash, IconX } from "./Icons";
import { Bar } from "./ui";

/** Pull the plan lines out of an agent's tool step ("plan" tool) or numbered text. */
export function extractPlanTodos(steps: Step[]): string[] {
  for (const s of steps) {
    if (s.type === "tool" && s.tool === "plan" && s.lines && s.lines.length > 0) {
      return s.lines
        .map((line: string) => line.replace(/^\s*\d+[\.\)]\s*/, "").replace(/^[-*•]\s*/, "").trim())
        .filter((line: string) => line.length > 0);
    }
  }
  for (const s of steps) {
    if (s.type === "text" && s.text.toLowerCase().includes("plan")) {
      const matches = s.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^\d+[\.\)]\s+/.test(l))
        .map((l) => l.replace(/^\d+[\.\)]\s+/, "").trim());
      if (matches.length > 0) return matches;
    }
  }
  return [];
}

/**
 * Agent plan docked directly ABOVE the composer — slim, minimal strip that
 * replaces the old project bar. Visible ONLY while the agent has a plan
 * (workspace-sticky: it survives switching sessions/projects until cleared
 * or replaced by a new plan). The panel opens UPWARD, over the transcript,
 * so it never covers the composer.
 */
export function PlanTodoCorner() {
  const { agentPlan, updateAgentPlanItem, addAgentPlanItem, removeAgentPlanItem, clearAgentPlan } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);

  /* a fresh plan captured from an agent run → pop the panel open once;
     ⌘T (and the hands-free "show todos" voice command) toggle it */
  useEffect(() => {
    const reveal = () => setOpen(true);
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("conductor:agent-plan", reveal);
    window.addEventListener("conductor:agent-plan-toggle", toggle);
    return () => { window.removeEventListener("conductor:agent-plan", reveal); window.removeEventListener("conductor:agent-plan-toggle", toggle); };
  }, []);

  /* click outside to close */
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [open]);

  if (!agentPlan || agentPlan.items.length === 0) return null;

  const items = agentPlan.items;
  const doneCount = items.filter((t) => t.state === "done").length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const allDone = doneCount === totalCount && totalCount > 0;

  const toggleItem = (id: string, current: string) => {
    const next = current === "done" ? "todo" : current === "todo" ? "doing" : "done";
    updateAgentPlanItem(id, { state: next as "todo" | "doing" | "done" });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addAgentPlanItem(newText.trim());
    setNewText("");
  };

  return (
    <div ref={anchorRef} className="plan-todo-anchor">
      {/* slim strip above the composer — opens the panel upward */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn("plan-todo-strip", open && "is-active", allDone && "is-completed")}
        aria-expanded={open}
        aria-label={`Agent plan — ${doneCount} of ${totalCount} done`}
      >
        <span className="plan-todo-strip-icon">
          <IconSpark size={11} />
        </span>
        <span className="plan-todo-strip-label">Agent plan</span>
        <span className="plan-todo-strip-stats font-mono">
          {doneCount}/{totalCount}
        </span>
        <span className="plan-todo-strip-track" aria-hidden>
          <span className="plan-todo-strip-fill" style={{ width: `${progressPct}%` }} />
        </span>
        {allDone && <IconCheck size={10} className="plan-todo-strip-done" />}
        <IconChevronDown
          size={11}
          className={cn("plan-todo-strip-arrow transition-transform duration-200", !open && "rotate-180")}
        />
      </button>

      {/* dropdown panel — floats UPWARD over the transcript */}
      {open && (
        <div className="plan-todo-dropdown animate-slide-up shadow-e4" role="dialog" aria-label="Agent plan">
          <div className="plan-todo-header">
            <div className="plan-todo-title-wrap">
              <span className="plan-todo-badge">
                <IconSpark size={10} />
                <span>Agent plan</span>
              </span>
              <span className="plan-todo-count font-mono">
                {doneCount} of {totalCount} · sticks to the composer
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="plan-todo-toggle-btn hover:text-rose"
                onClick={() => { clearAgentPlan(); setOpen(false); }}
                title="Clear the plan from the composer"
                aria-label="Clear agent plan"
              >
                <IconTrash size={11} />
              </button>
              <button
                type="button"
                className="plan-todo-toggle-btn"
                onClick={() => setOpen(false)}
                aria-label="Close plan panel"
              >
                <IconChevronDown size={12} />
              </button>
            </div>
          </div>

          <div className="plan-todo-body">
            <div className="plan-todo-bar">
              <Bar value={progressPct} tone={allDone ? "mint" : "iris"} height={3} />
            </div>

            <div className="plan-todo-list scroll-thin">
              {items.map((item) => {
                const isDone = item.state === "done";
                const isDoing = item.state === "doing";
                return (
                  <div key={item.id} className="plan-todo-item group">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id, item.state)}
                      className={cn("plan-todo-checkbox", isDone && "is-done", isDoing && "is-doing")}
                      aria-label={`Mark "${item.text}" as ${isDone ? "incomplete" : "complete"}`}
                    >
                      {isDone && <IconCheck size={9} />}
                      {isDoing && <span className="plan-todo-pulse-dot" />}
                    </button>
                    <span className={cn("plan-todo-text", isDone && "line-through opacity-50")}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => removeAgentPlanItem(item.id)}
                      className="plan-todo-remove opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove ${item.text} from plan`}
                    >
                      <IconX size={10} />
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAdd} className="plan-todo-add-form">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add step to plan..."
                className="plan-todo-input"
              />
              <button
                type="submit"
                disabled={!newText.trim()}
                className="plan-todo-submit-btn"
                aria-label="Add step"
              >
                <IconPlus size={11} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
