import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import type { Step } from "../data/catalog";
import { useWorkspace } from "../lib/workspace";
import { IconCheck, IconChevronDown, IconPlus, IconSpark, IconTrash, IconX } from "./Icons";

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
 * Agent plan docked directly ABOVE the composer — a minimal card
 * (reference: TODO.png) whose header row is the collapsed state. Visible
 * ONLY while the agent has a plan (workspace-sticky: it survives switching
 * sessions/projects until cleared or replaced by a new plan) AND the
 * current session has a transcript — a brand-new session with no steps
 * and no project has nothing to show progress on. The panel opens UPWARD,
 * over the transcript, so it never covers the composer.
 */
export function PlanTodoCorner({ fresh }: { fresh?: boolean }) {
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

  if (fresh || !agentPlan || agentPlan.items.length === 0) return null;

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
      {/* collapsed state = the card's header row — icon, title, progress
          track, "0 / 9" counter, chevron (TODO.png reference) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn("plan-todo-strip", open && "is-active", allDone && "is-completed")}
        aria-expanded={open}
        aria-label={`Todo progress — ${doneCount} of ${totalCount} done`}
      >
        <span className="plan-todo-strip-icon" aria-hidden>
          <IconSpark size={12} />
        </span>
        <span className="plan-todo-strip-title">Todo progress</span>
        <span className="plan-todo-strip-track" aria-hidden>
          <span className="plan-todo-strip-fill" style={{ width: `${progressPct}%` }} />
        </span>
        <span className="plan-todo-strip-count">{doneCount} / {totalCount}</span>
        <IconChevronDown size={12} className={cn("plan-todo-strip-arrow", !open && "is-closed")} />
      </button>

      {/* expanded card — floats UPWARD over the transcript */}
      {open && (
        <div className="plan-todo-dropdown animate-slide-up shadow-e4" role="dialog" aria-label="Agent plan">
          <div className="plan-todo-head">
            <span className="plan-todo-head-icon" aria-hidden>
              <IconSpark size={12} />
            </span>
            <span className="plan-todo-head-title">Todo progress</span>
            <span className="plan-todo-head-count">{doneCount} of {totalCount} complete</span>
            <button
              type="button"
              className="plan-todo-head-btn hover:text-rose"
              onClick={() => { clearAgentPlan(); setOpen(false); }}
              title="Clear the plan from the composer"
              aria-label="Clear agent plan"
            >
              <IconTrash size={12} />
            </button>
            <button
              type="button"
              className="plan-todo-head-btn"
              onClick={() => setOpen(false)}
              aria-label="Close plan panel"
            >
              <IconChevronDown size={13} />
            </button>
          </div>

          <div className="plan-todo-body">
            <div className="plan-todo-list scroll-thin">
              {items.map((item, index) => {
                const isDone = item.state === "done";
                const isDoing = item.state === "doing";
                return (
                  <div key={item.id} className="plan-todo-item group" style={{ animationDelay: `${Math.min(index * 26, 208)}ms` }}>
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id, item.state)}
                      className={cn("plan-todo-checkbox", isDone && "is-done", isDoing && "is-doing")}
                      aria-label={`Mark "${item.text}" as ${isDone ? "incomplete" : "complete"}`}
                    >
                      {isDone && <IconCheck size={8} strokeWidth={2.6} />}
                      {isDoing && <span className="plan-todo-pulse-dot" />}
                    </button>
                    <span className={cn("plan-todo-text", isDone && "is-done")}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => removeAgentPlanItem(item.id)}
                      className="plan-todo-remove"
                      aria-label={`Remove ${item.text} from plan`}
                    >
                      <IconX size={10} />
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAdd} className="plan-todo-add">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add a step to the plan…"
                className="plan-todo-add-input"
                aria-label="Add a step to the plan"
              />
              <button
                type="submit"
                disabled={!newText.trim()}
                className="plan-todo-add-btn"
                aria-label="Add step"
              >
                <IconPlus size={12} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
