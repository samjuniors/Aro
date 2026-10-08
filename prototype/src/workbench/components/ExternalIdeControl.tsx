"use client";

import { useState } from "react";
import { cn } from "../utils/cn";
import { IconCheck, IconChevronDown, IconExternalIde, IconCursor, IconVSCode, IconWindsurf, IconZed } from "./Icons";
import { Menu, MenuLabel, MenuSep, Tip } from "./ui";
import { useApp } from "../lib/app";
import { IDE_CATALOG, usePrototypeConfig, type SupportedIde } from "../config/prototypeConfig";
import type { Project } from "../data/providers";

interface ExternalIdeControlProps {
  project?: Project;
  compact?: boolean;
}

export function ExternalIdeControl({ project, compact = false }: ExternalIdeControlProps) {
  const { toast } = useApp();
  const { config, updateConfig } = usePrototypeConfig();
  const preferred = config.preferredIde || "cursor";

  const getIdeIcon = (id: SupportedIde, size = 14) => {
    switch (id) {
      case "cursor":
        return <IconCursor size={size} />;
      case "vscode":
        return <IconVSCode size={size} />;
      case "windsurf":
        return <IconWindsurf size={size} />;
      case "zed":
        return <IconZed size={size} />;
      default:
        return <IconExternalIde size={size} />;
    }
  };

  const projectPath = project?.path || project?.sources?.[0]?.path || "e:/Projects/SamjuniorsProducts/Aro";

  const openInIde = (ideId: SupportedIde) => {
    const ide = IDE_CATALOG.find((i) => i.id === ideId);
    if (!ide) return;

    // Save as preferred IDE
    updateConfig((prev) => ({ ...prev, preferredIde: ideId }));

    try {
      // Protocol launch attempt
      const targetUrl = `${ide.scheme}://${encodeURI(projectPath.replace(/\\/g, "/"))}`;
      window.open(targetUrl, "_self");
      toast(`Opening in ${ide.name}…`, "iris");
    } catch {
      toast(`Launched ${ide.name} protocol for ${project?.name || "workspace"}`, "iris");
    }
  };

  const copyPath = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(projectPath);
      toast("Project path copied to clipboard", "mint");
    }
  };

  const currentIde = IDE_CATALOG.find((i) => i.id === preferred) || IDE_CATALOG[0];

  return (
    <div className="inline-flex items-center rounded-[7px] border border-line bg-raise transition-colors hover:border-line-strong shadow-e1">
      {/* 1. Direct launch on name / icon */}
      <Tip label={`Open in ${currentIde.name}`} side="top">
        <button
          type="button"
          onClick={() => openInIde(preferred)}
          className={cn(
            "group inline-flex h-[24px] cursor-pointer items-center gap-1.5 rounded-l-[6px] px-2 text-[11.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink active:scale-[0.98]",
            compact && "px-1.5"
          )}
          aria-label={`Open project in ${currentIde.name}`}
        >
          <span className="flex items-center justify-center text-iris-soft transition-transform group-hover:scale-110">
            {getIdeIcon(preferred, 13)}
          </span>
          <span className="font-medium">{currentIde.name}</span>
        </button>
      </Tip>

      {/* Divider with breathing room */}
      <span className="h-3 w-px bg-line-soft shrink-0" aria-hidden="true" />

      {/* 2. Chevron arrow with space to switch connected IDEs */}
      <Menu
        align="right"
        side="top"
        width={248}
        trigger={(open) => (
          <Tip label="Switch connected IDE or copy path" side="top">
            <button
              type="button"
              className={cn(
                "flex h-[24px] cursor-pointer items-center justify-center rounded-r-[6px] px-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink",
                open && "bg-hover text-ink"
              )}
              aria-label="Switch connected IDE"
            >
              <IconChevronDown
                size={10}
                className={cn("transition-transform duration-150", open && "rotate-180 text-iris-soft")}
              />
            </button>
          </Tip>
        )}
      >
        {(close) => (
          <div className="p-1">
            <MenuLabel>Connected IDEs</MenuLabel>
            <div className="space-y-0.5">
              {IDE_CATALOG.map((ide) => {
                const isPreferred = ide.id === preferred;
                return (
                  <button
                    key={ide.id}
                    type="button"
                    onClick={() => {
                      updateConfig((prev) => ({ ...prev, preferredIde: ide.id }));
                      openInIde(ide.id);
                      close();
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-left text-[12px] transition-colors",
                      isPreferred ? "bg-raise font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
                    )}
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-[5px]"
                      style={{ color: ide.color }}
                    >
                      {getIdeIcon(ide.id, 14)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block leading-none">{ide.name}</span>
                      <span className="block text-[10px] text-ink-4">{ide.tagline}</span>
                    </span>
                    {isPreferred && <IconCheck size={12} className="text-iris-soft" />}
                  </button>
                );
              })}
            </div>

            <MenuSep />

            <button
              type="button"
              onClick={() => {
                copyPath();
                close();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-left text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <span className="flex size-4 items-center justify-center text-ink-4">
                <IconExternalIde size={12} />
              </span>
              <span className="truncate">Copy path ({projectPath.split("/").pop() || "project"})</span>
            </button>
          </div>
        )}
      </Menu>
    </div>
  );
}
