import type { OilObservation } from "./rates.ts";
import type { PriceExposure } from "./historical_risk.ts";
import type { ReplayRiskPolicy } from "./overlays/replay_policy.ts";
import { calculateStrategy } from "./hedging.ts";
import type { RecursiveStrategyResult } from "./hedging.ts";
import { forecastPortfolio } from "./strategy_model.ts";
import type { HomeostaticState, PayoffMarket, PortfolioForecast, Positions } from "./strategy_model.ts";
import { finite, nonnegative, whole } from "./validation.ts";

export interface HedgingConfig {
  readonly mode: "off" | "adaptive";
  readonly riskAversion: number;
  readonly maxDepth: number;
  readonly minimumExpectedNetPnlUsd: number;
  readonly minimumPrimaryScale: number;
}
export const defaultHedgingConfig: HedgingConfig = Object.freeze({ mode: "off", riskAversion: 0.1, maxDepth: 2, minimumExpectedNetPnlUsd: 0, minimumPrimaryScale: 0 });
export interface OilStrategyAnalysis {
  readonly status: "off" | "await-evidence" | "planned";
  readonly composedExposure: PriceExposure;
  readonly plan: RecursiveStrategyResult | null;
  readonly selectedForecast: PortfolioForecast | null;
  readonly selectedState: HomeostaticState | null;
}
export const oilPositions = (q: PriceExposure): Positions => ({ brent: q.brentBarrels, wti: q.wtiBarrels });
export function validateHedgingConfig(config: HedgingConfig): void {
  if (!["off", "adaptive"].includes(config.mode)) throw new Error("Unknown strategy control mode");
  nonnegative(config.riskAversion, "risk aversion");
  if (whole(config.maxDepth, "hedge depth") > 6) throw new Error("Hedge depth must be at most six");
  finite(config.minimumExpectedNetPnlUsd, "minimum expected P&L");
  if (nonnegative(config.minimumPrimaryScale, "minimum primary scale") > 1) throw new Error("Minimum primary scale must be at most one");
}

export function prepareOilStrategy(history: readonly OilObservation[], proposal: PriceExposure, actual: PriceExposure,
  config: { readonly riskLookback: number; readonly quantityBarrels: number; readonly costPerBarrelUsd: number; readonly fundingAnnualRate: number },
  priorNavUsd: number, policy: ReplayRiskPolicy, hedging: HedgingConfig, tailAllowanceMultiplier: number,
): { readonly market: PayoffMarket | null; readonly analysis: OilStrategyAnalysis } {
  validateHedgingConfig(hedging);
  const base = { composedExposure: { brentBarrels: proposal.brentBarrels, wtiBarrels: proposal.wtiBarrels }, plan: null, selectedForecast: null, selectedState: null };
  if (history.length <= config.riskLookback) return { market: null, analysis: { ...base, status: hedging.mode === "off" ? "off" : "await-evidence" } };
  const window = history.slice(-(config.riskLookback + 1)), last = window.at(-1)!;
  const market: PayoffMarket = {
    modelId: "oil-joint-history-expectation@1", evidenceThrough: last.date, currency: "USD", horizon: "next paired observation",
    fundingAnnualRate: config.fundingAnnualRate, tailAllowanceMultiplier,
    instruments: ["brent", "wti"].map(id => ({ id, domain: "energy-spot-proxy", unit: "bbl", notionalUsdPerUnit: Math.abs(last[id as "brent" | "wti"]),
      costUsdPerUnit: config.costPerBarrelUsd, quantityStep: 1, maxHedgeQuantity: config.quantityBarrels * 2 })),
    samples: window.slice(1).map((row, i) => ({ date: row.date, payoffUsdPerUnit: [row.brent - window[i]!.brent, row.wti - window[i]!.wti] })),
    stresses: [{ id: "parallel-fall", payoffUsdPerUnit: [-10, -10] }, { id: "parallel-rise", payoffUsdPerUnit: [10, 10] },
      { id: "basis-widens", payoffUsdPerUnit: [5, 0] }, { id: "basis-narrows", payoffUsdPerUnit: [-5, 0] }],
  };
  if (hedging.mode === "off") return { market, analysis: { ...base, status: "off" } };
  const capital = Math.max(0, priorNavUsd);
  const plan = calculateStrategy(oilPositions(proposal), market, oilPositions(actual), priorNavUsd, {
    candidateInstrumentIds: ["wti"], maxDepth: hedging.maxDepth, minimumPrimaryScale: hedging.minimumPrimaryScale,
    reference: {
      minimumExpectedNetPnlUsd: hedging.minimumExpectedNetPnlUsd,
      maximumTailLossUsd: Math.min(policy.maxExpectedShortfallUsd, capital),
      maximumStressLossUsd: Math.min(policy.maxStressLossUsd, capital),
      maximumGrossNotionalUsd: Math.min(policy.maxGrossNotionalUsd, capital),
      returnScaleUsd: Math.max(1, policy.maxExpectedShortfallUsd), tailScaleUsd: Math.max(1, policy.maxExpectedShortfallUsd),
      stressScaleUsd: Math.max(1, policy.maxStressLossUsd), notionalScaleUsd: Math.max(1, policy.maxGrossNotionalUsd),
      riskAversion: hedging.riskAversion,
    },
  });
  return { market, analysis: { status: "planned", composedExposure: { brentBarrels: plan.positions.brent ?? 0, wtiBarrels: plan.positions.wti ?? 0 }, plan, selectedForecast: null, selectedState: null } };
}

export function selectedOilForecast(market: PayoffMarket | null, selected: PriceExposure, actual: PriceExposure, priorNavUsd: number): PortfolioForecast | null {
  return market ? forecastPortfolio(market, oilPositions(selected), oilPositions(actual), priorNavUsd) : null;
}
