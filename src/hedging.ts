import { aggregateStrategy, forecastPortfolio, portfolioPayoffs, strategyGain, assessHomeostasis } from "./strategy_model.ts";
import type { HomeostaticReference, HomeostaticState, PayoffMarket, PortfolioForecast, Positions, StrategyGain, StrategyNode } from "./strategy_model.ts";
import { finite, nonnegative, unique, whole } from "./validation.ts";

export interface HedgeControl {
  readonly candidateInstrumentIds: readonly string[];
  readonly maxDepth: number;
  readonly minimumPrimaryScale: number;
  readonly reference: HomeostaticReference;
}
export interface Adjustment {
  readonly id: string; readonly kind: "hedge" | "resize"; readonly label: string;
  readonly quantities: Positions; readonly primaryScale: number;
  readonly hedgeCalculation: { readonly covariance: number; readonly unitVariance: number; readonly unconstrainedIncrement: number } | null;
  readonly forecast: PortfolioForecast; readonly gain: StrategyGain;
  readonly eligible: boolean; readonly reason: string;
}
export interface RecursiveStrategyResult {
  readonly tree: StrategyNode; readonly positions: Positions;
  readonly initial: PortfolioForecast; readonly final: PortfolioForecast;
  readonly initialState: HomeostaticState; readonly finalState: HomeostaticState;
  readonly reference: HomeostaticReference; readonly primaryScale: number;
  readonly steps: readonly { readonly before: PortfolioForecast; readonly gainVector: readonly Adjustment[]; readonly selectedId: string | null }[];
  readonly stopReason: "no-improving-action" | "depth-limit";
}
interface MutableNode { id: string; role: StrategyNode["role"]; direct: Positions; children: MutableNode[] }
const canonical = (market: PayoffMarket, q: Positions) => market.instruments.map(i => (q[i.id] ?? 0).toFixed(9)).join("|");

/** REQ-20–24: one book/reference; every accepted action changes the next gain vector. */
export function calculateStrategy(primary: Positions, market: PayoffMarket, actual: Positions, priorNavUsd: number, control: HedgeControl): RecursiveStrategyResult {
  if (whole(control.maxDepth, "maximum depth") > 6) throw new Error("Maximum strategy depth is six");
  if (nonnegative(control.minimumPrimaryScale, "minimum primary scale") > 1) throw new Error("Primary scale must be in [0,1]");
  unique(control.candidateInstrumentIds, "hedge candidate ids");
  for (const id of control.candidateInstrumentIds) if (!market.instruments.some(i => i.id === id)) throw new Error(`Unknown hedge candidate: ${id}`);
  const root: MutableNode = { id: "primary", role: "primary", direct: { ...primary }, children: [] };
  let tail = root, quantities = { ...primary }, primaryScale = 1;
  const initial = forecastPortfolio(market, quantities, actual, priorNavUsd);
  assessHomeostasis(initial, control.reference);
  let before = initial;
  const seen = new Set([canonical(market, quantities)]);
  const steps: { before: PortfolioForecast; gainVector: Adjustment[]; selectedId: string | null }[] = [];
  let stopReason: RecursiveStrategyResult["stopReason"] = "depth-limit";
  for (let depth = 0; depth < control.maxDepth; depth++) {
    const alternatives: Adjustment[] = [];
    const add = (id: string, kind: Adjustment["kind"], label: string, next: Positions, scale: number, calc: Adjustment["hedgeCalculation"]) => {
      if (canonical(market, next) === canonical(market, quantities)) return;
      const forecast = forecastPortfolio(market, next, actual, priorNavUsd);
      const gain = strategyGain(before, forecast, control.reference);
      const varianceImproves = kind !== "hedge" || gain.varianceReductionUsdSquared > 1e-8;
      const improves = gain.deviationReduction > 1e-10 || Math.abs(gain.deviationReduction) <= 1e-10 && gain.decisionGainUsd > 1e-7;
      const repeat = seen.has(canonical(market, next));
      const eligible = varianceImproves && improves && !repeat;
      alternatives.push({ id, kind, label, quantities: next, primaryScale: scale, hedgeCalculation: calc, forecast, gain, eligible,
        reason: repeat ? "Repeated aggregate book" : !varianceImproves ? "No reduction in sampled residual variance" : !improves ? "No improvement against the supplied internal-good reference" : "Improves the combined book against the supplied reference" });
    };
    const scales = [...new Set([control.minimumPrimaryScale, Math.max(control.minimumPrimaryScale, 0.5), 1])];
    for (const scale of scales) {
      if (scale === primaryScale) continue;
      const next = Object.fromEntries(market.instruments.map(i => [i.id, primaryScale > 0 ? (quantities[i.id] ?? 0) * scale / primaryScale : (primary[i.id] ?? 0) * scale]));
      // Quantity steps are instrument-specific; skip non-executable resize points.
      if (market.instruments.some(i => Math.abs((next[i.id] ?? 0) / i.quantityStep - Math.round((next[i.id] ?? 0) / i.quantityStep)) > 1e-8)) continue;
      add(`scale-${scale}`, "resize", `Set primary package to ${(scale * 100).toFixed(0)}%`, next, scale, null);
    }
    const residual = portfolioPayoffs(market, quantities);
    const meanX = residual.reduce((a, b) => a + b, 0) / residual.length;
    for (const id of control.candidateInstrumentIds) {
      if (primary[id]) continue; // Changes to primary instruments are explicit resize actions.
      const k = market.instruments.findIndex(i => i.id === id), instrument = market.instruments[k]!;
      const y = market.samples.map(s => s.payoffUsdPerUnit[k]!);
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;
      const variance = y.reduce((sum, v) => sum + (v - meanY) ** 2, 0) / y.length;
      if (variance <= 1e-12) continue;
      const covariance = finite(y.reduce((sum, v, j) => sum + (v - meanY) * (residual[j]! - meanX), 0) / y.length, "covariance");
      const increment = finite(-covariance / variance, "hedge increment");
      for (const fraction of [1, 0.5]) {
        const bound = Math.floor(instrument.maxHedgeQuantity / instrument.quantityStep) * instrument.quantityStep;
        const target = Math.max(-bound, Math.min(bound, (quantities[id] ?? 0) + increment * fraction));
        const rounded = Math.sign(target) * Math.round(Math.abs(target) / instrument.quantityStep) * instrument.quantityStep;
        if (Math.abs(rounded) > instrument.maxHedgeQuantity + 1e-8) continue;
        add(`${id}-${fraction}`, "hedge", `${id}: ${rounded} ${instrument.unit}`, { ...quantities, [id]: rounded }, primaryScale,
          { covariance, unitVariance: variance, unconstrainedIncrement: increment });
      }
    }
    const selected = alternatives.filter(a => a.eligible).sort((a, b) => {
      const deviationDifference = b.gain.deviationReduction - a.gain.deviationReduction;
      return Math.abs(deviationDifference) > 1e-10 ? deviationDifference : b.gain.decisionGainUsd - a.gain.decisionGainUsd || a.id.localeCompare(b.id);
    })[0];
    steps.push({ before, gainVector: alternatives, selectedId: selected?.id ?? null });
    if (!selected) { stopReason = "no-improving-action"; break; }
    const direct = Object.fromEntries(market.instruments.map(i => [i.id, (selected.quantities[i.id] ?? 0) - (quantities[i.id] ?? 0)]));
    const child: MutableNode = { id: `adjustment-${depth + 1}`, role: selected.kind, direct, children: [] };
    tail.children.push(child); tail = child;
    quantities = { ...selected.quantities }; before = selected.forecast; primaryScale = selected.primaryScale;
    seen.add(canonical(market, quantities));
  }
  const positions = aggregateStrategy(root);
  const final = forecastPortfolio(market, positions, actual, priorNavUsd);
  return { tree: root, positions, initial, final,
    initialState: assessHomeostasis(initial, control.reference), finalState: assessHomeostasis(final, control.reference),
    reference: { ...control.reference }, primaryScale, steps, stopReason };
}
