import type { Quantity } from "./quantities.ts";
import { finite, identifier, nonnegative, whole } from "./validation.ts";

export interface OilProfile {
  readonly id: string;
  readonly physicalReference: string;
  readonly futuresReference: string;
  readonly barrelsPerContract: number;
}
export interface OilTrade {
  readonly id: string;
  readonly action: "trade" | "no-trade";
  readonly strategyId: string;
  readonly profile: OilProfile;
  readonly physical: Quantity<"bbl">;
  readonly shortFutures: Quantity<"contract">;
  readonly entryPhysicalUsdPerBbl: number;
  readonly entryFuturesUsdPerBbl: number;
  readonly allInCostsUsd: number;
}
export interface OilScenario {
  readonly id: string;
  readonly probability: number;
  /** Successive settlement marks after entry, ending at closure. */
  readonly futuresPathUsdPerBbl: readonly number[];
  readonly terminalBasisUsdPerBbl: number;
}
export interface ExecutionState {
  readonly physicalBarrels: number;
  readonly shortFuturesContracts: number;
}
export interface OilOutcome {
  readonly scenarioId: string;
  readonly probability: number;
  readonly execution: ExecutionState;
  readonly terminalPhysicalUsdPerBbl: number;
  readonly physicalPnlUsd: number;
  readonly futuresPnlUsd: number;
  readonly costsPnlUsd: number;
  readonly netPnlUsd: number;
  readonly settlementCashflowsUsd: readonly number[];
  readonly peakVariationMarginUsd: number;
}

export function validateTrade(trade: OilTrade): void {
  identifier(trade.id, "trade id");
  identifier(trade.strategyId, "strategy id");
  identifier(trade.profile.id, "profile id");
  identifier(trade.profile.physicalReference, "physical reference");
  identifier(trade.profile.futuresReference, "futures reference");
  if (trade.physical.unit !== "bbl" || trade.shortFutures.unit !== "contract") throw new Error("Wrong oil trade units");
  nonnegative(trade.physical.value, "physical barrels");
  whole(trade.shortFutures.value, "futures contracts");
  if (finite(trade.profile.barrelsPerContract, "contract multiplier") <= 0) throw new Error("Contract multiplier must be positive");
  finite(trade.entryPhysicalUsdPerBbl, "entry physical price");
  finite(trade.entryFuturesUsdPerBbl, "entry futures price");
  nonnegative(trade.allInCostsUsd, "all-in costs");
  if (trade.action === "no-trade" && (trade.physical.value || trade.shortFutures.value || trade.allInCostsUsd)) {
    throw new Error("No-trade baseline must have zero legs and costs");
  }
}

/** REQ-05/06: cash is reusable; reserve is the largest cumulative deficit. */
export function futuresSettlement(
  signedContracts: number,
  barrelsPerContract: number,
  entryPrice: number,
  settlementPath: readonly number[],
): { readonly cashflowsUsd: readonly number[]; readonly totalCashUsd: number; readonly peakReserveUsd: number } {
  finite(signedContracts, "signed contracts");
  if (!Number.isSafeInteger(signedContracts)) throw new Error("Futures contracts must be whole lots");
  if (finite(barrelsPerContract, "contract multiplier") <= 0) throw new Error("Contract multiplier must be positive");
  finite(entryPrice, "entry price");
  if (!settlementPath.length) throw new Error("Settlement path must be nonempty");
  let previous = entryPrice;
  let totalCashUsd = 0;
  let peakReserveUsd = 0;
  const cashflowsUsd: number[] = [];
  for (const settlement of settlementPath) {
    finite(settlement, "settlement price");
    const cashflow = finite(signedContracts * barrelsPerContract * (settlement - previous), "settlement cash");
    totalCashUsd = finite(totalCashUsd + cashflow, "cumulative settlement cash");
    peakReserveUsd = Math.max(peakReserveUsd, -totalCashUsd);
    cashflowsUsd.push(cashflow);
    previous = settlement;
  }
  return { cashflowsUsd, totalCashUsd, peakReserveUsd };
}

export function completeExecution(trade: OilTrade): ExecutionState {
  return { physicalBarrels: trade.physical.value, shortFuturesContracts: trade.shortFutures.value };
}

/** REQ-05: close physical and futures at the last supplied settlement. */
export function valueOilTrade(
  trade: OilTrade,
  scenario: OilScenario,
  execution: ExecutionState = completeExecution(trade),
): OilOutcome {
  validateTrade(trade);
  identifier(scenario.id, "scenario id");
  if (nonnegative(scenario.probability, "scenario probability") > 1) throw new Error("Probability exceeds one");
  finite(scenario.terminalBasisUsdPerBbl, "terminal basis");
  nonnegative(execution.physicalBarrels, "executed barrels");
  whole(execution.shortFuturesContracts, "executed futures");
  if (execution.physicalBarrels > trade.physical.value || execution.shortFuturesContracts > trade.shortFutures.value) {
    throw new Error("Execution exceeds the specified package");
  }
  const settlement = futuresSettlement(-execution.shortFuturesContracts, trade.profile.barrelsPerContract,
    trade.entryFuturesUsdPerBbl, scenario.futuresPathUsdPerBbl);
  const terminalPhysicalUsdPerBbl = finite(scenario.futuresPathUsdPerBbl.at(-1)! + scenario.terminalBasisUsdPerBbl, "terminal physical price");
  const physicalPnlUsd = finite(execution.physicalBarrels * (terminalPhysicalUsdPerBbl - trade.entryPhysicalUsdPerBbl), "physical P&L");
  const futuresPnlUsd = settlement.totalCashUsd;
  const costsPnlUsd = -trade.allInCostsUsd;
  return {
    scenarioId: scenario.id, probability: scenario.probability, execution: { ...execution },
    terminalPhysicalUsdPerBbl, physicalPnlUsd, futuresPnlUsd, costsPnlUsd,
    netPnlUsd: finite(physicalPnlUsd + futuresPnlUsd + costsPnlUsd, "net P&L"),
    settlementCashflowsUsd: settlement.cashflowsUsd,
    peakVariationMarginUsd: settlement.peakReserveUsd,
  };
}
