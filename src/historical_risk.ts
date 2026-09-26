import type { OilObservation } from "./rates.ts";
import { validateObservations } from "./rates.ts";
import { summarizeDistribution } from "./risk.ts";
import { finite, whole } from "./validation.ts";

export interface PriceExposure { readonly brentBarrels: number; readonly wtiBarrels: number }
export interface HistoricalPriceRisk {
  readonly varUsd: number;
  readonly expectedShortfallUsd: number;
  readonly worstSampledLossUsd: number;
  readonly samples: number;
  readonly alpha: number;
  readonly evidenceThrough: string;
  readonly horizon: "next paired observation";
  readonly basis: "gross price P&L; joint historical absolute price changes";
}

/** Forecast conditional on fixed current exposures; observations contain no future rows. */
export function historicalPriceRisk(
  history: readonly OilObservation[], exposure: PriceExposure, lookback: number, alpha = 0.95,
): HistoricalPriceRisk | null {
  if (whole(lookback, "risk lookback") < 2) throw new Error("Risk lookback must include at least two changes");
  finite(exposure.brentBarrels, "Brent exposure"); finite(exposure.wtiBarrels, "WTI exposure");
  if (history.length >= 2) validateObservations(history);
  if (history.length <= lookback) return null;
  const window = history.slice(-(lookback + 1));
  const outcomes = window.slice(1).map((row, i) => ({ probability: 1 / lookback,
    pnlUsd: finite(exposure.brentBarrels * (row.brent - window[i]!.brent) + exposure.wtiBarrels * (row.wti - window[i]!.wti), "historical scenario P&L") }));
  const summary = summarizeDistribution(outcomes, alpha);
  const orderedLosses = outcomes.map(o => o.pnlUsd === 0 ? 0 : -o.pnlUsd).sort((a, b) => a - b);
  return {
    varUsd: orderedLosses[Math.max(0, Math.ceil(alpha * lookback) - 1)]!,
    expectedShortfallUsd: summary.expectedShortfallUsd, worstSampledLossUsd: summary.worstRepresentedLossUsd,
    samples: lookback, alpha, evidenceThrough: history.at(-1)!.date,
    horizon: "next paired observation", basis: "gross price P&L; joint historical absolute price changes",
  };
}

export function priceStresses(exposure: PriceExposure) {
  finite(exposure.brentBarrels, "Brent exposure"); finite(exposure.wtiBarrels, "WTI exposure");
  return [
    { id: "parallel-fall", label: "Both references −$10/bbl", brentMove: -10, wtiMove: -10 },
    { id: "parallel-rise", label: "Both references +$10/bbl", brentMove: 10, wtiMove: 10 },
    { id: "basis-widens", label: "Brent–WTI basis +$5/bbl", brentMove: 5, wtiMove: 0 },
    { id: "basis-narrows", label: "Brent–WTI basis −$5/bbl", brentMove: -5, wtiMove: 0 },
  ].map(shock => ({ ...shock, pnlUsd: finite(exposure.brentBarrels * shock.brentMove + exposure.wtiBarrels * shock.wtiMove, "stress P&L") }));
}
