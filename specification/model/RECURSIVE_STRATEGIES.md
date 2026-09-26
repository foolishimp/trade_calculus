# Historical expectations and recursive strategies

A strategy proposes exposure for an objective. A hedge is a strategy whose
purpose is to improve the combined outcome of another strategy or book.
The same composition law applies to both. A hedge's expected standalone loss
does not disqualify it when its combined benefit is sufficient.
The objective belongs to the [homeostatic reference](HOMEOSTASIS.md): the
explicit definition of internal good against which both actions are assessed.

## Common representation

A strategy node owns its direct instrument quantities and may own child
strategies. Aggregate quantities equal direct quantities plus each child's
aggregate exactly once. Valuation and risk use the aggregate book, retaining
joint dependence. Parent totals are never added again to descendant totals.
Instruments retain identity, domain, quantity unit, valuation currency,
notional, quantity step and costs. Domain adapters provide compatible scenario
payoffs per instrument unit. The generic engine accepts common USD payoffs;
it does not infer currency conversion or derivative semantics from labels.

## Historical expectation

For aligned prior joint scenarios, calculate each aggregate holding's P&L.
The arithmetic mean is a declared estimate of next-observation gross P&L.
Deduct rebalancing cost from the actual current holdings and an explicit
three-day funding allowance for an estimated net result. Divide by prior
known positive NAV for a return on that capital. This estimate is conditional
on the historical-window model, not a fact about future returns.

Prices are not themselves return forecasts. Instruments map price changes to
USD payoffs, with contract multipliers and currency conversion supplied by
their adapter. Preserve aligned dates and dependence. Missing histories,
incompatible horizons or future evidence fail explicitly. No original data
release vintage is inferred from the downloaded observation archive.

## Gain algebra and objective

Define an action basis: primary-scale adjustments and hedge-instrument
quantity changes. All candidates use the same evidence cutoff, scenario set,
holding horizon and currency. For every candidate action `a` on current
planned book `B`, preserve the gain components before selection:

```text
deltaExpectedNet(a) = E[netPnL(B+a)] - E[netPnL(B)]
tailRiskReduction(a) = max(0,ES(B)) - max(0,ES(B+a))
deltaNotional(a) = notional(B+a) - notional(B)
deltaCosts(a) = costs(B+a) - costs(B)
decisionGain(a) = deltaExpectedNet(a) + lambda * tailRiskReduction(a)
```

`deltaExpectedNet` already includes the cost change; do not subtract it twice.
The action-indexed decision gains form the gain vector for this candidate
basis; the separately retained component vectors explain it. For finite lots,
absolute costs and tail ties, use actual candidate differences, not an assumed
smooth derivative. Gain is relative to the combined book, not standalone leg
profit. Gains cannot be added across alternative actions: interactions require
re-evaluation after composition. Raw quantities across units cannot be ranked
by an unnormalised per-unit gradient.

The supplied objective coefficient `lambda` expresses a return/risk preference.
Historical returns estimate economic inputs; they do not determine that
preference. This experimental objective is separate from the core gain
components and resource feasibility. Primary quantities can be reduced to
zero for uncommitted proposals. The current minimum primary scale constrains
planning only; subsequent risk sizing may reduce the package further. A future
adapter for binding commercial obligations must preserve those obligations
through every selection stage and represent separately the actions available
to hedge, transfer or discharge them.

## Hedge calculation and bounded recursion

For residual aggregate payoff X and one-unit candidate hedge payoff Y, the
unconstrained minimum-variance increment is `h = -Cov(X,Y) / Var(Y)`.
This is a candidate generator, not an assertion of optimal economic utility.
Degenerate hedge variance supplies no identified hedge quantity.

For the first numerical model, consider the rounded full and half increments,
respect candidate quantity bounds, and compare aggregate results against
adding no hedge. The supplied experimental objective is:

`score = estimatedNetPnl - riskAversion * max(0, priceExpectedShortfall)`

Homeostatic deviation improvement precedes the preference score above.
Risk aversion is an explicit dimensionless input. Hedge candidates must reduce
sampled portfolio variance and improve the combined objective after costs.
Compare them with reducing/restoring the primary proposal to half/full size
and removing it, within its supplied feasible scale range. Primary changes
have a distinct action identity; they are not relabelled as same-instrument
hedges. Independent tail/stress/notional
limits still apply to the composed proposal through the existing policy.

After accepting a hedge, evaluate the residual aggregate with the same
calculation. Add a child for the next improving adjustment and continue until no
eligible improvement exists, a book repeats, or the supplied depth bound is
reached. This is bounded greedy search over supplied instruments, not global
portfolio optimization or discovery of arbitrary executable instruments.
All planning occurs on one evidence prefix before any simulated execution.

## Domain and economic boundary

The first historical binding uses Brent and WTI spot-reference exposures.
Their quantities are barrels of synthetic P&L exposure, not futures contracts.
The generic calculation also accepts independent domain adapters such as
freight, FX or funding when compatible data and payoff semantics are supplied.
Tests may use synthetic cross-domain payoffs; they cannot qualify real-world
hedging performance in those domains.

Hedging offsets selected exposures and leaves residual risks. Cargo failure,
unknown fills, basis breaks, liquidity and margin can persist or increase.
The independent stress and evidence models retain those distinctions. The
historical price adapter does not model the shipping obligations discussed in
the domain definition.
