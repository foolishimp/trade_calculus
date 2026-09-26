import { brierScore, conditionBelief, projectOrder } from "../src/epistemic.ts";
import type { Belief, Order, OrderReport } from "../src/epistemic.ts";
import { compareCandidates } from "../src/decision.ts";
import { assessOilTrade } from "../src/risk.ts";
import { assessLossTolerance } from "../src/overlays/loss_tolerance.ts";
import { context, makeTrade, scenarios, strategy } from "./oil_fixture.ts";

/** Reusable composition consumed by both CLI and dashboard; all data is synthetic. */
export function oilAnalysis(reconciled = true) {
  const order: Order = { id: "physical-50k", quantity: 50000, unit: "bbl", reportSource: "synthetic-broker", submittedAt: "2026-09-25T23:58:00Z" };
  const report: OrderReport = { id: "physical-final", orderId: order.id, source: order.reportSource, sequence: 1,
    eventTime: "2026-09-25T23:59:00Z", receivedTime: "2026-09-25T23:59:01Z", cumulativeFilled: 50000, final: true };
  const knowledge = projectOrder(order, reconciled ? [report] : [], context.valuationAt, context.knowledgeCutoff);
  const activeContext = { ...context, evidenceIds: [...context.evidenceIds, ...knowledge.evidenceIds] };
  const candidates = [100000, 50000, 0].map(barrels => assessOilTrade(makeTrade(barrels), scenarios, activeContext,
    barrels === 50000 ? { physicalBarrels: [knowledge.minimumFilled, knowledge.maximumFilled], shortFuturesContracts: [50, 50] } : undefined));
  const overlay = assessLossTolerance(candidates, 150000);
  const decision = compareCandidates(candidates, { decisionAt: context.valuationAt, availableMarginUsd: 750000,
    executionKnowledge: knowledge.status === "final" ? "resolved" : knowledge.status === "conflicted" ? "conflicted" : "unresolved" }, [overlay]);
  const prior: Belief = { modelId: "synthetic-basis-belief@1", hypotheses: scenarios.map(s => ({ id: s.id, probability: s.probability })), appliedEvidence: [] };
  const posterior = conditionBelief(prior, { id: "invented-inventory-report@1", modelId: prior.modelId, likelihoods: [0.8, 0.4, 0.1] });
  return { label: "Synthetic oil basis experiment", strategy, knowledge, candidates, overlay, decision, prior, posterior,
    feedback: { assumedObservedScenario: "strengthen", originalForecastBrierScore: brierScore(prior.hypotheses, "strengthen"),
      halfSizePnl: candidates.find(c => c.candidateId === "basis-50000")!.scenarioOutcomes[0] },
    boundary: "Candidate comparison uses an empty starting book. The fill experiment illustrates execution knowledge separately; it is not permission to add a second package to an existing holding." };
}
