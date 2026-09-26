# Recursive hedge calculation

Realizes REQ-19–REQ-24 and
[recursive strategies](../specification/model/RECURSIVE_STRATEGIES.md).

`strategy_model.ts` owns a generic strategy tree, instrument descriptors,
aligned USD scenario payoffs and aggregate forecast. It validates identity,
dates, currency, finite values, tree cycles and duplicate node identities.
Forecasts report gross historical mean, net estimate, return on known capital,
sample variance, ES, notional, costs and sample provenance.

`hedging.ts` calculates minimum-variance increments against the combined
portfolio, then evaluates rounded full/half candidates using that same
forecast function. Primary-scale candidates use the same gain calculation.
`strategyGain` retains expected net gain, ES reduction, variance change,
cost change and notional change, then applies a supplied objective coefficient
to expose each candidate's decision gain. The candidate-indexed vector is
paired with a supplied homeostatic reference: a return floor, tail/stress and
notional ceilings. Lower normalized deviation ranks first; preference gain
breaks ties. The core preserves both components instead of hiding a weighting.
The vector is recomputed after every accepted action. A strictly improving step becomes a child of the
previous node. Selection retains candidate alternatives and before/after
forecasts. Quantity caps apply to aggregate hedge holdings, not separately to
each recursive addition. Each accepted leaf is counted once. Primary changes
are explicit resize actions within a supplied planning scale range. This range
does not constrain subsequent risk-policy sizing or establish a binding physical
obligation. Search depth is at most six; repeated
aggregate books stop the search. The default experimental objective coefficient
is 0.1 and default maximum depth is 2. Neither value is fitted to later outcomes.

`oil_hedging.ts` adapts the trailing paired oil observations to joint absolute
price changes, exposing Brent/WTI per-barrel USD payoffs. Inputs contain no next
execution price. It exposes only WTI as a hedge candidate for a Brent-only
primary proposal. A primary proposal already containing WTI has no additional
candidate in this two-series adapter. Missing history is an unavailable result.

Replay preserves the raw signal. Optional historical hedging composes a
proposal from it before the existing risk-control policy selects final size.
The final selected quantities receive their own prior-evidence return estimate;
this differs from the unscaled composed proposal's forecast. The observation
counterfactual bypasses sizing while preserving the configured hedge engine.
A separate unhedged counterfactual disables hedge composition while preserving
the sizing policy. Neither counterfactual's later performance enters planning.

The browser shows primary/composed/final quantities, estimated selected return,
hedge quantities, residual risk, costs, recursion trace and no-hedge comparison only
through its cursor. This is a historical linear-payoff research model; no
market execution or futures settlement is inferred from the spot adapter.

## Numerical comparison profile

The current realization uses IEEE-754 numbers. Candidate books are compared
at nine decimal quantity places for repeat detection. Unit payoff variance at
or below `1e-12` supplies no covariance hedge. A hedge requires variance
reduction above `1e-8`; deviation improvement uses `1e-10`, with preference
gain above `1e-7` for tied deviation. Instrument-step compatibility uses `1e-8`.
These are declared finite-number comparison tolerances for this realization,
not additional economic objectives. Exact preference ties use candidate identity
order. A different numerical representation must preserve the specified laws
and declare its own comparison profile.
