import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { useApp, type Todo } from "../lib/app";
import type { ModeId, Session, Step } from "../data/catalog";
import { IconCheck, IconChevronDown, IconPlus, IconSpark } from "./Icons";
import { Bar } from "./ui";

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

export function PlanTodoCorner({
  session,
  mode,
}: {
  session: Session;
  mode?: ModeId;
}) {
  const { todos, setTodos } = useApp();
  // Open by default when a new plan is created, but collapsible via small arrow
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const planItems = useMemo(() => extractPlanTodos(session.steps), [session.steps]);

  const sessionTodos = useMemo(() => {
    return todos.filter((t) => t.by === "agent");
  }, [todos]);

  const hasAgentPlan = planItems.length > 0 || sessionTodos.length > 0;
  // Visible when in plan mode or when agent has drafted a plan
  const isVisible = hasAgentPlan || mode === "plan";

  // Auto-open once when an agent plan actually lands in the session
  const prevPlanCount = useRef(planItems.length);
  useEffect(() => {
    if (planItems.length > 0 && prevPlanCount.current === 0) {
      setOpen(true);
    }
    prevPlanCount.current = planItems.length;
  }, [planItems.length]);

  // Click outside to close the popup if open
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [open]);

  if (!isVisible) {
    return null;
  }

  const effectiveTodos: Todo[] = sessionTodos.length > 0
    ? sessionTodos
    : planItems.length > 0
    ? planItems.map((text, i) => ({
        id: `plan-${i}`,
        text,
        state: "todo" as const,
        by: "agent" as const,
      }))
    : [
        {
          id: "plan-default-1",
          text: "Outline project requirements and architecture",
          state: "doing" as const,
          by: "agent" as const,
        },
        {
          id: "plan-default-2",
          text: "Identify files and endpoints to modify",
          state: "todo" as const,
          by: "agent" as const,
        },
        {
          id: "plan-default-3",
          text: "Review proposed changes before executing",
          state: "todo" as const,
          by: "agent" as const,
        },
      ];

  const doneCount = effectiveTodos.filter((t) => t.state === "done").length;
  const totalCount = effectiveTodos.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const toggleItem = (todoId: string, current: Todo["state"]) => {
    const nextState: Todo["state"] = current === "done" ? "todo" : current === "todo" ? "doing" : "done";
    setTodos((prev: Todo[]) => {
      const exists = prev.some((t) => t.id === todoId);
      if (exists) {
        return prev.map((t) => (t.id === todoId ? { ...t, state: nextState } : t));
      } else {
        return [
          ...prev,
          ...effectiveTodos.map((et) => (et.id === todoId ? { ...et, state: nextState } : et)),
        ];
      }
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setTodos((prev: Todo[]) => [
      ...prev,
      {
        id: `plan-user-${Date.now()}`,
        text: newText.trim(),
        state: "todo",
        by: "agent",
      },
    ]);
    setNewText("");
  };

  return (
    <div ref={popoverRef} className="plan-todo-corner-anchor">
      {/* Small corner button at top-right of composer */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "plan-todo-trigger-pill",
          open && "is-active",
          doneCount === totalCount && totalCount > 0 && "is-completed"
        )}
        aria-expanded={open}
        aria-label="Toggle agent plan tasks"
      >
        <span className="plan-todo-pill-icon">
          <IconSpark size={11} />
        </span>
        <span className="plan-todo-pill-label">Plan</span>
        <span className="plan-todo-pill-stats font-mono">
          {doneCount}/{totalCount}
        </span>
        <IconChevronDown
          size={11}
          className={cn("plan-todo-pill-arrow transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* Floating dropdown panel positioned at top-right */}
      {open && (
        <div className="plan-todo-dropdown animate-slide-down shadow-e4">
          <div className="plan-todo-header">
            <div className="plan-todo-title-wrap">
              <span className="plan-todo-badge">
                <IconSpark size={10} />
                <span>Agent plan</span>
              </span>
              <span className="plan-todo-count font-mono">
                {doneCount} of {totalCount} completed
              </span>
            </div>
            <button
              type="button"
              className="plan-todo-toggle-btn"
              onClick={() => setOpen(false)}
              aria-label="Close plan panel"
            >
              <IconChevronDown size={12} className="rotate-180" />
            </button>
          </div>

          <div className="plan-todo-body">
            <div className="plan-todo-bar">
              <Bar value={progressPct} tone={progressPct === 100 ? "mint" : "iris"} height={3} />
            </div>

            <div className="plan-todo-list scroll-thin">
              {effectiveTodos.map((item) => {
                const isDone = item.state === "done";
                const isDoing = item.state === "doing";
                return (
                  <div key={item.id} className="plan-todo-item group">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id, item.state)}
                      className={cn(
                        "plan-todo-checkbox",
                        isDone && "is-done",
                        isDoing && "is-doing"
                      )}
                      aria-label={`Mark "${item.text}" as ${isDone ? "incomplete" : "complete"}`}
                    >
                      {isDone && <IconCheck size={9} />}
                      {isDoing && <span className="plan-todo-pulse-dot" />}
                    </button>
                    <span className={cn("plan-todo-text", isDone && "line-through opacity-50")}>
                      {item.text}
                    </span>
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
