import type { DesignId, ThemeId } from "../lib/app";

/* ============================================================
   DESIGN SYSTEM SPEC
   Every system is documented as a real spec: type pairing with
   sizes, a spacing scale, panel geometry, shape language and
   elevation — not just a palette.
   ============================================================ */
export type TypeStep = { role: string; family: string; size: string; weight: string; tracking: string; usage: string };
export type SpacingStep = { token: string; px: number; usage: string };

export type DesignSpec = {
  id: DesignId;
  label: string;
  source: string;
  summary: string;
  /** color themes that belong to this system */
  themes: ThemeId[];
  defaultTheme: ThemeId;
  type: { display: TypeStep; title: TypeStep; body: TypeStep; meta: TypeStep; mono: TypeStep };
  spacing: { base: number; scale: SpacingStep[]; panelPad: string; rowHeight: string; sectionGap: string };
  shape: { radiusPanel: string; radiusControl: string; radiusCard: string; borderStyle: string; rule: string };
  panels: { sidebar: number; context: number; chrome: number; composer: string };
  elevation: string;
  feel: string[];
  /** what to copy from it */
  signature: string;
  swatch: string[];
};

export const DESIGN_SPECS: DesignSpec[] = [
  {
    id: "aro", label: "Aro", source: "Aro",
    summary: "Balanced dark control surface. Violet signal, cyan state, generous context panel, soft elevation.",
    themes: ["obsidian", "nord", "daylight", "ember"], defaultTheme: "obsidian",
    type: {
      display: { role: "Display", family: "Space Grotesk", size: "23–30px", weight: "600", tracking: "-0.025em", usage: "Page titles, empty-state headlines" },
      title: { role: "Title", family: "Space Grotesk", size: "13.5px", weight: "600", tracking: "-0.015em", usage: "Panel and thread headers" },
      body: { role: "Body", family: "Inter", size: "13.5px", weight: "400", tracking: "0", usage: "Transcript prose, descriptions" },
      meta: { role: "Meta", family: "Inter", size: "11–12px", weight: "500", tracking: "0", usage: "Rows, secondary labels" },
      mono: { role: "Mono", family: "JetBrains Mono", size: "11–11.5px", weight: "450", tracking: "-0.01em", usage: "Paths, commands, counts, diffs" },
    },
    spacing: {
      base: 4, panelPad: "12px", rowHeight: "28–30px", sectionGap: "12px",
      scale: [
        { token: "space-1", px: 4, usage: "Icon gaps, tight clusters" },
        { token: "space-2", px: 8, usage: "Control padding, list gaps" },
        { token: "space-3", px: 12, usage: "Panel padding, card padding" },
        { token: "space-4", px: 16, usage: "Between cards, page gutters" },
        { token: "space-6", px: 24, usage: "Page padding, section breaks" },
      ],
    },
    shape: { radiusPanel: "10px", radiusControl: "7px", radiusCard: "12px", borderStyle: "1px hairline, 100% opacity", rule: "1px solid" },
    panels: { sidebar: 292, context: 368, chrome: 46, composer: "16px radius, 220px max height" },
    elevation: "Soft: 4-step shadow (e1–e4) + inset top highlight on raised chrome",
    feel: ["Balanced density", "Signal colour", "Soft elevation", "Generous context"],
    signature: "The context pane's icon rail with live counts, and the composer's iris glow while streaming.",
    swatch: ["#0c0e14", "#12151d", "#8f82ff", "#35d6c4"],
  },
  {
    id: "codex", label: "Codex", source: "Codex desktop",
    summary: "Project-first, quiet monochrome, tight rows, review-forward. Nothing competes with the thread or the diff.",
    themes: ["obsidian", "daylight", "nord"], defaultTheme: "obsidian",
    type: {
      display: { role: "Display", family: "Inter", size: "19–22px", weight: "600", tracking: "-0.02em", usage: "Page titles — deliberately quieter than Aro" },
      title: { role: "Title", family: "Inter", size: "13px", weight: "600", tracking: "-0.01em", usage: "Headers" },
      body: { role: "Body", family: "Inter", size: "13px", weight: "400", tracking: "0", usage: "Transcript prose" },
      meta: { role: "Meta", family: "Inter", size: "11.5px", weight: "500", tracking: "0", usage: "Rows, hints" },
      mono: { role: "Mono", family: "JetBrains Mono", size: "11px", weight: "400", tracking: "0", usage: "Paths, diffs, commands" },
    },
    spacing: {
      base: 4, panelPad: "10px", rowHeight: "26–28px", sectionGap: "10px",
      scale: [
        { token: "space-1", px: 4, usage: "Icon gaps" },
        { token: "space-2", px: 8, usage: "Row padding" },
        { token: "space-3", px: 10, usage: "Panel padding" },
        { token: "space-4", px: 14, usage: "Between cards" },
        { token: "space-5", px: 20, usage: "Page gutters" },
      ],
    },
    shape: { radiusPanel: "8px", radiusControl: "6px", radiusCard: "8px", borderStyle: "1px hairline at 86% — recedes", rule: "1px solid" },
    panels: { sidebar: 292, context: 400, chrome: 44, composer: "12px radius, 200px max height" },
    elevation: "Flat: single 1px shadow, no glow. State is carried by colour, not elevation.",
    feel: ["Project sidebar", "Tight rows", "Quiet chrome", "Review-forward"],
    signature: "Wider review pane (400px) and monochrome chrome — the diff is the only thing with colour.",
    swatch: ["#0a0a0b", "#111214", "#d6d6d2", "#8f8f88"],
  },
  {
    id: "claude", label: "Claude Code", source: "Claude Code desktop",
    summary: "Session-centric warm graphite. Conversation first, generous corners, status always legible.",
    themes: ["ember", "paper", "obsidian", "nord"], defaultTheme: "ember",
    type: {
      display: { role: "Display", family: "Inter", size: "21–26px", weight: "600", tracking: "-0.022em", usage: "Page titles" },
      title: { role: "Title", family: "Inter", size: "13.5px", weight: "600", tracking: "-0.015em", usage: "Headers" },
      body: { role: "Body", family: "Inter", size: "13.5px", weight: "400", tracking: "0", usage: "Transcript prose — slightly larger line-height" },
      meta: { role: "Meta", family: "Inter", size: "12px", weight: "500", tracking: "0", usage: "Rows, hints" },
      mono: { role: "Mono", family: "JetBrains Mono", size: "11.5px", weight: "450", tracking: "0", usage: "Paths, commands" },
    },
    spacing: {
      base: 4, panelPad: "14px", rowHeight: "30–32px", sectionGap: "14px",
      scale: [
        { token: "space-1", px: 4, usage: "Icon gaps" },
        { token: "space-2", px: 8, usage: "Control padding" },
        { token: "space-3", px: 14, usage: "Panel padding" },
        { token: "space-4", px: 18, usage: "Between cards" },
        { token: "space-6", px: 24, usage: "Page padding" },
      ],
    },
    shape: { radiusPanel: "12px", radiusControl: "8px", radiusCard: "14px", borderStyle: "1px hairline at 90%", rule: "1px solid, warm-tinted" },
    panels: { sidebar: 284, context: 382, chrome: 48, composer: "16px radius, 240px max height" },
    elevation: "Warm lift: 8px/24px shadow with amber-tinted raise surfaces",
    feel: ["Warm graphite", "Conversation focus", "Status clarity", "Softer corners"],
    signature: "Warm-tinted raised surfaces and the largest chrome height (48px) so headers never feel cramped.",
    swatch: ["#181614", "#25211e", "#e29a68", "#a9c7ad"],
  },
  {
    id: "editorial", label: "Editorial", source: "Attached references",
    summary: "Magazine rhythm: serif display, squared panels, hard rules, oversized numbers. Light and dark both supported.",
    themes: ["paper", "ink"], defaultTheme: "paper",
    type: {
      display: { role: "Display", family: "Newsreader (serif)", size: "34–44px", weight: "600", tracking: "-0.03em", usage: "Page titles — the loudest voice in the app" },
      title: { role: "Title", family: "Newsreader", size: "16px", weight: "600", tracking: "-0.01em", usage: "Panel headers" },
      body: { role: "Body", family: "DM Sans", size: "13.5px", weight: "400", tracking: "0", usage: "Prose" },
      meta: { role: "Meta", family: "DM Sans", size: "11.5px", weight: "500", tracking: "0", usage: "Rows" },
      mono: { role: "Mono", family: "JetBrains Mono", size: "11.5px", weight: "450", tracking: "-0.02em", usage: "Paths, code" },
    },
    spacing: {
      base: 4, panelPad: "16px", rowHeight: "30–34px", sectionGap: "16px",
      scale: [
        { token: "space-1", px: 4, usage: "Icon gaps" },
        { token: "space-2", px: 8, usage: "Control padding" },
        { token: "space-3", px: 16, usage: "Panel padding" },
        { token: "space-4", px: 20, usage: "Between cards" },
        { token: "space-6", px: 28, usage: "Page padding" },
      ],
    },
    shape: { radiusPanel: "4px", radiusControl: "3px", radiusCard: "3px", borderStyle: "1px solid, high-contrast ink", rule: "2px solid ink — hard rules" },
    panels: { sidebar: 304, context: 420, chrome: 52, composer: "4px radius, 260px max height" },
    elevation: "Paper: no shadow, hairline + 1px rule. Ink: same, inverted on near-black.",
    feel: ["Oversized headlines", "Hard rules", "Squared panels", "Magazine rhythm"],
    signature: "Serif display at 34px+, 2px rules and a near-zero radius — structure instead of decoration.",
    swatch: ["#f8f3ea", "#fffdf8", "#17130e", "#df5e2e"],
  },
  {
    id: "cursor", label: "Cursor", source: "Cursor 2.x",
    summary: "VS Code lineage: compact, keyboard-first, small type, dense rows, subtle blue signal.",
    themes: ["obsidian", "daylight", "nord"], defaultTheme: "obsidian",
    type: {
      display: { role: "Display", family: "Inter", size: "17–20px", weight: "600", tracking: "-0.018em", usage: "Page titles — smallest of all systems" },
      title: { role: "Title", family: "Inter", size: "12.5px", weight: "600", tracking: "-0.005em", usage: "Headers" },
      body: { role: "Body", family: "Inter", size: "12.5px", weight: "400", tracking: "0", usage: "Transcript prose" },
      meta: { role: "Meta", family: "Inter", size: "11px", weight: "500", tracking: "0", usage: "Rows, hints" },
      mono: { role: "Mono", family: "JetBrains Mono", size: "10.5px", weight: "400", tracking: "0", usage: "Paths, code, counts" },
    },
    spacing: {
      base: 4, panelPad: "8px", rowHeight: "24–26px", sectionGap: "8px",
      scale: [
        { token: "space-1", px: 2, usage: "Tightest clusters" },
        { token: "space-2", px: 6, usage: "Row padding" },
        { token: "space-3", px: 8, usage: "Panel padding" },
        { token: "space-4", px: 12, usage: "Between cards" },
        { token: "space-5", px: 18, usage: "Page gutters" },
      ],
    },
    shape: { radiusPanel: "6px", radiusControl: "5px", radiusCard: "8px", borderStyle: "1px hairline at 92%", rule: "1px solid" },
    panels: { sidebar: 248, context: 352, chrome: 42, composer: "10px radius, 180px max height" },
    elevation: "Flat with 1px borders; selection is a tinted bar, not a shadow.",
    feel: ["Compact", "Keyboard-first", "Dense rows", "Subtle blue signal"],
    signature: "Narrowest panels, 42px chrome and 12.5px base type — the most information per pixel.",
    swatch: ["#0d1117", "#161b22", "#58a6ff", "#3fb950"],
  },
];

export const specFor = (id: DesignId) => DESIGN_SPECS.find((d) => d.id === id) ?? DESIGN_SPECS[0];
