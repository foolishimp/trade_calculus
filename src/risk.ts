import { completeExecution, valueOilTrade, validateTrade } from "./oil.ts";
import type { ExecutionState, OilOutcome, OilScenario, OilTrade } from "./oil.ts";
import { distribution, finite, identifier, instant, nonnegative, unique, whole } from "./validation.ts";

export interface AnalysisContext {
  readonly valuationAt: string;
  readonly knowledgeCutoff: string;
  readonly horizonAt: string;
  readonly validUntil: string;
  readonly modelId: string;
  readonly marketSnapshotId: string;
  readonly bookId: string;
  readonly evidenceIds: readonly string[];
  readonly assumptions: readonly string[];
}
export interface ExecutionBounds {
  readonly physicalBarrels: readonly [number, number];
  readonly shortFuturesContracts: readonly [number, number];
}
export interface WeightedPnl {
  readonly probability: number;
  readonly pnlUsd: number;
}
export interface DistributionSummary {
  readonly expectedPnlUsd: number;
  readonly worstRepresentedLossUsd: number;
  readonly expectedShortfallUsd: number;
  readonly alpha: number;
}
export interface OilAssessment {
  readonly candidateId: string;
  readonly action: "trade" | "no-trade";
  readonly strategyId: string;
  readonly context: AnalysisContext;
  readonly completed: DistributionSummary;
  readonly scenarioOutcomes: readonly OilOutcome[];
  readonly executionStates: readonly ExecutionState[];
  readonly executionExpectedPnlRangeUsd: readonly [number, number];
  readonly worstRepresentedLossUsd: number;
  readonly worstConditionalExpectedShortfallUsd: number;
  readonly peakVariationMarginUsd: number;
  readonly conditions: readonly string[];
}

export function validateContext(context: AnalysisContext): void {
  const valuation = instant(context.valuationAt);
  instant(context.knowledgeCutoff);
  if (instant(context.horizonAt) < valuation || instant(context.validUntil) < valuation) {
    throw new Error("Horizon and validity must not precede valuation");
  }
  for (const id of [context.modelId, context.marketSnapshotId, context.bookId]) identifier(id, "context id");
  unique(context.evidenceIds, "context evidence ids");
}

/** REQ-06: integrate the upper loss tail, including fractional boundary mass. */
export function summarizeDistribution(outcomes: readonly WeightedPnl[], alpha = 0.95): DistributionSummary {
  distribution(outcomes.map(outcome => outcome.probability));
  if (finite(alpha, "ES alpha") < 0 || alpha >= 1) throw new Error("ES alpha must be in [0,1)");
  outcomes.forEach(outcome => finite(outcome.pnlUsd, "P&L"));
  let remaining = 1 - alpha;
  let tailLoss = 0;
  for (const outcome of [...outcomes].sort((a, b) => a.pnlUsd - b.pnlUsd)) {
    const mass = Math.min(remaining, outcome.probability);
    tailLoss += mass * -outcome.pnlUsd;
    remaining -= mass;
    if (remaining <= 0) break;
  }
  return {
    expectedPnlUsd: finite(outcomes.reduce((sum, o) => sum + o.probability * o.pnlUsd, 0), "expected P&L"),
    worstRepresentedLossUsd: Math.max(0, ...outcomes.map(o => -o.pnlUsd)),
    expectedShortfallUsd: finite(tailLoss / (1 - alpha), "expected shortfall"), alpha,
  };
}

export function executionCorners(trade: OilTrade, bounds: ExecutionBounds): ExecutionState[] {
  const [pMin, pMax] = bounds.physicalBarrels;
  const [fMin, fMax] = bounds.shortFuturesContracts;
  nonnegative(pMin, "minimum barrels"); nonnegative(pMax, "maximum barrels");
  whole(fMin, "minimum contracts"); whole(fMax, "maximum contracts");
  if (pMin > pMax || fMin > fMax || pMax > trade.physical.value || fMax > trade.shortFutures.value) {
    throw new Error("Execution bounds exceed or contradict package quantities");
  }
  const states = new Map<string, ExecutionState>();
  for (const physicalBarrels of [pMin, pMax]) {
    for (const shortFuturesContracts of [fMin, fMax]) {
      const state = { physicalBarrels, shortFuturesContracts };
      states.set(JSON.stringify(state), state);
    }
  }
  return [...states.values()];
}

export function assessOilTrade(
  trade: OilTrade, scenarios: readonly OilScenario[], context: AnalysisContext,
  bounds?: ExecutionBounds, alpha = 0.95,
): OilAssessment {
  validateTrade(trade); validateContext(context);
  unique(scenarios.map(s => s.id), "scenario ids");
  distribution(scenarios.map(s => s.probability));
  const scenarioOutcomes = scenarios.map(scenario => valueOilTrade(trade, scenario));
  const summarize = (values: readonly OilOutcome[]) => summarizeDistribution(values.map(o => ({ probability: o.probability, pnlUsd: o.netPnlUsd })), alpha);
  const completed = summarize(scenarioOutcomes);
  const executionStates = bounds ? executionCorners(trade, bounds) : [completeExecution(trade)];
  const stateOutcomes = executionStates.map(state => scenarios.map(scenario => valueOilTrade(trade, scenario, state)));
  const stateSummaries = stateOutcomes.map(summarize);
  return {
    candidateId: trade.id, action: trade.action, strategyId: trade.strategyId, context,
    completed, scenarioOutcomes, executionStates,
    executionExpectedPnlRangeUsd: [Math.min(...stateSummaries.map(s => s.expectedPnlUsd)), Math.max(...stateSummaries.map(s => s.expectedPnlUsd))],
    worstRepresentedLossUsd: Math.max(completed.worstRepresentedLossUsd, ...stateSummaries.map(s => s.worstRepresentedLossUsd)),
    worstConditionalExpectedShortfallUsd: Math.max(completed.expectedShortfallUsd, ...stateSummaries.map(s => s.expectedShortfallUsd)),
    peakVariationMarginUsd: Math.max(...scenarioOutcomes.map(o => o.peakVariationMarginUsd), ...stateOutcomes.flat().map(o => o.peakVariationMarginUsd)),
    conditions: [
      "Completed expectation assumes both specified legs are established.",
      "Initial book is empty; inventory financing and initial margin are provided separately.",
      "Only supplied scenarios and execution bounds are assessed; physical capacity is assumed available.",
      "Full declared package cost is retained in every partial execution state.",
    ],
  };
}
