import test from "node:test";
import assert from "node:assert/strict";
import { addQuantities, barrelsToGallons, multiplyUsd, quantity } from "../src/quantities.ts";
import type { Quantity } from "../src/quantities.ts";
import { missingCapabilities, underlyingFamilies } from "../src/families.ts";
import { brierScore, conditionBelief, projectOrder } from "../src/epistemic.ts";
import type { Belief, Order, OrderReport } from "../src/epistemic.ts";
import { futuresSettlement, valueOilTrade } from "../src/oil.ts";
import { assessOilTrade, summarizeDistribution } from "../src/risk.ts";
import { compareCandidates } from "../src/decision.ts";
import { assessLossTolerance } from "../src/overlays/loss_tolerance.ts";
import { context, makeTrade, scenarios, strategy } from "../examples/oil_fixture.ts";
import { oilAnalysis } from "../examples/oil_analysis.ts";

const near = (actual: number, expected: number, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const order: Order = { id: "O1", quantity: 100, unit: "share", reportSource: "broker", submittedAt: "2026-09-25T10:00:00Z" };
const report: OrderReport = { id: "R1", orderId: "O1", source: "broker", sequence: 1, eventTime: "2026-09-25T10:01:00Z", receivedTime: "2026-09-25T10:02:00Z", cumulativeFilled: 60, final: false };
const time = "2026-09-25T10:10:00Z";
const finalReport: OrderReport = { ...report, id: "R2", sequence: 2, final: true, eventTime: "2026-09-25T10:03:00Z", receivedTime: "2026-09-25T10:04:00Z" };

test("S-01: underlying taxonomy never grants storage to a futures holding", () => {
  assert.equal(Object.keys(underlyingFamilies).length, 7);
  assert.deepEqual(missingCapabilities(strategy, { underlyingId: "Brent", underlyingFamily: "energy",
    instrumentId: "B-2027-01", instrumentFamily: "future", availableCapabilities: ["benchmark-hedging"], resourceEvidenceIds: [] }), ["storage", "financing"]);
});
test("S-02: unit operations require conversion and permit negative prices", () => {
  assert.equal(barrelsToGallons(quantity(1000, "bbl")).value, 42000);
  assert.equal(addQuantities(quantity(2, "bbl"), quantity(3, "bbl")).value, 5);
  const forged = quantity(42, "US-gallon") as unknown as Quantity<"bbl">;
  assert.throws(() => addQuantities(quantity(1, "bbl"), forged), /Incompatible units/);
  assert.equal(multiplyUsd(quantity(1000, "bbl"), { value: -37, currency: "USD", per: "bbl" }).value, -37000);
  assert.throws(() => quantity(NaN, "bbl"), /finite/);
  assert.throws(() => valueOilTrade(makeTrade(1500), scenarios[0]!), /whole/);
});
test("S-03: timeout and partial fill preserve consequential possible exposure", () => {
  const unknown = projectOrder(order, [], time, time);
  const partial = projectOrder(order, [report], time, time);
  assert.equal(unknown.minimumFilled, 0);
  assert.equal(unknown.maximumFilled + 80, 180);
  assert.equal(partial.minimumFilled, 60);
  assert.equal(partial.maximumFilled + 80, 180);
});
test("S-04: late final evidence corrects current knowledge while the prior cut stays reproducible", () => {
  const history = [finalReport, report]; // Delivery ordering does not decide the domain sequence.
  const before = projectOrder(order, history, time, "2026-09-25T10:02:30Z");
  const after = projectOrder(order, history, time, time);
  assert.equal(before.maximumFilled, 100);
  assert.equal(after.maximumFilled + 80, 140);
  assert.equal(after.status, "final");
  assert.deepEqual(projectOrder(order, [...history, { ...report, receivedTime: time }], time, time), after);
});
test("S-04: source, identity and finalized-quantity conflicts widen bounds rather than inventing certainty", () => {
  for (const conflict of [
    { ...report, cumulativeFilled: 30 },
    { ...report, id: "other-source", source: "unknown" },
    { ...finalReport, id: "R3", sequence: 3, cumulativeFilled: 70 },
    { ...finalReport, id: "R3", sequence: 3, final: false },
  ]) {
    const knowledge = projectOrder(order, [report, finalReport, conflict], time, time);
    assert.equal(knowledge.status, "conflicted");
    assert.equal(knowledge.minimumFilled, 0);
    assert.equal(knowledge.maximumFilled, 100);
  }
});
const prior: Belief = { modelId: "M1", hypotheses: [{ id: "fill", probability: 0.2 }, { id: "no-fill", probability: 0.8 }], appliedEvidence: [] };
test("S-05: Bayesian evidence changes belief, is idempotent and does not establish an execution fact", () => {
  const evidence = { id: "E1", modelId: "M1", likelihoods: [0.9, 0.1] };
  const posterior = conditionBelief(prior, evidence);
  near(posterior.hypotheses[0]!.probability, 9 / 13);
  assert.deepEqual(conditionBelief(posterior, evidence), posterior);
  assert.equal(projectOrder(order, [], time, time).maximumFilled, 100);
  assert.deepEqual(prior.hypotheses.map(h => h.probability), [0.2, 0.8]);
  assert.throws(() => conditionBelief(posterior, { ...evidence, likelihoods: [0.8, 0.1] }), /Conflicting replay/);
});
test("S-05: incompatible models and impossible evidence are explicit failures", () => {
  assert.throws(() => conditionBelief(prior, { id: "E", modelId: "M1", likelihoods: [0, 0] }), /zero support/);
  assert.throws(() => conditionBelief(prior, { id: "E", modelId: "M2", likelihoods: [1, 1] }), /model/);
  assert.throws(() => conditionBelief(prior, { id: "E", modelId: "M1", likelihoods: [NaN, 1] }), /finite/);
  assert.throws(() => conditionBelief({ ...prior, hypotheses: [{ id: "bad", probability: 0.9 }] }, { id: "E", modelId: "M1", likelihoods: [1] }), /sum to one/);
});
test("S-06: completed oil economics reproduce the independent worked calculation", () => {
  const half = assessOilTrade(makeTrade(50000), scenarios, context);
  assert.equal(half.completed.expectedPnlUsd, 20000);
  assert.equal(half.worstRepresentedLossUsd, 130000);
  assert.equal(half.peakVariationMarginUsd, 500000);
  const outcome = half.scenarioOutcomes[0]!;
  assert.equal(outcome.physicalPnlUsd, -200000);
  assert.equal(outcome.futuresPnlUsd, 300000);
  assert.equal(outcome.costsPnlUsd, -30000);
  assert.equal(outcome.netPnlUsd, 70000);
  assert.equal(outcome.settlementCashflowsUsd.reduce((a, b) => a + b, 0), outcome.futuresPnlUsd);
});
test("S-07: profitable closing hedge still needs cash during the path", () => {
  const settled = futuresSettlement(-100, 1000, 80, [90, 74]);
  assert.equal(settled.totalCashUsd, 600000);
  assert.equal(settled.peakReserveUsd, 1000000);
  assert.deepEqual(settled.cashflowsUsd, [-1000000, 1600000]);
  // Earlier settlement receipts fund later calls; summing all debits overstates reserve.
  assert.equal(futuresSettlement(-1, 1000, 80, [70, 85, 75, 90]).peakReserveUsd, 10000);
});
test("S-07: discrete expected shortfall uses fractional tail mass", () => {
  const summary = summarizeDistribution([{ probability: 0.9, pnlUsd: 100 }, { probability: 0.08, pnlUsd: -10 }, { probability: 0.02, pnlUsd: -100 }], 0.95);
  near(summary.expectedShortfallUsd, 46); // (0.02*100 + 0.03*10)/0.05
  assert.equal(summarizeDistribution([{ probability: 1, pnlUsd: 100 }]).expectedShortfallUsd, -100);
  assert.throws(() => summarizeDistribution([{ probability: 1, pnlUsd: 0 }], 1), /alpha/);
});
test("S-08: unresolved physical execution materially widens loss and changes decision", () => {
  const unresolved = oilAnalysis(false), resolved = oilAnalysis(true);
  assert.equal(unresolved.candidates[1]!.worstRepresentedLossUsd, 530000);
  assert.equal(resolved.candidates[1]!.worstRepresentedLossUsd, 130000);
  assert.equal(unresolved.decision.action, "seek-evidence");
  assert.equal(resolved.decision.candidateId, "basis-50000");
});
test("S-09: resources, expiry and no-trade each cause a meaningful decision branch", () => {
  const candidates = [100000, 50000, 0].map(q => assessOilTrade(makeTrade(q), scenarios, context));
  const inputs = { decisionAt: context.valuationAt, availableMarginUsd: 750000, executionKnowledge: "resolved" as const };
  assert.equal(compareCandidates(candidates, inputs).candidateId, "basis-50000");
  assert.equal(compareCandidates(candidates, { ...inputs, availableMarginUsd: 0 }).action, "no-trade");
  assert.equal(compareCandidates(candidates, { ...inputs, decisionAt: "2026-09-27T00:00:00Z" }).action, "defer");
  const losing = [50000, 0].map(q => assessOilTrade(makeTrade(q), [{ ...scenarios[2]!, probability: 1 }], context));
  assert.equal(compareCandidates(losing, inputs).action, "no-trade");
  assert.throws(() => compareCandidates(candidates.slice(0, 2), inputs), /baseline/);
  assert.throws(() => compareCandidates([candidates[0]!, { ...candidates[2]!, context: { ...context, marketSnapshotId: "other" } }], inputs), /different analysis/);
});
test("S-10: a separate policy changes eligibility while preserving economic results", () => {
  const candidates = [50000, 0].map(q => assessOilTrade(makeTrade(q), scenarios, context));
  const before = JSON.stringify(candidates);
  const inputs = { decisionAt: context.valuationAt, availableMarginUsd: 750000, executionKnowledge: "resolved" as const };
  assert.equal(compareCandidates(candidates, inputs).candidateId, "basis-50000");
  assert.equal(compareCandidates(candidates, inputs, [assessLossTolerance(candidates, 100000)]).action, "no-trade");
  assert.equal(JSON.stringify(candidates), before);
  assert.throws(() => compareCandidates(candidates, inputs, [{ overlayId: "incomplete", results: [] }]), /every candidate/);
});
test("S-11: forecast evaluation refers to the original probabilities", () => {
  near(brierScore(scenarios.map(s => ({ id: s.id, probability: s.probability })), "strengthen"), 0.26);
  assert.throws(() => brierScore(prior.hypotheses, "unmodelled"), /outside/);
});
