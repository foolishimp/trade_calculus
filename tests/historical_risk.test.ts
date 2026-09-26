import test from "node:test";
import assert from "node:assert/strict";
import { historicalPriceRisk, priceStresses } from "../src/historical_risk.ts";
import { replay } from "../src/replay.ts";
import { defaultReplayPolicy } from "../src/overlays/replay_policy.ts";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8);
const history = [100, 99, 97, 94].map((price, i) => ({ date: `2024-01-0${i + 1}`, brent: price, wti: price - 5 }));
test("S-15: price-risk engine preserves joint moves and exposes a separate basis break", () => {
  const hedged = historicalPriceRisk(history, { brentBarrels: 1000, wtiBarrels: -1000 }, 3)!;
  assert.equal(hedged.varUsd, 0);
  assert.equal(hedged.expectedShortfallUsd, 0);
  const shocks = priceStresses({ brentBarrels: 1000, wtiBarrels: -1000 });
  assert.equal(shocks.find(s => s.id === "parallel-fall")!.pnlUsd, 0);
  assert.equal(shocks.find(s => s.id === "basis-narrows")!.pnlUsd, -5000);
});
test("S-15: tail losses scale with exposure and sparse history remains explicit", () => {
  assert.equal(historicalPriceRisk(history.slice(0, 2), { brentBarrels: 1000, wtiBarrels: 0 }, 3), null);
  const risk = historicalPriceRisk(history, { brentBarrels: 1000, wtiBarrels: 0 }, 3)!;
  assert.equal(risk.varUsd, 3000); near(risk.expectedShortfallUsd, 3000);
  const doubled = historicalPriceRisk(history, { brentBarrels: 2000, wtiBarrels: 0 }, 3)!;
  near(doubled.expectedShortfallUsd, risk.expectedShortfallUsd * 2);
});
test("S-15: an unseen tail shock breaches the prior forecast without altering that forecast", () => {
  const quiet = [100, 101, 100, 101, 100, 101].map((price, i) => ({ date: `2024-01-0${i + 1}`, brent: price, wti: price - 5 }));
  const shocked = quiet.map((row, i) => i === 5 ? { ...row, brent: 50 } : row);
  const config = { strategy: "buy-hold" as const, lookback: 3, riskLookback: 3, quantityBarrels: 1000, costPerBarrelUsd: 0, fundingAnnualRate: 0, initialCapitalUsd: 1000000, riskPolicy: { ...defaultReplayPolicy, mode: "observe" as const } };
  const a = replay(quiet, config), b = replay(shocked, config);
  assert.deepEqual(a.rows[4]!.priceRisk, b.rows[4]!.priceRisk);
  assert.equal(b.rows[5]!.varBreach, true);
  assert.equal(b.rows[5]!.grossPnlUsd, -50000);
  assert.ok(b.summary.varBreaches > a.summary.varBreaches);
});
test("S-15: in observation-only mode the risk window does not change strategy decisions or economic outcomes", () => {
  const observations = Array.from({ length: 15 }, (_, i) => ({ date: `2024-01-${String(i + 1).padStart(2, "0")}`, brent: 80 + (i % 4) * (i + 1), wti: 78 + i }));
  const config = { strategy: "momentum" as const, lookback: 3, quantityBarrels: 1000, costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04, initialCapitalUsd: 1000000, riskPolicy: { ...defaultReplayPolicy, mode: "observe" as const } };
  const short = replay(observations, { ...config, riskLookback: 3 });
  const long = replay(observations, { ...config, riskLookback: 8 });
  assert.deepEqual(short.rows.map(row => row.signal), long.rows.map(row => row.signal));
  assert.equal(short.summary.netPnlUsd, long.summary.netPnlUsd);
  assert.notDeepEqual(short.rows[10]!.priceRisk, long.rows[10]!.priceRisk);
});
