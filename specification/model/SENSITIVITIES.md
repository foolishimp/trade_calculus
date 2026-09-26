# Valuation sensitivities

Sensitivities are derived properties of a valuation model at a specified book,
market state and evidence cutoff. They are not independent observations or
return forecasts. Delta is the derivative with respect to an underlying price;
gamma is its second derivative. Vega, theta and rho concern volatility,
elapsed time and interest rates. Factor identity, units, tenor, bump convention
and model assumptions are necessary to aggregate or compare them.

For this PoC's fixed-quantity linear USD price terms,
`dV = qBrent * dBrent + qWTI * dWTI`. The two deltas are the signed barrel
quantities. The price Hessian is zero. For a common price move, delta is
`qBrent + qWTI`. For basis defined as Brent minus WTI while WTI is held fixed,
basis delta is `qBrent`. Another basis-move convention needs another binding.

The view recalculates these sensitivities for prior, primary, composed and
selected holdings at each replay observation. They explain changes in risk and
can supply future sensitivity constraints or evaluator inputs. The current
evaluator already values the same linear payoffs; displaying derivatives adds
no new selection objective or sensitivity tolerance.

Option vega, theta and rho remain unavailable because this price-only adapter
has no option valuation model. Funding costs remain their own accrual. For a
nonlinear extension, local Greeks approximate finite changes and must coexist
with joint repricing and stress scenarios; they do not replace the risk calculus.
