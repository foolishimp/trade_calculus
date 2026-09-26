import { loadDataset } from "../adapters/local_data.ts";
import { replay } from "../src/replay.ts";
import { defaultHedgingConfig } from "../src/oil_hedging.ts";

const dataset = await loadDataset();
const results = [0, 1].map(minimumPrimaryScale => replay(dataset.observations, {
  strategy: "momentum", lookback: 20, riskLookback: 60, quantityBarrels: 1000,
  costPerBarrelUsd: 0.05, fundingAnnualRate: 0.04, initialCapitalUsd: 1000000,
  liquidationDate: dataset.observations.at(-1)!.date,
  hedging: { ...defaultHedgingConfig, mode: "adaptive", minimumPrimaryScale },
}));
if (process.argv.includes("--json")) console.log(JSON.stringify({ metadata: dataset.metadata, results }, null, 2));
else {
  console.log("Historical expectation, gain vector and homeostatic reference — experimental oil spot proxies");
  console.table(results.map(r => ({ primary: r.config.hedging!.minimumPrimaryScale ? "retain in planning" : "can reduce",
    netPnl: Math.round(r.summary.netPnlUsd), drawdown: Math.round(r.summary.maxDrawdownUsd),
    hedgeSteps: r.rows.flatMap(row => row.strategyModel.plan?.steps ?? []).filter(s => s.gainVector.some(a => a.kind === "hedge" && a.id === s.selectedId)).length,
    primarySteps: r.rows.flatMap(row => row.strategyModel.plan?.steps ?? []).filter(s => s.gainVector.some(a => a.kind === "resize" && a.id === s.selectedId)).length,
  })));
  const first = results[0]!.rows.find(row => row.strategyModel.plan?.steps.some(s => s.gainVector.length));
  if (first) {
    console.log(`First decision: ${first.date}; evidence through ${first.riskDecision.evidenceThrough}`);
    console.table(first.strategyModel.plan!.steps[0]!.gainVector.map(a => ({ action: a.label, expectedNetGain: a.gain.expectedNetGainUsd,
      tailReduction: a.gain.tailRiskReductionUsd, deviationReduction: a.gain.deviationReduction, preferenceGain: a.gain.decisionGainUsd,
      selected: first.strategyModel.plan!.steps[0]!.selectedId === a.id })));
  }
  console.log("The reference is supplied, not learned from subsequent outcomes. Forecasts are historical-mean estimates; no empirical calibration is claimed.");
}
