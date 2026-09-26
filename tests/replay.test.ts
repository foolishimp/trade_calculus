import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { replay } from "../src/replay.ts";
import { defaultReplayPolicy } from "../src/overlays/replay_policy.ts";
import type { ReplayConfig, ReplayStrategy } from "../src/replay.ts";
import { day, interpolateCurve, mockCurves, observationAsOf, optionPayoff, presentValueUsd } from "../src/rates.ts";
import { loadDataset } from "../adapters/local_data.ts";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const config: ReplayConfig = { strategy: "buy-hold", lookback: 2, quantityBarrels: 10, costPerBarrelUsd: 0.1, fundingAnnualRate: 0, initialCapitalUsd: 10000, riskPolicy: { ...defaultReplayPolicy, mode: "observe" }, liquidationDate: "2024-01-06" };
const observations = [80, 100, 110, 90, 120, 100].map((brent, i) => ({ date: `2024-01-0${i + 1}`, brent, wti: brent - 5 + i % 2 }));

test("S-12: signal executes on the next observation; earlier price moves cannot earn P&L", () => {
  const result = replay(observations, config);
  assert.equal(result.rows[0]!.brentPosition, 0);
  assert.equal(result.rows[1]!.brentPosition, 10);
  assert.equal(result.rows[1]!.grossPnlUsd, 0); // 80 -> 100 occurs before entry.
  assert.equal(result.rows[2]!.grossPnlUsd, 100);
  assert.equal(result.rows[1]!.signal.evidenceThrough, "2024-01-01");
  assert.equal(result.summary.grossPnlUsd, 0); // Enter at 100, close at 100.
  assert.equal(result.summary.executionCostUsd, 2); // Both opening and terminal close.
  assert.equal(result.summary.netPnlUsd, -2);
  assert.equal(result.rows.at(-1)!.brentPosition, 0);
});
test("S-12: future mutation cannot change earlier positions, cash or signals", () => {
  const altered = observations.map((row, i) => i >= 4 ? { ...row, brent: row.brent + 10000, wti: row.wti - 500 } : row);
  for (const strategy of ["momentum", "basis-reversion", "buy-hold", "no-trade"] as ReplayStrategy[]) {
    assert.deepEqual(replay(observations, { ...config, strategy }).rows.slice(0, 4), replay(altered, { ...config, strategy }).rows.slice(0, 4));
  }
});
test("S-12: funding charges follow calendar time and held gross notional", () => {
  const result = replay([{ date: "2024-01-01", brent: 100, wti: 90 }, { date: "2024-01-02", brent: 100, wti: 90 }, { date: "2024-01-12", brent: 100, wti: 90 }], { ...config, fundingAnnualRate: 0.365, costPerBarrelUsd: 0 });
  near(result.summary.fundingCostUsd, 10); // 10 bbl * $100 * .365 * 10/365
});
test("S-12: realized/unrealized reconciliation survives reversals and costs", async () => {
  const dataset = await loadDataset();
  for (const strategy of ["momentum", "basis-reversion", "buy-hold", "no-trade"] as ReplayStrategy[]) {
    const result = replay(dataset.observations, { ...config, strategy, fundingAnnualRate: 0.04, liquidationDate: dataset.observations.at(-1)!.date });
    for (const row of result.rows) {
      near(row.realizedPnlUsd + row.unrealizedPnlUsd, row.cumulativePnlUsd);
      if (row.signal.evidenceThrough) assert.ok(row.signal.evidenceThrough < row.date);
    }
    near(result.summary.grossPnlUsd - result.summary.executionCostUsd - result.summary.fundingCostUsd, result.summary.netPnlUsd);
    assert.equal(result.rows.at(-1)!.unrealizedPnlUsd, 0);
  }
});
test("S-12: changed costs affect net results, not signals or gross price outcomes", () => {
  const cheap = replay(observations, { ...config, costPerBarrelUsd: 0 });
  const expensive = replay(observations, { ...config, costPerBarrelUsd: 2 });
  assert.deepEqual(cheap.rows.map(r => r.signal), expensive.rows.map(r => r.signal));
  assert.equal(cheap.summary.grossPnlUsd, expensive.summary.grossPnlUsd);
  assert.equal(cheap.summary.netPnlUsd - expensive.summary.netPnlUsd, 40);
});
test("S-12: unsupported configurations and invalid observations fail explicitly", () => {
  assert.throws(() => replay(observations, { ...config, lookback: 1 }), /lookback/i);
  assert.throws(() => replay(observations, { ...config, quantityBarrels: NaN }), /finite/);
  assert.throws(() => replay([...observations].reverse(), config), /increasing dates/);
  assert.throws(() => day("2024-02-30"), /Invalid calendar/);
});
test("S-13: as-of lookup never returns a future row", () => {
  assert.equal(observationAsOf(observations, "2024-01-03").brent, 110);
  assert.throws(() => observationAsOf(observations, "2023-12-31"), /No observation/);
  assert.equal(observationAsOf(observations, "2024-01-07").date, "2024-01-06");
});
test("S-13: all family curves expose synthetic provenance and compatible interpolation", () => {
  const curves = mockCurves("2024-01-03", 80);
  assert.equal(curves.length, 9);
  assert.ok(curves.every(c => c.provenance === "synthetic"));
  const oil = curves.find(c => c.family === "energy")!;
  assert.equal(oil.points[0]!.value, 80);
  near(interpolateCurve(oil, 15, "USD/bbl"), (oil.points[0]!.value + oil.points[1]!.value) / 2);
  assert.throws(() => interpolateCurve(oil, 15, "USD/tonne"), /Incompatible/);
  assert.throws(() => interpolateCurve(oil, 400, "USD/bbl"), /extrapolation/);
  const funding = curves.find(c => c.family === "funding")!;
  near(presentValueUsd([{ tenorDays: 365, usd: 1000 }], funding), 1000 * Math.exp(-0.044));
  assert.equal(optionPayoff("put", -20, 10, 1000), 30000);
});
test("S-13: historical fixture preserves the exact source hash and paired observation grain", async () => {
  const dataset = await loadDataset();
  const raw = await readFile(new URL("../data/oil_spot_source.csv", import.meta.url));
  assert.equal(createHash("sha256").update(raw).digest("hex"), dataset.metadata.rawSha256);
  assert.ok(dataset.observations.length > 700);
  assert.equal(dataset.metadata.unit, "USD/bbl");
  assert.ok(dataset.observations.every(row => row.date >= "2023-01-01" && row.date <= "2025-12-31"));
});
