import type { UnderlyingFamily } from "./families.ts";
import { finite, identifier, nonnegative } from "./validation.ts";

export interface OilObservation { readonly date: string; readonly brent: number; readonly wti: number }
export interface RatePoint { readonly tenorDays: number; readonly value: number }
export interface RateCurve {
  readonly id: string;
  readonly asOf: string;
  readonly family: UnderlyingFamily | "funding" | "volatility";
  readonly label: string;
  readonly unit: string;
  readonly provenance: "synthetic";
  readonly formula: string;
  readonly points: readonly RatePoint[];
}

export function day(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Expected YYYY-MM-DD date");
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new Error("Invalid calendar date");
  return value;
}

export function validateObservations(observations: readonly OilObservation[]): void {
  if (observations.length < 2) throw new Error("At least two paired observations are required");
  let previous = -Infinity;
  for (const observation of observations) {
    const time = day(observation.date);
    if (time <= previous) throw new Error("Observations must have unique increasing dates");
    finite(observation.brent, "Brent observation"); finite(observation.wti, "WTI observation");
    previous = time;
  }
}

/** REQ-12: a replay lookup never selects a later observation or forward fills a missing leg. */
export function observationAsOf(observations: readonly OilObservation[], asOf: string): OilObservation {
  validateObservations(observations); day(asOf);
  const observation = observations.findLast(row => row.date <= asOf);
  if (!observation) throw new Error("No observation exists at or before the requested date");
  return { ...observation };
}

export function interpolateCurve(curve: RateCurve, tenorDays: number, expectedUnit: string): number {
  nonnegative(tenorDays, "tenor"); identifier(expectedUnit, "curve unit");
  if (curve.unit !== expectedUnit) throw new Error("Incompatible curve unit");
  if (!curve.points.length) throw new Error("Curve has no points");
  let previousTenor = -1;
  for (const point of curve.points) {
    nonnegative(point.tenorDays, "curve tenor"); finite(point.value, "curve value");
    if (point.tenorDays <= previousTenor) throw new Error("Curve tenors must strictly increase");
    previousTenor = point.tenorDays;
  }
  if (tenorDays < curve.points[0]!.tenorDays || tenorDays > curve.points.at(-1)!.tenorDays) throw new Error("Curve extrapolation is unsupported");
  const exact = curve.points.find(point => point.tenorDays === tenorDays);
  if (exact) return exact.value;
  const upperIndex = curve.points.findIndex(point => point.tenorDays > tenorDays);
  const lower = curve.points[upperIndex - 1]!, upper = curve.points[upperIndex]!;
  return lower.value + (upper.value - lower.value) * (tenorDays - lower.tenorDays) / (upper.tenorDays - lower.tenorDays);
}

/** All curves are invented. Only the energy anchor can come from an observed spot. */
export function mockCurves(asOf: string, oilSpot: number): RateCurve[] {
  day(asOf); finite(oilSpot, "oil spot anchor");
  const definitions: readonly [UnderlyingFamily, string, string, number, number][] = [
    ["agriculture", "Wheat forward · mock", "USD/tonne", 220, 0.06],
    ["energy", "Brent forward · mock", "USD/bbl", oilSpot, -0.025],
    ["bulk-resource", "Iron ore forward · mock", "USD/tonne", 105, -0.01],
    ["industrial-metal", "Copper forward · mock", "USD/tonne", 9000, 0.045],
    ["precious-metal", "Gold forward · mock", "USD/troy-oz", 2300, 0.035],
    ["fx", "EUR/USD forward · mock", "USD/EUR", 1.09, 0.015],
    ["equity", "Equity forward · mock", "USD/share", 100, 0.03],
  ];
  const tenors = [0, 30, 60, 90, 180, 270, 365];
  const curves: RateCurve[] = definitions.map(([family, label, unit, spot, carry]) => ({
    id: `mock:${family}:${asOf}`, asOf, family, label, unit, provenance: "synthetic",
    formula: `F(T)=S*exp(carry*T); S=${spot}, annual net carry=${carry}; invented parameters`,
    points: tenors.map(tenorDays => ({ tenorDays, value: spot * Math.exp(carry * tenorDays / 365) })),
  }));
  curves.push({ id: `mock:funding:${asOf}`, asOf, family: "funding", label: "USD funding · mock", unit: "annual-decimal",
    provenance: "synthetic", formula: "r(T)=0.04+0.004*T; continuous compounding, ACT/365",
    points: tenors.map(tenorDays => ({ tenorDays, value: 0.04 + 0.004 * tenorDays / 365 })) });
  curves.push({ id: `mock:volatility:${asOf}`, asOf, family: "volatility", label: "Oil volatility · mock", unit: "annual-volatility",
    provenance: "synthetic", formula: "sigma(T)=0.32-0.06*T; invented volatility term structure",
    points: tenors.map(tenorDays => ({ tenorDays, value: 0.32 - 0.06 * tenorDays / 365 })) });
  return curves;
}

/** Deterministic USD cash flows, ACT/365 and continuously compounded zero rates. */
export function presentValueUsd(cashflows: readonly { readonly tenorDays: number; readonly usd: number }[], discountCurve: RateCurve): number {
  return finite(cashflows.reduce((sum, flow) => sum + finite(flow.usd, "cash flow") *
    Math.exp(-interpolateCurve(discountCurve, flow.tenorDays, "annual-decimal") * flow.tenorDays / 365), 0), "present value");
}

/** Terminal payoff only; option pricing additionally needs a pricing model and premium. */
export function optionPayoff(kind: "call" | "put", underlyingPrice: number, strike: number, units: number): number {
  finite(underlyingPrice, "underlying price"); finite(strike, "strike"); nonnegative(units, "option units");
  return finite(Math.max(0, kind === "call" ? underlyingPrice - strike : strike - underlyingPrice) * units, "option payoff");
}
