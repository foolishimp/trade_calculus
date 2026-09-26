import type { OilObservation } from "./rates.ts";
import { day, validateObservations } from "./rates.ts";
import { finite, nonnegative, whole } from "./validation.ts";
import { historicalPriceRisk, priceStresses } from "./historical_risk.ts";
import type { HistoricalPriceRisk } from "./historical_risk.ts";
import { preparePretradeRisk } from "./pretrade_risk.ts";
import { defaultReplayPolicy, selectRiskExposure, validateReplayPolicy } from "./overlays/replay_policy.ts";
import type { ReplayRiskPolicy, RiskDecision } from "./overlays/replay_policy.ts";
import { defaultHedgingConfig, prepareOilStrategy, selectedOilForecast, validateHedgingConfig } from "./oil_hedging.ts";
import type { HedgingConfig, OilStrategyAnalysis } from "./oil_hedging.ts";
import { assessHomeostasis } from "./strategy_model.ts";

export type ReplayStrategy = "momentum" | "basis-reversion" | "buy-hold" | "no-trade";
export interface ReplayConfig {
  readonly strategy: ReplayStrategy;
  readonly lookback: number;
  readonly riskLookback?: number;
  readonly quantityBarrels: number;
  readonly costPerBarrelUsd: number;
  readonly fundingAnnualRate: number;
  readonly initialCapitalUsd: number;
  readonly riskPolicy?: ReplayRiskPolicy;
  /** A declared schedule, never inferred from exhaustion of the supplied data. */
  readonly liquidationDate?: string;
  readonly hedging?: HedgingConfig;
}
export interface Signal {
  readonly brentBarrels: number;
  readonly wtiBarrels: number;
  readonly evidenceThrough: string | null;
  readonly reason: string;
}
export interface ReplayRow {
  readonly date: string;
  readonly brent: number;
  readonly wti: number;
  readonly basis: number;
  readonly signal: Signal;
  readonly riskDecision: RiskDecision;
  readonly strategyModel: OilStrategyAnalysis;
  readonly brentPosition: number;
  readonly wtiPosition: number;
  readonly tradedBarrels: number;
  readonly grossPnlUsd: number;
  readonly executionCostUsd: number;
  readonly fundingCostUsd: number;
  readonly netPnlUsd: number;
  readonly cumulativePnlUsd: number;
  readonly realizedPnlUsd: number;
  readonly unrealizedPnlUsd: number;
  readonly navUsd: number;
  readonly drawdownUsd: number;
  readonly priceRisk: HistoricalPriceRisk | null;
  readonly varBreach: boolean | null;
  readonly stresses: ReturnType<typeof priceStresses>;
}
export interface ReplayResult {
  readonly config: ReplayConfig;
  readonly rows: readonly ReplayRow[];
  readonly summary: {
    readonly netPnlUsd: number; readonly grossPnlUsd: number; readonly executionCostUsd: number;
    readonly fundingCostUsd: number; readonly maxDrawdownUsd: number; readonly returnOnInitialCapital: number;
    readonly turnoverBarrels: number; readonly tradeDays: number; readonly observations: number;
    readonly varComparisons: number; readonly varBreaches: number;
    readonly resizedDecisions: number; readonly blockedDecisions: number;
    readonly evidenceWaits: number; readonly riskExits: number;
  };
  readonly assumptions: readonly string[];
}
interface Holding { readonly quantity: number; readonly averagePrice: number }

function rebalance(holding: Holding, target: number, price: number): { holding: Holding; realized: number } {
  const delta = target - holding.quantity;
  if (!delta) return { holding, realized: 0 };
  if (!holding.quantity || Math.sign(delta) === Math.sign(holding.quantity)) {
    return { holding: { quantity: target, averagePrice: (holding.quantity * holding.averagePrice + delta * price) / target }, realized: 0 };
  }
  const closing = Math.min(Math.abs(delta), Math.abs(holding.quantity));
  return {
    holding: { quantity: target, averagePrice: !target ? 0 : Math.sign(target) === Math.sign(holding.quantity) ? holding.averagePrice : price },
    realized: closing * (price - holding.averagePrice) * Math.sign(holding.quantity),
  };
}

export function validateReplayConfig(config: ReplayConfig): void {
  if (!["momentum", "basis-reversion", "buy-hold", "no-trade"].includes(config.strategy)) throw new Error("Unknown strategy");
  if (whole(config.lookback, "lookback") < 2 || config.lookback > 252) throw new Error("Lookback must be 2–252 observations");
  const riskWindow = config.riskLookback ?? 60;
  if (whole(riskWindow, "risk lookback") < 2 || riskWindow > 252) throw new Error("Risk lookback must be 2–252 changes");
  nonnegative(config.quantityBarrels, "barrels"); nonnegative(config.costPerBarrelUsd, "execution cost");
  nonnegative(config.fundingAnnualRate, "funding rate");
  if (finite(config.initialCapitalUsd, "initial capital") <= 0) throw new Error("Initial capital must be positive");
  validateReplayPolicy(config.riskPolicy ?? defaultReplayPolicy);
  validateHedgingConfig(config.hedging ?? defaultHedgingConfig);
  if (config.liquidationDate !== undefined) day(config.liquidationDate);
}

/** REQ-11: only prior observations are provided to this strategy boundary. */
export function generateSignal(history: readonly OilObservation[], config: ReplayConfig): Signal {
  validateReplayConfig(config);
  const last = history.at(-1);
  const flat = (reason: string): Signal => ({ brentBarrels: 0, wtiBarrels: 0, evidenceThrough: last?.date ?? null, reason });
  if (!last || config.strategy === "no-trade") return flat("No exposure");
  if (config.strategy === "buy-hold") return { ...flat("Hold Brent spot-reference exposure"), brentBarrels: config.quantityBarrels };
  if (history.length < config.lookback) return flat(`Collecting ${config.lookback} prior observations`);
  const window = history.slice(-config.lookback);
  if (config.strategy === "momentum") {
    const mean = window.reduce((sum, row) => sum + row.brent, 0) / window.length;
    const direction = Math.sign(last.brent - mean);
    return { ...flat(`Previous Brent ${last.brent.toFixed(2)} versus trailing mean ${mean.toFixed(2)}`), brentBarrels: direction * config.quantityBarrels };
  }
  const spreads = window.map(row => row.brent - row.wti);
  const mean = spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length;
  const deviation = Math.sqrt(spreads.reduce((sum, spread) => sum + (spread - mean) ** 2, 0) / spreads.length);
  const z = deviation > 1e-12 ? (last.brent - last.wti - mean) / deviation : 0;
  const direction = Math.abs(z) >= 1 ? -Math.sign(z) : 0;
  return { ...flat(`Previous Brent−WTI z-score ${z.toFixed(2)}; enter outside ±1`), brentBarrels: direction * config.quantityBarrels, wtiBarrels: -direction * config.quantityBarrels };
}

/** Deterministic spot-reference research replay, not a futures or physical execution backtest. */
export function replay(observations: readonly OilObservation[], config: ReplayConfig): ReplayResult {
  validateObservations(observations); validateReplayConfig(config);
  let brentHolding: Holding = { quantity: 0, averagePrice: 0 };
  let wtiHolding: Holding = { quantity: 0, averagePrice: 0 };
  let cumulative = 0, grossTotal = 0, executionTotal = 0, fundingTotal = 0, realizedGross = 0;
  let peak = config.initialCapitalUsd;
  const rows: ReplayRow[] = [];
  const riskLookback = config.riskLookback ?? 60;
  const policy = config.riskPolicy ?? defaultReplayPolicy;
  for (let i = 0; i < observations.length; i++) {
    // Decide before revealing this observation's prices or resulting P&L.
    const history = observations.slice(0, i);
    const signal = generateSignal(history, config);
    const actual = { brentBarrels: brentHolding.quantity, wtiBarrels: wtiHolding.quantity };
    const completed = rows.slice(-riskLookback).filter(prior => prior.varBreach !== null)
      .map(prior => ({ date: prior.date, breached: prior.varBreach! }));
    const primaryBasis = preparePretradeRisk(history, actual, signal, riskLookback, completed, config);
    const priorNavUsd = config.initialCapitalUsd + cumulative;
    const strategy = prepareOilStrategy(history, signal, actual, { ...config, riskLookback }, priorNavUsd, policy,
      config.hedging ?? defaultHedgingConfig, primaryBasis.calibration.multiplier);
    const basis = strategy.analysis.plan ? preparePretradeRisk(history, actual, strategy.analysis.composedExposure, riskLookback, completed, config) : primaryBasis;
    const horizonClose = config.liquidationDate !== undefined && day(observations[i]!.date) >= day(config.liquidationDate);
    const riskDecision = selectRiskExposure(basis, priorNavUsd, policy, horizonClose);
    const target = riskDecision.selectedExposure;
    const selectedForecast = selectedOilForecast(strategy.market, target, actual, priorNavUsd);
    const strategyModel: OilStrategyAnalysis = { ...strategy.analysis, selectedForecast,
      selectedState: selectedForecast && strategy.analysis.plan ? assessHomeostasis(selectedForecast, strategy.analysis.plan.reference) : null };

    const row = observations[i]!, previous = observations[i - 1];
    const gross = previous ? brentHolding.quantity * (row.brent - previous.brent) + wtiHolding.quantity * (row.wti - previous.wti) : 0;
    const priorRisk = rows.at(-1)?.priceRisk;
    const varBreach = priorRisk && (brentHolding.quantity || wtiHolding.quantity) ? -gross > priorRisk.varUsd : null;
    const elapsedYears = previous ? (day(row.date) - day(previous.date)) / (365 * 86400000) : 0;
    const grossNotional = previous ? Math.abs(brentHolding.quantity * previous.brent) + Math.abs(wtiHolding.quantity * previous.wti) : 0;
    const funding = grossNotional * config.fundingAnnualRate * elapsedYears;
    const turnover = Math.abs(target.brentBarrels - brentHolding.quantity) + Math.abs(target.wtiBarrels - wtiHolding.quantity);
    const executionCost = turnover * config.costPerBarrelUsd;
    const nextBrent = rebalance(brentHolding, target.brentBarrels, row.brent);
    const nextWti = rebalance(wtiHolding, target.wtiBarrels, row.wti);
    brentHolding = nextBrent.holding; wtiHolding = nextWti.holding;
    realizedGross += nextBrent.realized + nextWti.realized;
    const net = finite(gross - executionCost - funding, "replay P&L");
    cumulative += net; grossTotal += gross; executionTotal += executionCost; fundingTotal += funding;
    const unrealized = brentHolding.quantity * (row.brent - brentHolding.averagePrice) + wtiHolding.quantity * (row.wti - wtiHolding.averagePrice);
    const nav = finite(config.initialCapitalUsd + cumulative, "replay NAV");
    peak = Math.max(peak, nav);
    rows.push({ date: row.date, brent: row.brent, wti: row.wti, basis: row.brent - row.wti, signal, riskDecision, strategyModel,
      brentPosition: brentHolding.quantity, wtiPosition: wtiHolding.quantity, tradedBarrels: turnover,
      grossPnlUsd: gross, executionCostUsd: executionCost, fundingCostUsd: funding, netPnlUsd: net,
      cumulativePnlUsd: cumulative, realizedPnlUsd: realizedGross - executionTotal - fundingTotal,
      unrealizedPnlUsd: unrealized, navUsd: nav, drawdownUsd: peak - nav,
      priceRisk: historicalPriceRisk(observations.slice(0, i + 1), { brentBarrels: brentHolding.quantity, wtiBarrels: wtiHolding.quantity }, riskLookback),
      varBreach, stresses: priceStresses({ brentBarrels: brentHolding.quantity, wtiBarrels: wtiHolding.quantity }) });
  }
  return { config: { ...config, riskLookback, riskPolicy: { ...policy }, hedging: { ...(config.hedging ?? defaultHedgingConfig) } }, rows, summary: {
    netPnlUsd: cumulative, grossPnlUsd: grossTotal, executionCostUsd: executionTotal, fundingCostUsd: fundingTotal,
    maxDrawdownUsd: Math.max(0, ...rows.map(row => row.drawdownUsd)), returnOnInitialCapital: cumulative / config.initialCapitalUsd,
    turnoverBarrels: rows.reduce((sum, row) => sum + row.tradedBarrels, 0), tradeDays: rows.filter(row => row.tradedBarrels > 0).length,
    observations: rows.length,
    varComparisons: rows.filter(row => row.varBreach !== null).length, varBreaches: rows.filter(row => row.varBreach === true).length,
    resizedDecisions: rows.filter(row => row.riskDecision.outcome === "resize").length,
    blockedDecisions: rows.filter(row => row.riskDecision.outcome === "reject").length,
    evidenceWaits: rows.filter(row => row.riskDecision.outcome === "await-evidence").length,
    riskExits: rows.filter(row => row.riskDecision.outcome === "exit" && (row.signal.brentBarrels || row.signal.wtiBarrels)).length,
  }, assumptions: [
    "Historical daily spot references, with latest downloaded values; original release vintages are unavailable.",
    "Strategy and risk control use preceding observations, completed breach outcomes and prior NAV. The next mark and its P&L are revealed only after exposure selection.",
    "Execution assumes complete fills at the next observed spot mark with the supplied per-barrel cost. Uncertain fill knowledge is a separate experiment.",
    "Long/short spot-reference exposure is a synthetic P&L proxy; no futures roll, delivery, borrow availability, credit or market impact model.",
    "Gross-notional funding charge applies to both long and short legs using ACT/365; no short-sale proceeds rebate.",
    "Only an explicitly supplied liquidation date closes the horizon. Exhausting the input does not instruct a trade.",
    "The separate experimental policy caps selected exposure using cost-inclusive historical ES, independent stress loss, gross notional and prior known NAV; observe mode bypasses selection.",
    "Sizing includes rebalance costs and three calendar days of funding allowance. Future gaps and prices can exceed these estimates and supplied limits.",
    "Past VaR breaches increase an explicit heuristic allowance after 20 assessed moves; this is neither a Bayesian posterior nor proof of calibrated coverage.",
    "Parameters are user-selected; no out-of-sample strategy validation or optimization is claimed.",
    "Optional recursive control compares primary resizing and historical covariance hedges against an explicit internal-good reference; bounded greedy search is not a global optimum.",
    "Expected returns are joint historical-mean estimates after rebalance costs and a three-day funding allowance; they are not realized returns or calibrated predictions.",
    "95% historical VaR/ES uses joint absolute price changes from the prior rolling window at each risk assessment; its horizon is the next paired observation and its loss basis excludes costs/funding.",
    "Breach comparison uses the preceding risk assessment against the next gross holding P&L; stress shocks are separate and have no assigned probabilities.",
  ] };
}
