import test from "node:test";
import assert from "node:assert/strict";
import { replay } from "../src/replay.ts";
import type { ReplayConfig, ReplayStrategy } from "../src/replay.ts";
import { preparePretradeRisk, calibrationAllowance } from "../src/pretrade_risk.ts";
import { defaultReplayPolicy, selectRiskExposure } from "../src/overlays/replay_policy.ts";
import { loadDataset } from "../adapters/local_data.ts";

const flat = { brentBarrels: 0, wtiBarrels: 0 };
const exposure = { brentBarrels: 1000, wtiBarrels: 0 };
const noCosts = { costPerBarrelUsd: 0, fundingAnnualRate: 0 };
const date = (i: number) => new Date(Date.UTC(2024, 0, i + 1)).toISOString().slice(0, 10);
const path = (prices: readonly number[]) => prices.map((brent, i) => ({ date: date(i), brent, wti: brent - 5 }));
const quiet = path([100, 101, 100, 101, 100, 101, 100, 101]);
const config: ReplayConfig = {
  strategy: "buy-hold", lookback: 3, riskLookback: 3, quantityBarrels: 1000,
  ...noCosts, initialCapitalUsd: 1000000,
};
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("S-16: changing the execution mark or any future price cannot alter the already selected exposure", () => {
  const movingBasis = quiet.map((row, i) => ({ ...row, wti: row.brent - 5 - i % 3 }));
  for (const strategy of ["buy-hold", "momentum", "basis-reversion", "no-trade"] as ReplayStrategy[]) {
    const original = replay(movingBasis, { ...config, strategy });
    const changed = replay(movingBasis.map((row, i) => i >= 5 ? { ...row, brent: -50 + i, wti: 500 - i } : row), { ...config, strategy });
    assert.deepEqual(original.rows.slice(0, 5), changed.rows.slice(0, 5));
    assert.deepEqual(original.rows[5]!.riskDecision, changed.rows[5]!.riskDecision);
    assert.deepEqual(original.rows[5]!.signal, changed.rows[5]!.signal);
    if (strategy === "basis-reversion") assert.notEqual(original.rows[4]!.brentPosition, 0);
    for (const row of original.rows) if (row.riskDecision.evidenceThrough) assert.ok(row.riskDecision.evidenceThrough < row.date);
  }
});

test("S-16: every truncated replay is a prefix of the full run; only a declared date closes holdings", () => {
  const scheduled = { ...config, liquidationDate: date(7) };
  const full = replay(quiet, scheduled);
  for (let length = 2; length <= quiet.length; length++) {
    assert.deepEqual(replay(quiet.slice(0, length), scheduled).rows, full.rows.slice(0, length));
  }
  assert.equal(full.rows[7]!.riskDecision.outcome, "horizon-close");
  assert.equal(full.rows[7]!.brentPosition, 0);
  assert.equal(replay(quiet.slice(0, 6), config).rows.at(-1)!.brentPosition, 500);
});

test("S-17: missing evidence blocks entry and a tighter stress budget reduces actual simulated size", () => {
  const baseline = replay(quiet, config);
  const tight = replay(quiet, { ...config, riskPolicy: { ...defaultReplayPolicy, maxStressLossUsd: 1000 } });
  assert.equal(baseline.rows[1]!.riskDecision.outcome, "await-evidence");
  assert.equal(baseline.rows[3]!.brentPosition, 0);
  assert.equal(baseline.rows[4]!.brentPosition, 500);
  assert.equal(tight.rows[4]!.brentPosition, 100);
  assert.equal(tight.rows[4]!.riskDecision.selectedRisk!.stressLossWithCostsUsd, 1000);
  assert.deepEqual(baseline.rows.map(r => r.signal), tight.rows.map(r => r.signal));
});

test("S-17: a historically perfect hedge is still constrained by an independent basis-break stress", () => {
  const basis = preparePretradeRisk(quiet, flat, { brentBarrels: 1000, wtiBarrels: -1000 }, 3, [], noCosts);
  assert.equal(basis.priceRisk!.expectedShortfallUsd, 0);
  const decision = selectRiskExposure(basis, 1000000, { ...defaultReplayPolicy, maxStressLossUsd: 1000 });
  near(decision.scale, 0.2);
  assert.equal(decision.selectedExposure.brentBarrels, 200);
  assert.equal(decision.selectedExposure.wtiBarrels, -200);
});

test("S-17: interval sizing finds feasible holdings even when the cost of closing exceeds the budget", () => {
  const basis = preparePretradeRisk(path([100, 100, 100, 100]), { brentBarrels: 500, wtiBarrels: 0 }, exposure, 3, [], { ...noCosts, costPerBarrelUsd: 10 });
  const decision = selectRiskExposure(basis, 1000000, {
    ...defaultReplayPolicy, maxExpectedShortfallUsd: 1, maxStressLossUsd: 10000,
  });
  assert.equal(decision.selectedExposure.brentBarrels, 500);
  assert.equal(decision.selectedRisk!.transactionCostUsd, 0);
  const exit = selectRiskExposure(basis, 1000000, { ...defaultReplayPolicy, maxExpectedShortfallUsd: 1 }, true);
  assert.equal(exit.selectedExposure.brentBarrels, 0);
  assert.equal(exit.unavoidableExitCostExceedsBudget, true);
});

test("S-17: nonpositive prior NAV closes exposure and an insufficient budget rejects an entry", () => {
  const basis = preparePretradeRisk(quiet, exposure, exposure, 3, [], noCosts);
  assert.equal(selectRiskExposure(basis, -1, defaultReplayPolicy).outcome, "exit");
  const entry = preparePretradeRisk(quiet, flat, exposure, 3, [], noCosts);
  assert.equal(selectRiskExposure(entry, 1000000, { ...defaultReplayPolicy, maxStressLossUsd: 0 }).outcome, "reject");
  const limitedNav = selectRiskExposure(entry, 1000, defaultReplayPolicy);
  assert.ok(limitedNav.selectedRisk!.grossNotionalUsd <= 1000);
});

test("S-18: an unseen shock causes loss at the previously chosen size; only later decisions respond", () => {
  const shocked = path([100, 101, 100, 101, 100, 101, 50, 51, 50]);
  const normal = path([100, 101, 100, 101, 100, 101, 100, 101, 100]);
  const a = replay(shocked, config), b = replay(normal, config);
  assert.deepEqual(a.rows[6]!.riskDecision, b.rows[6]!.riskDecision);
  assert.equal(a.rows[6]!.grossPnlUsd, -25500);
  assert.equal(a.rows[6]!.varBreach, true);
  assert.equal(a.rows[6]!.brentPosition, 500);
  assert.equal(a.rows[7]!.brentPosition, 49); // $2,500 tail allowance / $51 observed loss per barrel.
  assert.equal(b.rows[7]!.brentPosition, 500);
});

test("S-18: completed breaches increase the uncertainty allowance without accepting future feedback", () => {
  const history = path(Array.from({ length: 30 }, (_, i) => 100 + i % 2));
  const outcomes = Array.from({ length: 20 }, (_, i) => ({ date: date(i + 1), breached: i < 2 }));
  assert.equal(calibrationAllowance(outcomes, date(29)).multiplier, 2);
  assert.equal(calibrationAllowance(outcomes.slice(0, 19), date(29)).multiplier, 1);
  assert.equal(calibrationAllowance(outcomes.map(o => ({ ...o, breached: true })), date(29)).multiplier, 3);
  assert.throws(() => calibrationAllowance(outcomes, date(10)), /cutoff/);
  assert.throws(() => calibrationAllowance([outcomes[0]!, outcomes[0]!], date(29)), /unique/);
  const policy = { ...defaultReplayPolicy, maxExpectedShortfallUsd: 500, maxStressLossUsd: 100000 };
  const noFeedback = selectRiskExposure(preparePretradeRisk(history, flat, exposure, 3, [], noCosts), 1000000, policy);
  const withFeedback = selectRiskExposure(preparePretradeRisk(history, flat, exposure, 3, outcomes, noCosts), 1000000, policy);
  assert.equal(noFeedback.selectedExposure.brentBarrels, 500);
  assert.equal(withFeedback.selectedExposure.brentBarrels, 250);
});

test("S-19: historical control and observation runs retain the same proposals but different exposures and reconciled cash", async () => {
  const dataset = await loadDataset();
  for (const strategy of ["momentum", "basis-reversion", "buy-hold"] as ReplayStrategy[]) {
    const params = { ...config, strategy, lookback: 20, riskLookback: 60, costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04, liquidationDate: dataset.observations.at(-1)!.date };
    const controlled = replay(dataset.observations, params);
    const observed = replay(dataset.observations, { ...params, riskPolicy: { ...defaultReplayPolicy, mode: "observe" } });
    assert.deepEqual(controlled.rows.map(r => r.signal), observed.rows.map(r => r.signal));
    assert.notDeepEqual(controlled.rows.map(r => r.brentPosition), observed.rows.map(r => r.brentPosition));
    assert.ok(controlled.summary.resizedDecisions > 0);
    for (const row of controlled.rows) {
      near(row.realizedPnlUsd + row.unrealizedPnlUsd, row.cumulativePnlUsd);
      const decision = row.riskDecision;
      if (decision.outcome === "accept" || decision.outcome === "resize") {
        assert.ok(decision.scale > 0 && decision.scale <= 1);
        assert.ok(decision.selectedRisk!.tailLossWithCostsUsd <= defaultReplayPolicy.maxExpectedShortfallUsd + 1e-6);
        assert.ok(decision.selectedRisk!.stressLossWithCostsUsd <= defaultReplayPolicy.maxStressLossUsd + 1e-6);
        assert.ok(decision.selectedRisk!.grossNotionalUsd <= defaultReplayPolicy.maxGrossNotionalUsd + 1e-6);
      }
    }
    near(controlled.rows.at(-1)!.unrealizedPnlUsd, 0);
    near(controlled.summary.netPnlUsd, controlled.summary.grossPnlUsd - controlled.summary.executionCostUsd - controlled.summary.fundingCostUsd);
  }
});

test("S-19: the risk window affects controlled trades while leaving the strategy proposal unchanged", () => {
  const short = replay(quiet, config), long = replay(quiet, { ...config, riskLookback: 6 });
  assert.deepEqual(short.rows.map(r => r.signal), long.rows.map(r => r.signal));
  assert.equal(short.rows[4]!.brentPosition, 500);
  assert.equal(long.rows[4]!.brentPosition, 0);
});

test("S-17: the sizing solver agrees with exhaustive whole-barrel evaluation across rebalance directions", () => {
  const history = path([100, 99, 103, 98]);
  for (const proposed of [{ brentBarrels: 20, wtiBarrels: 0 }, { brentBarrels: -20, wtiBarrels: 20 }]) {
    for (const current of [flat, { brentBarrels: 7, wtiBarrels: -13 }, { brentBarrels: -11, wtiBarrels: 3 }]) {
      for (const cost of [0, 1, 15]) {
        for (const budget of [0, 25, 100, 500]) {
          const basis = preparePretradeRisk(history, current, proposed, 3, [], { costPerBarrelUsd: cost, fundingAnnualRate: 0.1 });
          const policy = { ...defaultReplayPolicy, maxExpectedShortfallUsd: budget, maxStressLossUsd: budget, maxGrossNotionalUsd: 1500 };
          const decision = selectRiskExposure(basis, 10000, policy);
          const forecastLossPerBarrel = proposed.brentBarrels > 0 ? 5 : 0; // -$5 Brent move, or exactly cancelling joint legs.
          let expectedUnits = 0;
          for (let units = 1; units <= 20; units++) {
            const brent = proposed.brentBarrels / 20 * units, wti = proposed.wtiBarrels / 20 * units;
            const transaction = (Math.abs(brent - current.brentBarrels) + Math.abs(wti - current.wtiBarrels)) * cost;
            const notional = Math.abs(brent * 98) + Math.abs(wti * 93);
            const funding = notional * 0.1 * 3 / 365;
            const tail = units * forecastLossPerBarrel + transaction + funding;
            const stress = units * (wti ? 5 : 10) + transaction + funding;
            if (tail <= budget && stress <= budget && notional <= 1500) expectedUnits = units;
          }
          near(Math.abs(decision.selectedExposure.brentBarrels), expectedUnits);
        }
      }
    }
  }
});
