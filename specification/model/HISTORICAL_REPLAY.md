# Daily historical replay and risk evaluation

## Purpose and grain

The historical experiment exercises the calculus and its representation using
supplied strategy examples. Its inputs are paired daily Brent and WTI spot observations
in USD/barrel, from 2023-01-03 through 2025-12-31. The fixture contains 733
dates on which both prices are present. Missing paired dates are excluded;
values are not forward filled. [Data provenance](../../data/README.md) records
the source and exact downloaded bytes.

The archive contains the downloaded series vintage. It does not contain the
original publication-time vintages or market-executable prices. Historical
forward curves are absent. The mock rates service labels its generated
forward, funding and volatility term structures as synthetic.

## Replay calculus

At each available observation `t`:

1. Generate a strategy proposal from observations through `t-1`.
2. Assess and select exposure from that same prefix, existing holdings, prior
   known NAV and already completed risk outcomes. Record the decision before
   revealing `t`'s prices or P&L.
3. Reveal `t`, mark the previous holding, and accrue funding on preceding gross
   notional over actual elapsed days.
4. Simulate rebalancing to the selected target at `t`, charging each changed leg.
5. Reconcile realized/unrealized P&L and record the resulting position.
6. Estimate risk for that resulting position from evidence through `t`.
7. At the next observation, compare the preceding risk forecast with its
   corresponding holding outcome.

An explicitly supplied liquidation date closes all positions and charges
liquidation cost at the first available observation on or after that date.
The dashboard and CLI supply the selected window's end date. With no date,
exhausting the data creates no closure instruction. A future price cannot
affect an earlier signal, risk decision, fill or forecast; changing even the
current execution mark cannot alter that observation's pre-execution decision.

Brent momentum, Brent–WTI spread reversion, buy-and-hold and no-trade are
position generators. Strategy lookback is independent of risk lookback.
The default strategy window is 20 observations; the default risk window is
60 paired changes. Changing the risk window can change controlled exposure
while preserving the strategy's raw proposals. Parameters are supplied inputs, without an optimizer or a
claim that these strategies are economically effective.
The exact illustrative bindings and their distinction from model law are in
[calculus rules](CALCULUS_RULES.md).

## Price-risk calculus

For current exposures `q_B` and `q_W`, replay each historical **joint** price
change as a possible next-observation move:

```text
scenarioPnL_i = q_B * deltaBrent_i + q_W * deltaWTI_i
scenarioLoss_i = -scenarioPnL_i
```

The finite sample has equal weights. VaR uses the empirical loss quantile;
expected shortfall integrates the worst `(1-alpha)` probability mass with
fractional allocation at the boundary. The displayed confidence level is
95%. Insufficient history produces an unavailable forecast. Zero price risk
for a flat holding remains distinct from missing history.

The loss basis is **gross price P&L**, conditional on the current fixed
holding. Funding and execution costs remain in economic P&L but are excluded
from this specific price-risk forecast. The next observed gross holding loss
is compared with the **preceding** VaR. Breach counts include only assessed
non-flat holdings. The horizon is the next paired observation, which can span
more than one calendar day over data gaps.

The estimated distribution covers its sample and model assumptions. It does
not guarantee coverage of a new tail event or structural basis break. Equal
historical moves can make an equal long/short pair appear perfectly hedged.
Separate `±$5/bbl` basis shocks expose the consequential alternative. Parallel
`±$10/bbl` shocks test broad benchmark exposure. Stress shocks have no invented
probabilities.

## Risk drives exposure

The pre-trade engine prices the proposed exposure using only prior history.
The separate experimental policy selects a scale from zero to the proposed
size, preserving leg ratios, against cost-inclusive expected shortfall,
independent stress loss and known-price gross notional. Positive prior NAV
also bounds those allowances. Missing history blocks new exposure;
nonpositive known NAV or an infeasible nonzero size selects an exit. Closing
cost can be unavoidable even when it exceeds a supplied allowance.

The default policy inputs are $2,500 tail loss, $5,000 stress loss and $150,000
gross notional. The model adds full rebalancing cost and a three-calendar-day
funding allowance. Future execution marks or gaps can exceed these estimates;
the bounds are decision criteria, not promises about realized losses.

Past VaR breaches within the trailing risk window drive an explicit heuristic
multiplier on nonnegative ES: `max(1, observed frequency / 0.05)`, capped at 3,
after at least 20 assessed moves. Before that threshold the multiplier is 1
with insufficient calibration evidence disclosed. This does not claim a
Bayesian posterior or empirically calibrated coverage. Post-mark gross-price
VaR/ES remains separate from cost-inclusive pre-trade sizing risk.

The decision trace preserves the evidence cutoff, original proposal,
selected size, prior NAV, assessments, feedback multiplier, policy and reason.
An unseen shock can cause loss at an already selected size. Only subsequent
decisions can incorporate that shock. See the
[causal control design](../../design/CAUSAL_RISK_CONTROL.md).

Observation mode bypasses risk selection and supplies a same-strategy
counterfactual. Comparing the two runs shows the effect of the complete policy,
including its evidence warm-up and exposure reduction. Lower dollar losses
from taking less exposure alone do not establish better forecasts or strategy
skill. The dashboard compares both runs only through its current cursor.

## Distinct funding and knowledge experiment

The synthetic physical/futures example in [OIL](../domains/OIL.md) exercises
path-dependent variation margin and incomplete execution knowledge. It uses
explicit futures lots and settlement cash. Historical spot-reference replay
does not silently acquire those futures settlement mechanics.

The browser places both experiments on the same dashboard with separate
labels. The generic risk interfaces are reusable; each result retains the
meaning, evidence and assumptions of its experiment.

## Evaluation boundary

Meaningful tests include causality, attribution reconciliation, exposure
scaling, joint-move preservation, independent stresses, tail breaches,
insufficient evidence, missing fills and cash timing. Profitable P&L is not a
test oracle. Coverage/calibration across regimes is an empirical model question
whose findings can require changing the risk model.

This PoC excludes actual futures rolls, physical performance, execution depth,
borrow availability, market impact, release-vintage reconstruction and
out-of-sample strategy qualification. Those limitations bound what its results
can establish.
