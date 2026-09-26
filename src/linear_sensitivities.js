// @ts-check
/** @typedef {import('./historical_risk.ts').PriceExposure} PriceExposure */

/** Exact derivatives of fixed-quantity price terms, excluding costs and funding.
 * @param {PriceExposure} exposure
 * @param {string | null} evidenceThrough
 */
export function linearOilSensitivities(exposure, evidenceThrough) {
  const { brentBarrels, wtiBarrels } = exposure;
  if (![brentBarrels, wtiBarrels, brentBarrels + wtiBarrels].every(Number.isFinite)) throw new Error('Finite oil exposures required');
  return {
    modelId: 'oil-linear-price-sensitivities@1', evidenceThrough,
    currency: 'USD', deltaUnit: 'USD per 1 USD/bbl move',
    brentDelta: brentBarrels, wtiDelta: wtiBarrels,
    parallelDelta: brentBarrels + wtiBarrels, basisDelta: brentBarrels,
    basisConvention: 'Brent changes; WTI held fixed',
    gamma: { brent: 0, wti: 0, cross: 0 },
    vega: null, theta: null, rho: null,
    scope: 'Fixed-quantity linear price terms; costs, funding and option valuation excluded',
  };
}

/** @param {ReturnType<typeof linearOilSensitivities>} sensitivity
 * @param {{brent: number, wti: number}} move
 */
export function linearPriceChange(sensitivity, move) {
  const pnl = sensitivity.brentDelta * move.brent + sensitivity.wtiDelta * move.wti;
  if (![move.brent, move.wti, pnl].every(Number.isFinite)) throw new Error('Finite price moves and result required');
  return pnl;
}
