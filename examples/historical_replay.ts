import { loadDataset } from "../adapters/local_data.ts";
import { replay } from "../src/replay.ts";
import type { ReplayStrategy } from "../src/replay.ts";
import { defaultReplayPolicy } from "../src/overlays/replay_policy.ts";

const dataset = await loadDataset();
const strategies: ReplayStrategy[] = ["momentum", "basis-reversion", "buy-hold", "no-trade"];
const results = strategies.flatMap(strategy => (["control", "observe"] as const).map(mode => replay(dataset.observations, {
  strategy, lookback: 20, quantityBarrels: 1000, costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04, initialCapitalUsd: 1000000,
  riskPolicy: { ...defaultReplayPolicy, mode }, liquidationDate: dataset.observations.at(-1)!.date,
})));
if (process.argv.includes("--json")) console.log(JSON.stringify({ metadata: dataset.metadata, results }, null, 2));
else {
  console.log(`Historical oil spot-reference replay: ${dataset.observations[0]!.date} to ${dataset.observations.at(-1)!.date}`);
  console.table(results.map(r => ({ strategy: r.config.strategy, mode: r.config.riskPolicy!.mode, netPnl: Math.round(r.summary.netPnlUsd),
    drawdown: Math.round(r.summary.maxDrawdownUsd), executionCost: Math.round(r.summary.executionCostUsd),
    fundingCost: Math.round(r.summary.fundingCostUsd), tradeDays: r.summary.tradeDays,
    riskBreaches: `${r.summary.varBreaches}/${r.summary.varComparisons}`, resized: r.summary.resizedDecisions,
    evidenceWaits: r.summary.evidenceWaits })));
  console.log(results[0]!.assumptions.join("\n"));
}
