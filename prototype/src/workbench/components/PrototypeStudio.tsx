"use client";

import { useState } from "react";
import { cn } from "../utils/cn";
import {
  IconCheck,
  IconX,
  IconGlobe,
  IconGit,
  IconTerminal,
  IconPin,
  IconBrain,
  IconFolder,
  IconSearch,
  IconList,
  IconGrid,
  IconClock,
  IconSliders,
  IconPanelLeft,
  IconPanelRight,
  IconPanelBottom,
  IconMic,
  IconKeyboard,
  IconExternalIde,
  IconPlus,
} from "./Icons";
import { Modal, Button, Toggle, Kbd } from "./ui";
import {
  usePrototypeConfig,
  PROTOTYPE_PRESETS,
  type PrototypeConfig,
} from "../config/prototypeConfig";
import { WORKSPACE_TOOLS, type WorkspaceTool } from "./WorkspacePanel";
import { useApp } from "../lib/app";

interface PrototypeStudioProps {
  open: boolean;
  onClose: () => void;
}

export function PrototypeStudio({ open, onClose }: PrototypeStudioProps) {
  const { toast } = useApp();
  const { config, updateConfig, resetConfig, applyPreset } = usePrototypeConfig();
  const [activeTab, setActiveTab] = useState<"layout" | "titlebar" | "tools" | "composer" | "presets">("layout");

  const toggleLayout = (key: keyof PrototypeConfig["layout"]) => {
    updateConfig((prev) => ({
      ...prev,
      layout: { ...prev.layout, [key]: !prev.layout[key] },
    }));
    toast(`Layout: ${key} toggled`, "iris");
  };

  const toggleTitlebar = (key: keyof PrototypeConfig["titlebar"]) => {
    updateConfig((prev) => ({
      ...prev,
      titlebar: { ...prev.titlebar, [key]: !prev.titlebar[key] },
    }));
    toast(`Titlebar: ${key} toggled`, "iris");
  };

  const toggleTool = (toolId: WorkspaceTool) => {
    updateConfig((prev) => {
      const exists = prev.workspace.enabledTools.includes(toolId);
      const nextTools = exists
        ? prev.workspace.enabledTools.filter((t) => t !== toolId)
        : [...prev.workspace.enabledTools, toolId];
      return {
        ...prev,
        workspace: { ...prev.workspace, enabledTools: nextTools },
      };
    });
  };

  const toggleComposer = (key: keyof PrototypeConfig["composer"]) => {
    updateConfig((prev) => ({
      ...prev,
      composer: { ...prev.composer, [key]: !prev.composer[key] },
    }));
  };

  const handleReset = () => {
    resetConfig();
    toast("Prototype configuration reset to defaults", "mint");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prototype Studio & Layout Engine"
      sub="Dynamically configure layout components, titlebar buttons, workspace tools, and feature slots."
      width={720}
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-line pb-2">
          {(
            [
              { id: "layout", label: "Panels & Shell" },
              { id: "titlebar", label: "Titlebar & Actions" },
              { id: "tools", label: "Workspace Tools" },
              { id: "composer", label: "Composer Slots" },
              { id: "presets", label: "Layout Presets" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "cursor-pointer rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-raise text-ink shadow-e1"
                  : "text-ink-3 hover:bg-hover hover:text-ink-2"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Layout & Panels */}
        {activeTab === "layout" && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-3">
              Enable or disable core shell regions and floating drawers. Changes apply live to the workbench.
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { key: "sidebar" as const, label: "Left Sidebar", desc: "Session history & navigation", icon: IconPanelLeft },
                { key: "workspacePanel" as const, label: "Right Workspace Panel", desc: "Docked tool tabs (browse/diff/files/etc)", icon: IconPanelRight },
                { key: "terminal" as const, label: "Bottom Terminal", desc: "Embedded command output shell", icon: IconPanelBottom },
                { key: "statusBar" as const, label: "Footer Status Bar", desc: "Token counters, branch & runtime status", icon: IconSliders },
                { key: "repoBar" as const, label: "Repo Git Dock", desc: "Quick commit, branch & diff bar", icon: IconGit },
                { key: "planCorner" as const, label: "Agent Plan Strip", desc: "Step checklist directly above composer", icon: IconList },
                { key: "voiceOrb" as const, label: "Voice Assistant Orb", desc: "Floating speech & dictation interface", icon: IconMic },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-well/40 p-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-raise text-iris-soft">
                      <item.icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[12px] font-medium text-ink">{item.label}</span>
                      <span className="block truncate text-[10.5px] text-ink-4">{item.desc}</span>
                    </div>
                  </div>
                  <Toggle
                    checked={config.layout[item.key]}
                    onChange={() => toggleLayout(item.key)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Titlebar & Actions */}
        {activeTab === "titlebar" && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-3">
              Configure which buttons, pills, and selectors appear across the top header bar.
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { key: "productSwitcher" as const, label: "Code / Agent Switcher", desc: "Toggle between Code & Agent workflows" },
                { key: "projectTitle" as const, label: "Project Title & Branch", desc: "Display active repository, color dot and git branch" },
                { key: "searchPill" as const, label: "Global Search Pill", desc: "⌘K Command palette trigger" },
                { key: "shortcutsBtn" as const, label: "Keyboard Shortcuts", desc: "⌘/ Cheat-sheet trigger" },
                { key: "quickSettings" as const, label: "Quick Settings Menu", desc: "Theme dots & panel toggles" },
                { key: "studioBtn" as const, label: "Prototype Studio Button", desc: "Direct header button to open this studio" },
                { key: "profileAvatar" as const, label: "Profile Avatar & Switcher", desc: "Avatar pill to switch profiles, sign in or create custom profiles" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-well/40 p-2.5"
                >
                  <div className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-ink">{item.label}</span>
                    <span className="block text-[10.5px] text-ink-4">{item.desc}</span>
                  </div>
                  <Toggle
                    checked={config.titlebar[item.key]}
                    onChange={() => toggleTitlebar(item.key)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Workspace Tools */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-3">
                Enable or remove tools from the Workspace Panel tabstrip and tool picker.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-4">Fixed tab width:</span>
                <Toggle
                  checked={config.workspace.fixedTabWidth}
                  onChange={(v) =>
                    updateConfig((prev) => ({
                      ...prev,
                      workspace: { ...prev.workspace, fixedTabWidth: v },
                    }))
                  }
                  size="sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WORKSPACE_TOOLS.map((tool) => {
                const isEnabled = config.workspace.enabledTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-[8px] border p-2.5 text-left transition-all",
                      isEnabled
                        ? "border-iris/50 bg-iris-tint"
                        : "border-line-soft bg-raise/50 opacity-60 hover:opacity-100"
                    )}
                  >
                    <span className={cn("mt-0.5", isEnabled ? "text-iris-soft" : "text-ink-4")}>
                      <tool.icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-ink">{tool.label}</span>
                      <span className="block text-[10px] text-ink-4 leading-tight">{tool.desc}</span>
                    </div>
                    {isEnabled && <IconCheck size={12} className="text-iris-soft" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Composer */}
        {activeTab === "composer" && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-3">
              Customize controls and buttons available in the chat composer bar.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { key: "attachments" as const, label: "File Attachments (+)", desc: "Attach text, code files or context" },
                { key: "projectPicker" as const, label: "Project Attach Button", desc: "Folder icon to switch or link projects" },
                { key: "permissions" as const, label: "Permissions Selector", desc: "Full access, ask first, read only, plan first" },
                { key: "modelSelector" as const, label: "Model & Effort Slider", desc: "Model picker with 5-level reasoning ramp" },
                { key: "voiceButton" as const, label: "Dictation Mic Button", desc: "Speech-to-text recording in composer" },
                { key: "freshSuggestions" as const, label: "Fresh Session Idea Chips", desc: "Suggest starter prompts on empty sessions" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-well/40 p-2.5"
                >
                  <div className="min-w-0">
                    <span className="block text-[12px] font-medium text-ink">{item.label}</span>
                    <span className="block text-[10.5px] text-ink-4">{item.desc}</span>
                  </div>
                  <Toggle
                    checked={config.composer[item.key]}
                    onChange={() => toggleComposer(item.key)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Layout Presets */}
        {activeTab === "presets" && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-3">
              Quickly switch between complete layout configurations with one click:
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {PROTOTYPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    applyPreset(preset.id);
                    toast(`Applied "${preset.name}" preset`, "mint");
                  }}
                  className="flex cursor-pointer flex-col rounded-[8px] border border-line bg-raise p-3 text-left transition-all hover:border-line-strong hover:bg-hover active:scale-[0.98]"
                >
                  <span className="text-[13px] font-semibold text-ink">{preset.name}</span>
                  <span className="mt-1 text-[11px] leading-relaxed text-ink-3">{preset.desc}</span>
                  <span className="mt-3 text-[10.5px] font-medium text-iris-soft">Apply Preset →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-line pt-3 mt-2">
          <Button variant="ghost" onClick={handleReset} size="sm">
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={onClose} size="sm">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
