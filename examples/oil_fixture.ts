import type { OilProfile, OilScenario, OilTrade } from "../src/oil.ts";
import type { AnalysisContext } from "../src/risk.ts";
import type { Strategy } from "../src/families.ts";
import { quantity } from "../src/quantities.ts";

export const strategy: Strategy = {
  id: "local-basis-strengthening@1", objective: "Maximize expected net USD P&L over 30 days",
  thesis: "The local crude differential to the selected Brent month strengthens",
  mechanism: "Temporary local discount unwinds; a short benchmark hedge retains the basis exposure",
  evidenceIds: ["synthetic-thesis-v1"], horizon: "30 days",
  requiredCapabilities: ["storage", "financing", "benchmark-hedging"],
  entryConditions: ["Both legs can be established", "Storage and funding are available"],
  exitConditions: ["Close by the 30-day horizon before the selected futures expiry"],
  invalidationConditions: ["Structural basis change", "Unavailable capacity", "Unresolved execution"],
};
export const profile: OilProfile = {
  id: "synthetic-oil-profile@1", physicalReference: "local-crude/terminal-A/2026-10",
  futuresReference: "Brent/2027-01:synthetic-analysis-binding", barrelsPerContract: 1000,
};
export const context: AnalysisContext = {
  valuationAt: "2026-09-26T00:00:00Z", knowledgeCutoff: "2026-09-26T00:00:00Z",
  horizonAt: "2026-10-26T00:00:00Z", validUntil: "2026-09-26T00:05:00Z",
  modelId: "oil-linear-basis@1", marketSnapshotId: "synthetic-oil-snapshot@1", bookId: "isolated-empty-book@1",
  evidenceIds: ["synthetic-thesis-v1", "synthetic-price-v1"],
  assumptions: ["Synthetic probabilities", "Linear cost", "Constant quantity/quality", "Inventory financing and initial margin already provided", "Storage and resale capacity available"],
};
export const scenarios: readonly OilScenario[] = [
  { id: "strengthen", probability: 0.6, futuresPathUsdPerBbl: [90, 74], terminalBasisUsdPerBbl: 3 },
  { id: "unchanged", probability: 0.3, futuresPathUsdPerBbl: [85, 80], terminalBasisUsdPerBbl: 1 },
  { id: "weaken", probability: 0.1, futuresPathUsdPerBbl: [90], terminalBasisUsdPerBbl: -1 },
];
export function makeTrade(barrels: number): OilTrade {
  return {
    id: barrels ? `basis-${barrels}` : "no-trade", action: barrels ? "trade" : "no-trade",
    strategyId: strategy.id, profile, physical: quantity(barrels, "bbl"), shortFutures: quantity(barrels / 1000, "contract"),
    entryPhysicalUsdPerBbl: 81, entryFuturesUsdPerBbl: 80, allInCostsUsd: barrels * 0.6,
  };
}
