import test from "node:test";
import assert from "node:assert/strict";
import { aggregateStrategy, assessHomeostasis, forecastPortfolio, strategyGain } from "../src/strategy_model.ts";
import type { HomeostaticReference, PayoffMarket, StrategyNode } from "../src/strategy_model.ts";
import { calculateStrategy } from "../src/hedging.ts";
import { replay } from "../src/replay.ts";
import { defaultHedgingConfig } from "../src/oil_hedging.ts";
import { loadDataset } from "../adapters/local_data.ts";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const market: PayoffMarket = {
  modelId: "synthetic-common-usd@1", currency: "USD", horizon: "next paired observation", evidenceThrough: "2024-01-04", fundingAnnualRate: 0,
  instruments: ["oil", "freight", "fx"].map(id => ({ id, domain: id, unit: "synthetic-unit", notionalUsdPerUnit: 10, costUsdPerUnit: 0, quantityStep: 1, maxHedgeQuantity: 10 })),
  samples: [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y], i) => ({ date: `2024-01-0${i + 1}`, payoffUsdPerUnit: [2 + 10 * x! + 5 * y!, 0.2 + 10 * x!, 0.1 + 5 * y!] })),
  stresses: [{ id: "independent", payoffUsdPerUnit: [-20, 0, 0] }],
};
const reference: HomeostaticReference = { minimumExpectedNetPnlUsd: 0, maximumTailLossUsd: 1000, maximumStressLossUsd: 1000,
  maximumGrossNotionalUsd: 1000, returnScaleUsd: 100, tailScaleUsd: 100, stressScaleUsd: 100, notionalScaleUsd: 1000, riskAversion: 1 };
const control = { candidateInstrumentIds: ["freight", "fx"], maxDepth: 3, minimumPrimaryScale: 1, reference };

test("S-20: aligned historical payoffs reproduce expectation, population variance, ES, costs and return", () => {
  const forecast = forecastPortfolio(market, { oil: 1 }, {}, 1000);
  near(forecast.expectedGrossPnlUsd, 2); near(forecast.varianceUsdSquared, 125);
  near(forecast.priceExpectedShortfallUsd, 13); near(forecast.expectedReturnOnPriorNav!, 0.002);
  const expensive = forecastPortfolio({ ...market, instruments: market.instruments.map(i => ({ ...i, costUsdPerUnit: 3 })) }, { oil: 1 }, {}, 1000);
  near(expensive.expectedNetPnlUsd, -1); near(expensive.tailLossWithCostsUsd, 16);
  assert.equal(forecastPortfolio(market, {}, {}, -1).expectedReturnOnPriorNav, null);
});

test("S-20: unknown units of exposure, future samples and misaligned vectors fail", () => {
  assert.throws(() => forecastPortfolio(market, { unknown: 1 }, {}, 1000), /Unknown/);
  assert.throws(() => forecastPortfolio({ ...market, evidenceThrough: "2024-01-03" }, { oil: 1 }, {}, 1000), /cutoff/);
  assert.throws(() => forecastPortfolio({ ...market, samples: [{ date: "2024-01-01", payoffUsdPerUnit: [1] }, ...market.samples.slice(1)] }, {}, {}, 1000), /align/);
  assert.throws(() => forecastPortfolio({ ...market, samples: [...market.samples].reverse() }, {}, {}, 1000), /increasing/);
});

test("S-21: nested direct quantities count once and cycles/duplicate identities fail", () => {
  const tree: StrategyNode = { id: "root", role: "primary", direct: { oil: 10 }, children: [{ id: "a", role: "resize", direct: { oil: -3 }, children: [{ id: "b", role: "hedge", direct: { oil: 1 }, children: [] }] }] };
  assert.equal(aggregateStrategy(tree).oil, 8);
  assert.throws(() => aggregateStrategy({ ...tree, children: [...tree.children, ...tree.children] }), /Duplicate/);
  const cyclic = { id: "cyclic", role: "primary" as const, direct: {}, children: [] as StrategyNode[] };
  cyclic.children.push(cyclic);
  assert.throws(() => aggregateStrategy(cyclic), /Cyclic/);
});

test("S-22: cross-domain recursion accepts negative-mean protective hedges against the combined residual", () => {
  const result = calculateStrategy({ oil: 1 }, market, {}, 1000, control);
  near(result.positions.freight!, -1); near(result.positions.fx!, -1);
  near(result.final.expectedGrossPnlUsd, 1.7); near(result.final.varianceUsdSquared, 0);
  near(forecastPortfolio(market, { freight: -1 }, {}, 1000).expectedGrossPnlUsd, -0.2);
  assert.equal(result.stopReason, "no-improving-action");
  assert.equal(result.steps.filter(s => s.selectedId).length, 2);
  assert.equal(result.tree.children[0]!.children[0]!.role, "hedge");
  const fxBefore = result.steps[0]!.gainVector.find(a => a.id === "fx-1")!;
  const fxAfter = result.steps[1]!.gainVector.find(a => a.id === "fx-1")!;
  assert.notEqual(fxBefore.forecast.varianceUsdSquared, fxAfter.forecast.varianceUsdSquared);
});

test("S-22: excessive cost rejects hedging, a depth bound stops recursion, and constant hedge payoffs supply no hedge", () => {
  const costly = { ...market, instruments: market.instruments.map(i => ({ ...i, costUsdPerUnit: 100 })) };
  assert.equal(calculateStrategy({ oil: 1 }, costly, {}, 1000, control).steps[0]!.selectedId, null);
  const bounded = calculateStrategy({ oil: 1 }, market, {}, 1000, { ...control, maxDepth: 1 });
  assert.equal(bounded.stopReason, "depth-limit"); assert.ok(bounded.final.varianceUsdSquared > 0);
  const constant = { ...market, samples: market.samples.map(s => ({ ...s, payoffUsdPerUnit: [s.payoffUsdPerUnit[0]!, 0, 0] })) };
  assert.equal(calculateStrategy({ oil: 1 }, constant, {}, 1000, control).steps[0]!.gainVector.length, 0);
  assert.throws(() => calculateStrategy({ oil: 1 }, market, {}, 1000, { ...control, maxDepth: 7 }), /six/);
});

test("S-24: component gains depend on the existing book and are preserved when preference changes", () => {
  const before = forecastPortfolio(market, { oil: 1 }, {}, 1000), after = forecastPortfolio(market, { oil: 1, freight: -1 }, {}, 1000);
  const a = strategyGain(before, after, reference), b = strategyGain(before, after, { ...reference, riskAversion: 0 });
  near(a.expectedNetGainUsd, -0.2); near(a.tailRiskReductionUsd, 9.8); near(a.decisionGainUsd, 9.6);
  assert.equal(a.expectedNetGainUsd, b.expectedNetGainUsd); assert.equal(a.costChangeUsd, b.costChangeUsd);
  assert.ok(a.decisionGainUsd > 0 && b.decisionGainUsd < 0);
  const reversed = strategyGain(forecastPortfolio(market, { oil: -1 }, {}, 1000), forecastPortfolio(market, { oil: -1, freight: -1 }, {}, 1000), reference);
  assert.ok(reversed.tailRiskReductionUsd < 0);
  assert.equal(calculateStrategy({ oil: 1 }, market, {}, 1000, { ...control, reference: { ...reference, riskAversion: 0 } }).steps[0]!.selectedId, null);
});

test("S-24: primary resizing competes with hedging using the same gain vector", () => {
  const declining = { ...market, samples: market.samples.map(s => ({ ...s, payoffUsdPerUnit: [s.payoffUsdPerUnit[0]! - 20, ...s.payoffUsdPerUnit.slice(1)] })) };
  const result = calculateStrategy({ oil: 1 }, declining, {}, 1000, { ...control, minimumPrimaryScale: 0 });
  assert.equal(result.primaryScale, 0);
  assert.equal(result.positions.oil, 0);
  assert.ok(result.steps[0]!.gainVector.some(a => a.kind === "hedge"));
  assert.ok(result.steps[0]!.gainVector.some(a => a.kind === "resize"));
  assert.equal(result.steps[0]!.selectedId, "scale-0");
});

test("S-25: reference changes affect deviation without changing forecasts or silently revising targets", () => {
  const forecast = forecastPortfolio(market, { oil: 1 }, {}, 1000);
  const tight = { ...reference, maximumTailLossUsd: 1 };
  assert.equal(assessHomeostasis(forecast, reference).deviation, 0);
  assert.ok(assessHomeostasis(forecast, tight).deviation > 0);
  const result = calculateStrategy({ oil: 1 }, market, {}, 1000, { ...control, reference: tight });
  assert.deepEqual(result.reference, tight);
  assert.deepEqual(result.initial, forecast);
  assert.throws(() => assessHomeostasis(forecast, { ...reference, tailScaleUsd: 0 }), /positive/);
});

test("S-23: adaptive replay remains causal under execution/future mutation and prefix truncation", () => {
  const observations = Array.from({ length: 12 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, brent: 100 + i % 3, wti: 95 + i % 3 + i / 10 }));
  const config = { strategy: "buy-hold" as const, lookback: 3, riskLookback: 3, quantityBarrels: 1000, costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04,
    initialCapitalUsd: 1000000, liquidationDate: "2024-01-12", hedging: { ...defaultHedgingConfig, mode: "adaptive" as const, minimumPrimaryScale: 1 } };
  const a = replay(observations, config);
  const b = replay(observations.map((r, i) => i >= 7 ? { ...r, brent: -999, wti: 999 } : r), config);
  assert.deepEqual(a.rows.slice(0, 7), b.rows.slice(0, 7));
  assert.deepEqual(a.rows[7]!.strategyModel, b.rows[7]!.strategyModel);
  assert.deepEqual(a.rows[7]!.riskDecision, b.rows[7]!.riskDecision);
  assert.deepEqual(a.rows.slice(0, 8), replay(observations.slice(0, 8), config).rows);
  assert.equal(a.rows[1]!.strategyModel.status, "await-evidence");
  assert.equal(a.rows[1]!.strategyModel.selectedForecast, null);
  assert.ok(a.rows.some(r => r.strategyModel.plan?.steps.some(s => s.selectedId?.startsWith("wti"))));
});

test("S-23: historical adaptive positions reconcile cash and selected forecasts use selected quantities", async () => {
  const data = await loadDataset();
  const result = replay(data.observations.slice(0, 160), { strategy: "momentum", lookback: 20, riskLookback: 60, quantityBarrels: 1000,
    costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04, initialCapitalUsd: 1000000, hedging: { ...defaultHedgingConfig, mode: "adaptive" } });
  assert.ok(result.rows.some(r => r.strategyModel.plan));
  for (const row of result.rows) {
    near(row.realizedPnlUsd + row.unrealizedPnlUsd, row.cumulativePnlUsd);
    const forecast = row.strategyModel.selectedForecast;
    if (forecast) {
      assert.ok(forecast.evidenceThrough < row.date);
      near(forecast.transactionCostUsd, row.executionCostUsd);
      if (row.brentPosition === 0 && row.wtiPosition === 0) near(forecast.expectedGrossPnlUsd, 0);
    }
  }
});
