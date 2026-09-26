# Strategy, valuation, P&L and risk

## Strategy

An objective defines the desired outcome. A strategy defines why a feasible
action might achieve it. Every strategy binds an objective, thesis, economic
mechanism or predictive relationship, evidence references, horizon, supported
instrument families, required capabilities, entry/exit conditions and
invalidation conditions.

A strategy consumes observations and estimates while choosing controllable
actions. Candidate actions include no trade, resize, hedge, close, wait and
seek evidence. A profitable individual trade does not validate a strategy.
Evaluation compares predictions with outcomes, costs, calibration and the
counterfactual or benchmark appropriate to the thesis.

## Valuation bases and P&L

Keep market valuation, executable economics and predictive forecasts explicit.
Pricing-model expectations and real-world predictive probabilities serve
different purposes. Rates and curves retain currency, tenor, index, location,
quality, fixing window and source. Missing a required input is a result with
an explanation.

The economic identity is:

```text
economicPnL = NAV_end - NAV_start - netExternalCapitalContributions
```

NAV includes cash, collateral assets, inventory, receivables, obligations and
remaining derivative value on a consistent basis. Internal collateral
transfers do not change wealth. Financing interest and fees are costs.
Realized/unrealized classification belongs to an explicit reporting basis;
its bridge to economic P&L remains visible.

For settled futures, accumulate signed settlement cash and value any remaining
unsettled interval once. Do not add a second inception-to-date mark gain to
already settled cash. Attribution components and an explicit residual sum to
total P&L. Valuation time, knowledge cutoff, market snapshot, book and model
versions accompany analytical results.

## Risk calculus

For existing book `B`, action `a`, uncertain current state `x` and future path
`w`:

```text
outcome(B,a,x,w) = change in economic wealth after costs
marginalOutcome(a,x,w) = outcome(B,a,x,w) - outcome(B,noAction,x,w)
loss(B,a,x,w) = -outcome(B,a,x,w)
```

Risk evaluates the combined book with joint scenarios. It covers losses,
concentrations, sensitivities, basis risk, execution states and cash timing.
The isolated physical/futures comparator's existing book is explicitly empty;
it cannot qualify a trade's interaction with an arbitrary portfolio. The
historical recursive model evaluates combined linear USD exposure and transition
costs from actual prior holdings. Its narrower payoff representation does not
establish a general contractual portfolio lifecycle.

With a supplied finite predictive distribution:

```text
expectedPnL = sum_s probability_s * pnl_s
ES_alpha = average loss in the worst (1-alpha) probability mass
```

Expected shortfall allocates fractional mass at the tail boundary. It can be
negative when every outcome is profitable. A separate worst-loss metric is
floored at zero. Named stresses and current-state bounds remain useful even
when probabilities are not defensible. Scenario extrema bound only the
represented set; they are not guarantees about all possible outcomes.

Peak variation-margin reserve is the greatest cumulative settlement cash
deficit along the supplied path. Daily outflows, future physical resale gains
and available cash have different timing. Funding adequacy requires resources
when payment is due.

## Decision loop and overlays

```text
evidence -> epistemic state -> strategy candidates -> valued outcomes
         -> joint risk -> objective comparison -> conditional recommendation
         -> externally supplied action/outcome evidence -> reconciliation
         -> P&L, forecast evaluation and model revision
```

The physical/futures comparator maximizes expected net P&L among supplied candidates
that fit available margin resources and any separately supplied overlay
assessments. It includes no trade and prefers it on an exact tie. It defers
when its context expires or when no candidate satisfies the supplied
conditions; unresolved execution returns `seek-evidence` before adding trades.
This is a finite comparison, not a global optimum or a live execution policy.

The historical strategy controller uses a supplied
[homeostatic reference](HOMEOSTASIS.md). It compares deviations from the desired
region before applying a return/risk preference. Its
[gain vector](RECURSIVE_STRATEGIES.md) makes primary resizing and hedge changes
comparable on the combined book. Historical evidence estimates outcomes;
the reference supplies their desirability. After each adjustment, the controller
recomputes gains. Final risk sizing receives the composed proposal, and the
selected exposure receives its own forecast and reference comparison.

Governance overlays own their rule identity, applicability and decision. The
sample loss-tolerance overlay compares the already calculated worst loss with
a caller-selected number. Removing or changing it does not change risk or
P&L. Reporting overlays likewise preserve the economic result while choosing
their own presentation.
