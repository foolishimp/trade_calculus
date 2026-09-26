import type { AnalysisContext, OilAssessment } from "./risk.ts";
import { validateContext } from "./risk.ts";
import { identifier, instant, nonnegative, unique } from "./validation.ts";

export interface OverlayAssessment {
  readonly overlayId: string;
  readonly results: readonly { readonly candidateId: string; readonly accepted: boolean; readonly reason: string }[];
}
export interface Decision {
  readonly action: "recommend" | "no-trade" | "seek-evidence" | "defer";
  readonly candidateId: string | null;
  readonly objective: "maximum expected net P&L among supplied candidates";
  readonly context: AnalysisContext;
  readonly reasons: readonly string[];
  readonly alternatives: readonly { readonly candidateId: string; readonly expectedPnlUsd: number; readonly exclusions: readonly string[] }[];
  readonly conditions: readonly string[];
}

/** REQ-07/08: analytical selection; external assessments have separate identities. */
export function compareCandidates(
  candidates: readonly OilAssessment[],
  inputs: { readonly decisionAt: string; readonly availableMarginUsd: number; readonly executionKnowledge: "resolved" | "unresolved" | "conflicted" },
  overlays: readonly OverlayAssessment[] = [],
): Decision {
  if (!candidates.length) throw new Error("Candidates are required");
  unique(candidates.map(c => c.candidateId), "candidate ids");
  const baselines = candidates.filter(c => c.action === "no-trade");
  if (baselines.length !== 1) throw new Error("Exactly one no-trade baseline is required");
  const context = candidates[0]!.context;
  for (const candidate of candidates) {
    validateContext(candidate.context);
    if (JSON.stringify(candidate.context) !== JSON.stringify(context)) throw new Error("Candidates use different analysis contexts");
  }
  nonnegative(inputs.availableMarginUsd, "available margin");
  unique(overlays.map(o => o.overlayId), "overlay ids");
  for (const overlay of overlays) {
    identifier(overlay.overlayId, "overlay id");
    unique(overlay.results.map(r => r.candidateId), "overlay candidate ids");
    if (overlay.results.length !== candidates.length || candidates.some(c => !overlay.results.some(r => r.candidateId === c.candidateId))) {
      throw new Error("Each supplied overlay must assess every candidate exactly once");
    }
  }
  const alternatives = candidates.map(candidate => ({
    candidateId: candidate.candidateId, expectedPnlUsd: candidate.completed.expectedPnlUsd,
    exclusions: [
      ...(candidate.peakVariationMarginUsd > inputs.availableMarginUsd ? ["Insufficient available margin reserve"] : []),
      ...overlays.flatMap(overlay => overlay.results.filter(r => r.candidateId === candidate.candidateId && !r.accepted).map(r => `${overlay.overlayId}: ${r.reason}`)),
    ],
  }));
  const base = { objective: "maximum expected net P&L among supplied candidates" as const, context, alternatives };
  const decisionTime = instant(inputs.decisionAt);
  if (decisionTime < instant(context.valuationAt) || decisionTime < instant(context.knowledgeCutoff) || decisionTime > instant(context.validUntil)) {
    return { ...base, action: "defer", candidateId: null, reasons: ["Analysis context is not valid at the decision time"], conditions: [] };
  }
  if (inputs.executionKnowledge !== "resolved") {
    return { ...base, action: "seek-evidence", candidateId: null, reasons: ["Reconcile unresolved or conflicting execution before proposing further exposure"], conditions: [] };
  }
  const eligible = candidates.filter(c => !alternatives.find(a => a.candidateId === c.candidateId)!.exclusions.length)
    .sort((a, b) => b.completed.expectedPnlUsd - a.completed.expectedPnlUsd || Number(b.action === "no-trade") - Number(a.action === "no-trade"));
  const selected = eligible[0];
  if (!selected) return { ...base, action: "defer", candidateId: null, reasons: ["No candidate satisfies the supplied conditions"], conditions: [] };
  return {
    ...base, action: selected.action === "no-trade" ? "no-trade" : "recommend", candidateId: selected.candidateId,
    reasons: ["Highest expected net P&L among candidates satisfying resource and supplied overlay conditions"],
    conditions: selected.conditions,
  };
}
