# Causal risk control

Realizes REQ-15–REQ-18 within the experimental Product Definition. The decision
boundary accepts prior observations, actual previously confirmed holdings,
prior NAV, a strategy proposal, completed breach observations and supplied
policy. It has no execution-price or future-path argument.

## Step order

At a scheduled execution observation, first construct the decision using the
previous prefix. Then reveal that observation, value the old holding, accrue
funding and simulate the selected target. Record P&L and assess the resulting
holding for the next move. Outcome feedback is available to the next decision.
Closure uses an explicit known date; an absent closure date leaves the book
open. Array exhaustion alone creates no trading instruction.

## Model and policy separation

`pretrade_risk.ts` calculates historical joint price risk, independent stresses,
known-price gross notional, rebalancing costs and an explicit funding allowance.
The historical sample is supplied by the prefix. Insufficient samples are
unavailable, never a zero-risk estimate.

A conservative multiplier is `max(1, observedBreachRate / 0.05)`, capped at 3,
after at least 20 assessed moves within the preceding risk window. It acts on
the nonnegative expected-shortfall loss estimate. Before 20 assessments its
value is 1 with an explicit uncalibrated status. This is a testable feedback
heuristic, not a Bayesian posterior or a calibration guarantee. Only already
observed breaches enter it.

`overlays/replay_policy.ts` supplies a separate policy: expected-shortfall
budget, independent stress budget and gross-notional ceiling. Default PoC
inputs are $2,500, $5,000 and $150,000 respectively. These are experimental
parameters. They are neither universal market rules nor regulatory limits.
Known positive NAV additionally bounds acceptable loss and notional in this
unlevered proxy. Nonpositive NAV selects an exit.

The policy selects the largest fraction of the proposed exposure that fits
all supplied bounds, preserving leg ratios. Quantities round down to a common
one-barrel size grid. The model includes full rebalancing cost from the current
holding and three calendar days of funding on selected gross notional. Funding
duration is an explicit buffer, not knowledge of the next data gap. Limits are
compared with conservative ES plus these costs, and stress loss plus these
costs. Price-risk VaR/ES displayed elsewhere retains its gross-price basis.

For a fixed proposal ray, these measures are piecewise linear in scale. Cost
kinks occur where the target crosses an existing leg quantity. Intersect
feasible intervals over those segments and select the largest grid-aligned
scale. Do not assume that transaction costs are monotone from scale zero.

Flat proposals and required exits remain available. If no nonzero candidate
fits, select flat and record any unavoidable exit-cost exceedance; a failed
budget must not strand an existing risk position. Missing history likewise
prevents entering new risk. Unknown live fills remain outside historical
replay's complete-fill adapter and are demonstrated by the separate evidence
experiment.

## Trace and comparison

Each replay row preserves the raw strategy proposal and the pre-execution
decision: evidence date, prior NAV, current/selected exposure, assessment at
full/selected size, multiplier, selected scale, outcome and reason. Post-mark
risk is stored separately. A price gap can violate a bound after execution;
passing the earlier estimate does not promise a future loss cap.

Observation mode bypasses sizing and supplies a same-strategy counterfactual.
The UI displays controlled and counterfactual P&L through the cursor, and the
decision available before that cursor's execution. Strategy comparisons also
use cursor-limited outcomes. No final-window ranking feeds the controller.

The fixture remains a latest-vintage historical series. Computational tests
prove that later rows do not enter earlier decisions. They cannot reconstruct
the original publication timing or data revisions absent from that fixture.
