import { day } from "./rates.ts";
import { summarizeDistribution } from "./risk.ts";
import { finite, identifier, nonnegative, unique } from "./validation.ts";

export type Positions = Readonly<Record<string, number>>;
export interface StrategyNode {
  readonly id: string;
  readonly role: "primary" | "hedge" | "resize";
  readonly direct: Positions;
  readonly children: readonly StrategyNode[];
}
export interface ScenarioInstrument {
  readonly id: string; readonly domain: string; readonly unit: string;
  readonly notionalUsdPerUnit: number; readonly costUsdPerUnit: number;
  readonly quantityStep: number; readonly maxHedgeQuantity: number;
}
export interface PayoffMarket {
  readonly modelId: string; readonly evidenceThrough: string; readonly currency: "USD";
  readonly horizon: "next paired observation";
  readonly instruments: readonly ScenarioInstrument[];
  readonly samples: readonly { readonly date: string; readonly payoffUsdPerUnit: readonly number[] }[];
  readonly stresses: readonly { readonly id: string; readonly payoffUsdPerUnit: readonly number[] }[];
  readonly fundingAnnualRate: number;
  readonly tailAllowanceMultiplier?: number;
}
export interface PortfolioForecast {
  readonly evidenceThrough: string; readonly samples: number; readonly modelId: string;
  readonly expectedGrossPnlUsd: number; readonly expectedNetPnlUsd: number;
  readonly expectedReturnOnPriorNav: number | null;
  readonly varianceUsdSquared: number; readonly standardDeviationUsd: number;
  readonly priceExpectedShortfallUsd: number; readonly tailLossWithCostsUsd: number;
  readonly stressLossWithCostsUsd: number; readonly grossNotionalUsd: number;
  readonly transactionCostUsd: number; readonly fundingAllowanceUsd: number;
}
export interface HomeostaticReference {
  readonly minimumExpectedNetPnlUsd: number;
  readonly maximumTailLossUsd: number; readonly maximumStressLossUsd: number;
  readonly maximumGrossNotionalUsd: number;
  readonly returnScaleUsd: number; readonly tailScaleUsd: number;
  readonly stressScaleUsd: number; readonly notionalScaleUsd: number;
  readonly riskAversion: number;
}
export interface HomeostaticState {
  readonly deviation: number;
  readonly components: { readonly returnShortfall: number; readonly tailExcess: number; readonly stressExcess: number; readonly notionalExcess: number };
  readonly preferenceUsd: number;
}
export interface StrategyGain {
  readonly expectedNetGainUsd: number; readonly tailRiskReductionUsd: number;
  readonly varianceReductionUsdSquared: number; readonly notionalChangeUsd: number;
  readonly costChangeUsd: number; readonly deviationReduction: number;
  readonly decisionGainUsd: number;
}

/** REQ-20: economic netting preserves each node's direct quantities exactly once. */
export function aggregateStrategy(root: StrategyNode): Positions {
  const ids = new Set<string>(), active = new Set<StrategyNode>(), positions: Record<string, number> = {};
  const visit = (node: StrategyNode, depth: number) => {
    if (depth > 32 || active.has(node)) throw new Error("Cyclic or excessive-depth strategy tree");
    identifier(node.id, "strategy id");
    if (ids.has(node.id)) throw new Error("Duplicate strategy node identity");
    ids.add(node.id); active.add(node);
    for (const [id, quantity] of Object.entries(node.direct)) {
      identifier(id, "instrument id"); finite(quantity, "quantity");
      positions[id] = finite((positions[id] ?? 0) + quantity, "aggregate quantity");
    }
    node.children.forEach(child => visit(child, depth + 1));
    active.delete(node);
  };
  visit(root, 0);
  return positions;
}

export function validatePayoffMarket(market: PayoffMarket): void {
  identifier(market.modelId, "model id");
  if (market.currency !== "USD" || market.horizon !== "next paired observation") throw new Error("Unsupported valuation currency or horizon");
  const cutoff = day(market.evidenceThrough);
  unique(market.instruments.map(i => i.id), "instrument ids");
  if (!market.instruments.length || market.samples.length < 2) throw new Error("At least two aligned historical payoff samples are required");
  nonnegative(market.fundingAnnualRate, "funding rate");
  if (nonnegative(market.tailAllowanceMultiplier ?? 1, "tail allowance multiplier") < 1) throw new Error("Tail allowance multiplier must be at least one");
  for (const instrument of market.instruments) {
    identifier(instrument.domain, "domain"); identifier(instrument.unit, "unit");
    nonnegative(instrument.notionalUsdPerUnit, "unit notional"); nonnegative(instrument.costUsdPerUnit, "unit cost");
    nonnegative(instrument.maxHedgeQuantity, "hedge quantity bound");
    if (finite(instrument.quantityStep, "quantity step") <= 0) throw new Error("Quantity step must be positive");
  }
  let previous = -Infinity;
  for (const sample of market.samples) {
    const time = day(sample.date);
    if (time > cutoff || time <= previous) throw new Error("Historical payoff dates must be increasing and within the evidence cutoff");
    previous = time;
  }
  unique(market.stresses.map(s => s.id), "stress ids");
  for (const scenario of [...market.samples, ...market.stresses]) {
    if (scenario.payoffUsdPerUnit.length !== market.instruments.length) throw new Error("Payoff vectors must align with the instrument basis");
    scenario.payoffUsdPerUnit.forEach(v => finite(v, "scenario payoff"));
  }
}

export function portfolioPayoffs(market: PayoffMarket, positions: Positions): number[] {
  const ids = new Set(market.instruments.map(i => i.id));
  for (const [id, q] of Object.entries(positions)) {
    if (!ids.has(id)) throw new Error(`Unknown payoff instrument: ${id}`);
    finite(q, "quantity");
  }
  return market.samples.map(s => finite(market.instruments.reduce((sum, i, k) => sum + (positions[i.id] ?? 0) * s.payoffUsdPerUnit[k]!, 0), "portfolio payoff"));
}

/** REQ-19: historical mean is a model estimate, in a common currency and horizon. */
export function forecastPortfolio(market: PayoffMarket, positions: Positions, actual: Positions, priorNavUsd: number): PortfolioForecast {
  validatePayoffMarket(market); finite(priorNavUsd, "prior NAV");
  portfolioPayoffs(market, actual);
  const payoffs = portfolioPayoffs(market, positions);
  const distribution = summarizeDistribution(payoffs.map(pnlUsd => ({ pnlUsd, probability: 1 / payoffs.length })));
  const variance = finite(payoffs.reduce((sum, p) => sum + (p - distribution.expectedPnlUsd) ** 2, 0) / payoffs.length, "variance");
  const notional = finite(market.instruments.reduce((sum, i) => sum + Math.abs(positions[i.id] ?? 0) * i.notionalUsdPerUnit, 0), "notional");
  const transaction = finite(market.instruments.reduce((sum, i) => sum + Math.abs((positions[i.id] ?? 0) - (actual[i.id] ?? 0)) * i.costUsdPerUnit, 0), "transaction cost");
  const funding = finite(notional * market.fundingAnnualRate * 3 / 365, "funding allowance");
  const net = finite(distribution.expectedPnlUsd - transaction - funding, "expected net P&L");
  const stressLoss = Math.max(0, ...market.stresses.map(s => -market.instruments.reduce((sum, i, k) => sum + (positions[i.id] ?? 0) * s.payoffUsdPerUnit[k]!, 0)));
  return {
    modelId: market.modelId, evidenceThrough: market.evidenceThrough, samples: payoffs.length,
    expectedGrossPnlUsd: distribution.expectedPnlUsd, expectedNetPnlUsd: net,
    expectedReturnOnPriorNav: priorNavUsd > 0 ? net / priorNavUsd : null,
    varianceUsdSquared: variance, standardDeviationUsd: Math.sqrt(variance),
    priceExpectedShortfallUsd: distribution.expectedShortfallUsd,
    tailLossWithCostsUsd: finite(Math.max(0, distribution.expectedShortfallUsd) * (market.tailAllowanceMultiplier ?? 1) + transaction + funding, "tail allowance"),
    stressLossWithCostsUsd: finite(stressLoss + transaction + funding, "stress allowance"),
    grossNotionalUsd: notional, transactionCostUsd: transaction, fundingAllowanceUsd: funding,
  };
}

export function assessHomeostasis(forecast: PortfolioForecast, reference: HomeostaticReference): HomeostaticState {
  finite(reference.minimumExpectedNetPnlUsd, "minimum expected P&L");
  for (const key of ["maximumTailLossUsd", "maximumStressLossUsd", "maximumGrossNotionalUsd", "riskAversion"] as const) nonnegative(reference[key], key);
  for (const key of ["returnScaleUsd", "tailScaleUsd", "stressScaleUsd", "notionalScaleUsd"] as const) {
    if (finite(reference[key], key) <= 0) throw new Error("Homeostatic normalization scales must be positive");
  }
  const components = {
    returnShortfall: Math.max(0, reference.minimumExpectedNetPnlUsd - forecast.expectedNetPnlUsd) / reference.returnScaleUsd,
    tailExcess: Math.max(0, forecast.tailLossWithCostsUsd - reference.maximumTailLossUsd) / reference.tailScaleUsd,
    stressExcess: Math.max(0, forecast.stressLossWithCostsUsd - reference.maximumStressLossUsd) / reference.stressScaleUsd,
    notionalExcess: Math.max(0, forecast.grossNotionalUsd - reference.maximumGrossNotionalUsd) / reference.notionalScaleUsd,
  };
  return { components, deviation: finite(Object.values(components).reduce((a, b) => a + b, 0), "reference deviation"),
    preferenceUsd: finite(forecast.expectedNetPnlUsd - reference.riskAversion * Math.max(0, forecast.priceExpectedShortfallUsd), "preference") };
}

/** REQ-23: preserve components; costs are already included in expected net gain. */
export function strategyGain(before: PortfolioForecast, after: PortfolioForecast, reference: HomeostaticReference): StrategyGain {
  if (before.modelId !== after.modelId || before.evidenceThrough !== after.evidenceThrough || before.samples !== after.samples) throw new Error("Gain comparison requires one model and evidence basis");
  const a = assessHomeostasis(before, reference), b = assessHomeostasis(after, reference);
  return {
    expectedNetGainUsd: after.expectedNetPnlUsd - before.expectedNetPnlUsd,
    tailRiskReductionUsd: Math.max(0, before.priceExpectedShortfallUsd) - Math.max(0, after.priceExpectedShortfallUsd),
    varianceReductionUsdSquared: before.varianceUsdSquared - after.varianceUsdSquared,
    notionalChangeUsd: after.grossNotionalUsd - before.grossNotionalUsd,
    costChangeUsd: after.transactionCostUsd + after.fundingAllowanceUsd - before.transactionCostUsd - before.fundingAllowanceUsd,
    deviationReduction: a.deviation - b.deviation, decisionGainUsd: b.preferenceUsd - a.preferenceUsd,
  };
}
