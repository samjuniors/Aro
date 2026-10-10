import { useState } from "react";
import { cn } from "../utils/cn";
import { DESIGN_SYSTEMS, THEMES, useApp } from "../lib/app";
import { specFor } from "../data/design";
import { IconCheck } from "./Icons";
import { Segmented } from "./ui";

export function AppearanceSettings() {
  const { design, setDesign, theme, setTheme } = useApp();
  const [density, setDensity] = useState<"comfortable" | "compact">(() => localStorage.getItem("conductor.density") === "compact" ? "compact" : "comfortable");
  const [motion, setMotion] = useState<"system" | "reduced">(() => localStorage.getItem("conductor.motion") === "reduced" ? "reduced" : "system");
  const spec = specFor(design);
  const themes = THEMES.filter((item) => spec.themes.includes(item.id));
  return <div className="scroll-thin min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-[820px] space-y-6 p-6">
    <div><h1 className="font-display text-[22px] font-semibold tracking-[-.03em] text-ink">Appearance</h1><p className="mt-1 text-[12px] text-ink-3">Design, color and density. Changes apply immediately and stay on this device.</p></div>
    <section><h2 className="mb-2.5 text-[12px] font-medium text-ink-2">Design system</h2><div className="grid gap-2.5 sm:grid-cols-2">
      {DESIGN_SYSTEMS.map((profile) => <button key={profile.id} onClick={() => setDesign(profile.id)} className={cn("overflow-hidden rounded-[11px] border text-left transition-colors", design === profile.id ? "border-ink-3" : "border-line hover:border-line-strong")}>
        <div className="h-[100px] p-2.5" style={{ background: profile.swatch[0], color: profile.swatch[2] }}><div className="flex h-full gap-1.5 rounded-[6px] border p-1.5" style={{ background: profile.swatch[1], borderColor: `${profile.swatch[2]}30` }}><div className="w-[26%] space-y-1.5 border-r border-current/10 pr-1.5"><div className="h-[4px] w-3/4 rounded-full bg-current opacity-65" />{[0, 1, 2, 3].map((i) => <div key={i} className="h-[3px] rounded-full bg-current opacity-20" />)}</div><div className="flex min-w-0 flex-1 flex-col"><div className="h-[5px] w-3/4 rounded-full bg-current opacity-65" /><div className="mt-2 h-[3px] rounded-full bg-current opacity-20" /><div className="mt-1 h-[3px] w-2/3 rounded-full bg-current opacity-15" /><div className="mt-auto flex h-[20px] items-center justify-end gap-1 rounded-[5px] border border-current/15 px-1"><i className="h-[3px] w-8 rounded-full bg-current opacity-40" /><i className="size-[9px] rounded-full" style={{ background: profile.swatch[3] }} /></div></div></div></div>
        <div className="flex items-center justify-between gap-3 bg-raise px-3 py-2.5"><div><p className="text-[12.5px] font-medium text-ink">{profile.label}</p><p className="mt-0.5 text-[10px] text-ink-4">{profile.source}</p></div>{design === profile.id && <IconCheck size={13} className="text-ink-2" />}</div>
      </button>)}
    </div></section>
    <section><h2 className="mb-2.5 text-[12px] font-medium text-ink-2">Color theme</h2><div className="flex flex-wrap gap-2">{themes.map((item) => <button key={item.id} onClick={() => setTheme(item.id)} className={cn("flex min-w-[120px] items-center gap-2.5 rounded-[9px] border bg-raise px-3 py-2 text-[12px]", theme === item.id ? "border-ink-3 text-ink" : "border-line text-ink-3 hover:border-line-strong")}><span className="flex overflow-hidden rounded-[3px]">{item.swatch.map((color) => <i key={color} className="h-4 w-2" style={{ background: color }} />)}</span>{item.label}{theme === item.id && <IconCheck size={10} className="ml-auto" />}</button>)}</div></section>
    <section className="divide-y divide-line-soft rounded-[11px] border border-line bg-raise">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5"><div><p className="text-[12px] font-medium text-ink-2">Density</p><p className="mt-0.5 text-[10.5px] text-ink-4">Adjusts row heights and spacing</p></div><Segmented value={density} onChange={(value) => { setDensity(value); localStorage.setItem("conductor.density", value); document.documentElement.setAttribute("data-density", value); }} items={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5"><div><p className="text-[12px] font-medium text-ink-2">Motion</p><p className="mt-0.5 text-[10.5px] text-ink-4">System follows your operating system</p></div><Segmented value={motion} onChange={(value) => { setMotion(value); localStorage.setItem("conductor.motion", value); document.documentElement.setAttribute("data-motion", value); }} items={[{ value: "system", label: "System" }, { value: "reduced", label: "Reduced" }]} /></div>
    </section>
    <section className="border-t border-line-soft pt-4"><h2 className="text-[12px] font-medium text-ink-2">{spec.label} specifications</h2><div className="mt-2 grid gap-x-6 gap-y-1.5 font-mono text-[10px] text-ink-4 sm:grid-cols-2">{[spec.type.display, spec.type.body, spec.type.meta, spec.type.mono].map((type) => <div key={type.role} className="flex justify-between"><span>{type.role}</span><span>{type.family} · {type.size}</span></div>)}<div className="flex justify-between"><span>Sidebar / context</span><span>{spec.panels.sidebar} / {spec.panels.context}px</span></div><div className="flex justify-between"><span>Panel / control radius</span><span>{spec.shape.radiusPanel} / {spec.shape.radiusControl}</span></div></div></section>
  </div></div>;
}