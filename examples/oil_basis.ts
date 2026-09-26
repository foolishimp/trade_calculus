import { oilAnalysis } from "./oil_analysis.ts";

const resolved = oilAnalysis(true);
const unresolved = oilAnalysis(false);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ resolved, unresolved }, null, 2));
} else {
  console.log("TRADE CALCULUS — synthetic oil basis experiment\n");
  console.table(resolved.candidates.map(c => ({ candidate: c.candidateId, expectedPnlUsd: c.completed.expectedPnlUsd,
    worstLossUsd: c.worstRepresentedLossUsd, expectedShortfallUsd: c.worstConditionalExpectedShortfallUsd, marginUsd: c.peakVariationMarginUsd })));
  console.log(`Completed-state comparison: ${resolved.decision.action} ${resolved.decision.candidateId}`);
  console.log(`Unknown physical fill: ${unresolved.decision.action}; half-size represented loss = $${unresolved.candidates[1]!.worstRepresentedLossUsd.toLocaleString()}`);
  console.log(`Assumed half-size closing P&L: $${resolved.feedback.halfSizePnl!.netPnlUsd.toLocaleString()}; original forecast Brier score: ${resolved.feedback.originalForecastBrierScore.toFixed(2)}`);
  console.log("\n" + resolved.boundary);
}
