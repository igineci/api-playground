import type { PipelineStage } from "../types";

export const STAGES = [
  "idle",
  "sending",
  "waiting",
  "success",
  "error",
] as const satisfies PipelineStage[];

export function toLabel(stage: PipelineStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function getStageStyles(
  stage: PipelineStage,
  current: PipelineStage,
): string {
  const isActive = stage === current;

  const base = [
    "flex items-center gap-2 px-3.5 py-1.5",
    "rounded-md border font-mono text-[11px]",
    "font-medium tracking-widest uppercase",
    "transition-all duration-500 ease-in-out",
    "select-none",
  ].join(" ");

  if (!isActive) {
    return `${base} text-zinc-600 border-zinc-800 bg-transparent`;
  }

  const activeStyles: Record<PipelineStage, string> = {
    idle: "text-zinc-400 border-zinc-700 bg-zinc-900",
    sending:
      "text-blue-400 border-blue-800 bg-blue-950 shadow-[0_0_12px_rgba(96,165,250,0.15)]",
    waiting:
      "text-violet-400 border-violet-800 bg-violet-950 shadow-[0_0_12px_rgba(167,139,250,0.15)]",
    success:
      "text-emerald-400 border-emerald-800 bg-emerald-950 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
    error:
      "text-red-400 border-red-800 bg-red-950 shadow-[0_0_12px_rgba(248,113,113,0.15)]",
  };

  return `${base} ${activeStyles[stage]}`;
}

export function getDotStyles(
  stage: PipelineStage,
  current: PipelineStage,
): string {
  const isActive = stage === current;

  const base =
    "w-1.5 h-1.5 rounded-full transition-all duration-500 ease-in-out flex-shrink-0";

  if (!isActive) return `${base} bg-zinc-700`;

  const dotStyles: Record<PipelineStage, string> = {
    idle: "bg-zinc-400",
    sending: "bg-blue-400 animate-pulse",
    waiting: "bg-violet-400 animate-pulse",
    success: "bg-emerald-400",
    error: "bg-red-400",
  };

  return `${base} ${dotStyles[stage]}`;
}
