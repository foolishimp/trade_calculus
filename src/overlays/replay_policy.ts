import { assessRiskAtScale } from "../pretrade_risk.ts";
import type { PretradeAssessment, PretradeRiskBasis } from "../pretrade_risk.ts";
import type { PriceExposure } from "../historical_risk.ts";
import { finite, nonnegative } from "../validation.ts";

export interface ReplayRiskPolicy {
  readonly mode: "control" | "observe";
  readonly maxExpectedShortfallUsd: number;
  readonly maxStressLossUsd: number;
  readonly maxGrossNotionalUsd: number;
}
export const defaultReplayPolicy: ReplayRiskPolicy = Object.freeze({
  mode: "control", maxExpectedShortfallUsd: 2500, maxStressLossUsd: 5000, maxGrossNotionalUsd: 150000,
});
export interface RiskDecision {
  readonly outcome: "accept" | "resize" | "reject" | "await-evidence" | "exit" | "flat" | "observe" | "horizon-close";
  readonly modelId: PretradeRiskBasis["modelId"];
  readonly evidenceThrough: string | null;
  readonly priorNavUsd: number;
  readonly policy: ReplayRiskPolicy;
  readonly proposedExposure: PriceExposure;
  readonly selectedExposure: PriceExposure;
  readonly currentExposure: PriceExposure;
  readonly scale: number;
  readonly proposedRisk: PretradeAssessment | null;
  readonly selectedRisk: PretradeAssessment | null;
  readonly calibration: PretradeRiskBasis["calibration"];
  readonly reasons: readonly string[];
  readonly unavoidableExitCostExceedsBudget: boolean;
}

export function validateReplayPolicy(policy: ReplayRiskPolicy): void {
  if (!["control", "observe"].includes(policy.mode)) throw new Error("Unknown risk policy mode");
  nonnegative(policy.maxExpectedShortfallUsd, "expected shortfall budget");
  nonnegative(policy.maxStressLossUsd, "stress budget");
  nonnegative(policy.maxGrossNotionalUsd, "notional limit");
}

/** REQ-16: illustrative sizing policy, separate from the calculation of risk. */
export function selectRiskExposure(basis: PretradeRiskBasis, priorNavUsd: number, policy: ReplayRiskPolicy, horizonClose = false): RiskDecision {
  validateReplayPolicy(policy); finite(priorNavUsd, "prior NAV");
  const limits = {
    tailLossWithCostsUsd: Math.min(policy.maxExpectedShortfallUsd, Math.max(0, priorNavUsd)),
    stressLossWithCostsUsd: Math.min(policy.maxStressLossUsd, Math.max(0, priorNavUsd)),
    grossNotionalUsd: Math.min(policy.maxGrossNotionalUsd, Math.max(0, priorNavUsd)),
  };
  const keys = Object.keys(limits) as (keyof typeof limits)[];
  const fits = (assessment: PretradeAssessment) => keys.every(key => assessment[key] <= limits[key] + 1e-7);
  const currentIsFlat = basis.current.brentBarrels === 0 && basis.current.wtiBarrels === 0;
  const proposedIsFlat = basis.proposed.brentBarrels === 0 && basis.proposed.wtiBarrels === 0;
  const full = assessRiskAtScale(basis, 1);
  const make = (scale: number, outcome: RiskDecision["outcome"], reasons: string[]): RiskDecision => {
    const selectedRisk = assessRiskAtScale(basis, scale);
    const exitCost = (Math.abs(basis.current.brentBarrels) + Math.abs(basis.current.wtiBarrels)) * basis.costPerBarrelUsd;
    const unavoidableExitCostExceedsBudget = scale === 0 && exitCost > Math.min(limits.tailLossWithCostsUsd, limits.stressLossWithCostsUsd);
    return {
      outcome, modelId: basis.modelId, evidenceThrough: basis.evidenceThrough, priorNavUsd,
      policy: { ...policy }, proposedExposure: basis.proposed, currentExposure: basis.current,
      selectedExposure: { brentBarrels: basis.proposed.brentBarrels * scale, wtiBarrels: basis.proposed.wtiBarrels * scale },
      scale, proposedRisk: full, selectedRisk, calibration: basis.calibration,
      reasons: [...reasons, ...(unavoidableExitCostExceedsBudget ? ["Unavoidable exit cost exceeds the supplied loss budget; exposure is closed"] : [])],
      unavoidableExitCostExceedsBudget,
    };
  };
  if (horizonClose) return make(0, "horizon-close", ["Close at the explicitly scheduled horizon"]);
  if (proposedIsFlat) return make(0, currentIsFlat ? "flat" : "exit", ["Strategy requests no exposure"]);
  if (policy.mode === "observe") return make(1, "observe", ["Observation-only counterfactual; risk does not select exposure"]);
  if (priorNavUsd <= 0) return make(0, currentIsFlat ? "reject" : "exit", ["Prior known NAV is nonpositive"]);
  if (!full) return make(0, "await-evidence", [`Need ${basis.requiredRows} prior observations; have ${basis.observedRows}`]);

  // All constrained quantities are affine between the transaction-cost kinks.
  // Intersect those intervals; scale zero need not be the cheapest rebalance.
  const knots = new Set([0, 1]);
  for (const key of ["brentBarrels", "wtiBarrels"] as const) {
    const crossing = basis.current[key] / basis.proposed[key];
    if (Number.isFinite(crossing) && crossing > 0 && crossing < 1) knots.add(crossing);
  }
  const boundaries = [...knots].sort((a, b) => a - b);
  let maximumScale = -1;
  for (let i = 1; i < boundaries.length; i++) {
    const a = boundaries[i - 1]!, b = boundaries[i]!;
    const atA = assessRiskAtScale(basis, a)!, atB = assessRiskAtScale(basis, b)!;
    let lower = a, upper = b;
    for (const key of keys) {
      const slope = (atB[key] - atA[key]) / (b - a);
      if (Math.abs(slope) < 1e-12) { if (atA[key] > limits[key] + 1e-7) upper = -1; }
      else {
        const crossing = a + (limits[key] - atA[key]) / slope;
        if (slope > 0) upper = Math.min(upper, crossing);
        else lower = Math.max(lower, crossing);
      }
    }
    if (lower <= upper + 1e-12 && upper >= a && lower <= b) {
      const units = Math.max(Math.abs(basis.proposed.brentBarrels), Math.abs(basis.proposed.wtiBarrels));
      const scale = Math.min(1, Math.floor(Math.max(0, upper) * units + 1e-9) / units);
      if (scale >= lower - 1e-12 && fits(assessRiskAtScale(basis, scale)!)) maximumScale = Math.max(maximumScale, scale);
    }
  }
  if (maximumScale <= 0) return make(0, currentIsFlat ? "reject" : "exit", ["No nonzero whole-barrel size fits the supplied risk and notional bounds"]);
  const failures = keys.filter(key => full[key] > limits[key] + 1e-7);
  const labels = { tailLossWithCostsUsd: "tail loss allowance", stressLossWithCostsUsd: "stress loss allowance", grossNotionalUsd: "gross notional limit" };
  return make(maximumScale, maximumScale < 1 ? "resize" : "accept", maximumScale < 1
    ? [`Resize to satisfy ${failures.map(key => labels[key]).join(", ") || "whole-barrel sizing"}`]
    : ["Proposed size fits prior-evidence risk and supplied bounds"]);
}
