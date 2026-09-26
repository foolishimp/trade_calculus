import { historicalPriceRisk, priceStresses } from "./historical_risk.ts";
import type { HistoricalPriceRisk, PriceExposure } from "./historical_risk.ts";
import { day } from "./rates.ts";
import type { OilObservation } from "./rates.ts";
import { finite, nonnegative } from "./validation.ts";

export interface CompletedRiskOutcome { readonly date: string; readonly breached: boolean }
export interface CalibrationAllowance {
  readonly assessedMoves: number;
  readonly breaches: number;
  readonly multiplier: number;
  readonly status: "insufficient-assessments" | "observed-feedback";
  readonly rule: "max(1, observed breach frequency / 0.05), capped at 3; minimum 20 assessments";
}
export interface PretradeRiskBasis {
  readonly modelId: "joint-history-with-stress-and-costs@1";
  readonly evidenceThrough: string | null;
  readonly observedRows: number;
  readonly requiredRows: number;
  readonly proposed: PriceExposure;
  readonly current: PriceExposure;
  readonly priceRisk: HistoricalPriceRisk | null;
  readonly stressLossAtFullSizeUsd: number;
  readonly grossNotionalAtFullSizeUsd: number;
  readonly costPerBarrelUsd: number;
  readonly fundingAnnualRate: number;
  readonly fundingBufferDays: 3;
  readonly calibration: CalibrationAllowance;
}
export interface PretradeAssessment {
  readonly scale: number;
  readonly exposure: PriceExposure;
  readonly priceExpectedShortfallUsd: number;
  readonly conservativeExpectedShortfallUsd: number;
  readonly stressLossUsd: number;
  readonly grossNotionalUsd: number;
  readonly transactionCostUsd: number;
  readonly fundingAllowanceUsd: number;
  readonly tailLossWithCostsUsd: number;
  readonly stressLossWithCostsUsd: number;
}

/** REQ-17: completed observations only. This multiplier is an explicit heuristic. */
export function calibrationAllowance(outcomes: readonly CompletedRiskOutcome[], cutoff: string | null): CalibrationAllowance {
  let previous = -Infinity;
  for (const outcome of outcomes) {
    const time = day(outcome.date);
    if (cutoff === null || time > day(cutoff)) throw new Error("Risk feedback exceeds the evidence cutoff");
    if (time <= previous) throw new Error("Risk feedback must have unique increasing dates");
    previous = time;
  }
  const breaches = outcomes.filter(outcome => outcome.breached).length;
  return {
    assessedMoves: outcomes.length, breaches,
    multiplier: outcomes.length < 20 ? 1 : Math.min(3, Math.max(1, breaches / outcomes.length / 0.05)),
    status: outcomes.length < 20 ? "insufficient-assessments" : "observed-feedback",
    rule: "max(1, observed breach frequency / 0.05), capped at 3; minimum 20 assessments",
  };
}

/** There is deliberately no execution price, future path or future NAV argument. */
export function preparePretradeRisk(
  history: readonly OilObservation[], current: PriceExposure, proposed: PriceExposure,
  riskLookback: number, completedOutcomes: readonly CompletedRiskOutcome[],
  costs: { readonly costPerBarrelUsd: number; readonly fundingAnnualRate: number },
): PretradeRiskBasis {
  for (const value of [current.brentBarrels, current.wtiBarrels, proposed.brentBarrels, proposed.wtiBarrels]) finite(value, "exposure");
  nonnegative(costs.costPerBarrelUsd, "transaction cost"); nonnegative(costs.fundingAnnualRate, "funding rate");
  const last = history.at(-1);
  const cutoff = last?.date ?? null;
  return {
    modelId: "joint-history-with-stress-and-costs@1", evidenceThrough: cutoff,
    observedRows: history.length, requiredRows: riskLookback + 1,
    proposed: { brentBarrels: proposed.brentBarrels, wtiBarrels: proposed.wtiBarrels },
    current: { brentBarrels: current.brentBarrels, wtiBarrels: current.wtiBarrels },
    priceRisk: historicalPriceRisk(history, proposed, riskLookback),
    stressLossAtFullSizeUsd: Math.max(0, ...priceStresses(proposed).map(shock => -shock.pnlUsd)),
    grossNotionalAtFullSizeUsd: last ? finite(Math.abs(proposed.brentBarrels * last.brent) + Math.abs(proposed.wtiBarrels * last.wti), "gross notional") : 0,
    costPerBarrelUsd: costs.costPerBarrelUsd, fundingAnnualRate: costs.fundingAnnualRate,
    fundingBufferDays: 3, calibration: calibrationAllowance(completedOutcomes, cutoff),
  };
}

/** Linear price risk on a proposal ray; rebalancing cost retains existing holdings. */
export function assessRiskAtScale(basis: PretradeRiskBasis, scale: number): PretradeAssessment | null {
  if (nonnegative(scale, "scale") > 1) throw new Error("Scale exceeds the proposal");
  if (!basis.priceRisk) return null;
  const exposure = { brentBarrels: scale * basis.proposed.brentBarrels, wtiBarrels: scale * basis.proposed.wtiBarrels };
  const transactionCostUsd = finite((Math.abs(exposure.brentBarrels - basis.current.brentBarrels) +
    Math.abs(exposure.wtiBarrels - basis.current.wtiBarrels)) * basis.costPerBarrelUsd, "transaction cost");
  const grossNotionalUsd = basis.grossNotionalAtFullSizeUsd * scale;
  const fundingAllowanceUsd = finite(grossNotionalUsd * basis.fundingAnnualRate * basis.fundingBufferDays / 365, "funding allowance");
  const priceExpectedShortfallUsd = basis.priceRisk.expectedShortfallUsd * scale;
  const conservativeExpectedShortfallUsd = Math.max(0, priceExpectedShortfallUsd) * basis.calibration.multiplier;
  const stressLossUsd = basis.stressLossAtFullSizeUsd * scale;
  return {
    scale, exposure, priceExpectedShortfallUsd, conservativeExpectedShortfallUsd, stressLossUsd,
    grossNotionalUsd, transactionCostUsd, fundingAllowanceUsd,
    tailLossWithCostsUsd: finite(conservativeExpectedShortfallUsd + transactionCostUsd + fundingAllowanceUsd, "tail loss allowance"),
    stressLossWithCostsUsd: finite(stressLossUsd + transactionCostUsd + fundingAllowanceUsd, "stress loss allowance"),
  };
}
