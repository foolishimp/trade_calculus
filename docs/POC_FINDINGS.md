# PoC findings

Date: 2026-09-26
Status: PoC implemented and locally verified; analytical principles remain
subject to evaluation. Full STDO 2.5.1 adoption is deferred.

## Delivered experiment

The project contains the analytical definition, a typed numerical kernel and
strategy/risk replay engine, a local trader dashboard, and a mock rates service.
Daily oil observations supply the historical experiment. Synthetic curves and
the physical/futures evidence experiment have separate provenance.

The evaluation target is the calculus, representation and interfaces. Lawful
deal models, qualified evidence, economic identities, joint risk, tolerances
and inspectable gains govern the represented model. The evaluator is a simple
consumer used to exercise those interfaces. Optimizer development and strategy
admission are separate undertakings. Established oil strategy archetypes are
supplied inputs; the executable rules are illustrative bindings.

## Principles exercised

| Principle | Observation and falsifier |
|---|---|
| Domain and instrument meaning constrain valid operations. | Unit mismatch and fractional futures lots are rejected; a futures holding does not supply storage. |
| Evidence changes justified risk. | Unknown physical fill widens the reduced package's represented loss from $130,000 to $530,000 and changes the result to `seek-evidence`. |
| Terminal economics and cash timing differ. | A 100-lot short hedge following 80 → 90 → 74 earns $600,000 settlement cash but requires $1,000,000 interim reserve. |
| Joint moves and basis stresses answer different questions. | Equal long/short reference exposures offset parallel moves; a $5 basis break creates $5,000 loss per 1,000-barrel leg in the adverse direction. |
| A risk forecast can fail without retrospective rewriting. | A future tail shock breaches the unchanged prior estimate; altered future data leaves earlier signals, holdings and risk unchanged. |
| Strategy and risk model parameters are distinct. | Changing risk lookback preserves raw strategy proposals, but can change controlled exposure and P&L. Observation mode preserves economic outcomes. |
| Risk drives action before observing the outcome. | Tightening a stress allowance resizes a nonzero proposal; missing history blocks entry; no feasible positive size selects flat. |
| Surprise precedes adaptation. | An unseen $51/barrel fall causes $25,500 loss on 500 barrels; the next decision reduces to 49 barrels after the shock enters the sample. |
| Economic results reconcile. | At every replay observation, realized plus unrealized P&L equals cumulative net P&L; gross less execution and funding costs equals net. |
| Bayesian belief is separate from execution fact. | Likelihood evidence revises probabilities but leaves possible order-fill bounds unchanged; exact replay is idempotent. |
| Governance can remain an overlay. | A supplied loss tolerance changes eligibility while preserving valuation and risk outputs. |
| Strategy composition preserves joint meaning. | Synthetic oil, freight and FX payoff adapters compose through common USD scenarios; nested direct quantities aggregate once and cyclic/duplicate identities fail. |
| Hedge benefit belongs to the combined book. | A negative-mean hedge can reduce joint loss enough to improve the supplied objective; excessive costs prevent the same adjustment. |
| Internal good and environmental estimate are distinct. | Changing the supplied reference changes deviations and selection without changing payoff forecasts; unavailable history remains unavailable. |
| Action gain is conditional on the current composition. | Primary reduction competes with hedge increments; recursive steps recompute gains on the residual book. |

These checks establish the specified computational behavior within the
represented model. They do not establish that its forecast distribution is
adequate for all market regimes.

## Observation-only historical baseline

Dataset: 733 paired daily Brent/WTI spot observations, 2023-01-03 through
2025-12-31. Parameters: 20-observation strategy lookback, independent
60-change risk window, 1,000 barrels per leg, $0.05/barrel execution cost,
4% annual gross-notional funding charge, $1,000,000 initial reporting capital.
VaR confidence: 95%; loss basis: next paired observation's gross holding P&L.
This is the initial T-001 experiment, reproduced using the explicit
`observe` mode and a scheduled final close. Risk is measured but does not
select exposure in this baseline.

| Position generator | VaR breaches / assessed moves | Observed breach frequency | Net economic P&L |
|---|---:|---:|---:|
| Brent momentum | 42 / 672 | 6.25% | -$59,446.97 |
| Brent–WTI reversion | 12 / 279 | 4.30% | -$8,023.80 |
| Brent buy-and-hold | 43 / 672 | 6.40% | -$23,320.92 |
| No trade | 0 / 0 | Not applicable | $0.00 |

Breach frequency is evidence for subsequent model evaluation. A small finite
window, dependent observations, selected positions and regime changes affect
its interpretation. No coverage-independence test, out-of-sample qualification
or general adequacy conclusion is claimed. Strategy profitability is not the
pass criterion; the negative outcomes are retained.

## Risk-driven historical replay

T-002 adds causal exposure selection. The same dataset and strategy inputs use
the default experimental policy: $2,500 expected-shortfall allowance, $5,000
independent-stress allowance and $150,000 gross notional. Rebalancing cost and
three days of estimated funding enter the loss allowances. Historical ES also
receives the declared past-breach multiplier. None of those parameters is
optimized against future P&L.

| Position generator | Net P&L with control | Maximum drawdown with control | Maximum drawdown, observe only | Nonzero controlled barrels per leg |
|---|---:|---:|---:|---:|
| Brent momentum | -$22,668.48 | $27,116.76 | $63,995.24 | 234–499 |
| Brent–WTI reversion | -$6,079.06 | $13,914.35 | $15,057.33 | 338–992 |
| Brent buy-and-hold | -$13,412.59 | $20,085.55 | $43,944.22 | 177–499 |
| No trade | $0.00 | $0.00 | $0.00 | 0 |

The policy changes actual positions and economic outcomes. These dollar-loss
reductions include the effects of smaller exposure and evidence warm-up;
they do not isolate forecast quality or establish a trading edge. No
profitability or general risk-model adequacy conclusion follows.

Raw price-risk VaR breaches remain 42/671, 12/279 and 43/671 for momentum,
basis reversion and buy-and-hold. Resizing linear exposure scales both its
loss and VaR, so these breach counts need not improve. The maximum observed
feedback multipliers are approximately 2.67, 3 and 3 respectively. This
feedback heuristic is not proof of calibration.

The controller has no future-price or execution-mark input. Tests replace
the current execution mark and later prices, preserving the already selected
decision. Prefix replay with the same declared closure date reproduces
identical records. Data exhaustion alone no longer creates a close order.
That establishes computational causality on the supplied vintage; original
release timing and revision history remain absent.

The dashboard exposes each proposal, selected size, evidence cutoff, prior
NAV, cost-inclusive risk estimates, effective bounds, feedback and reason.
Its comparator uses the same strategy in observation mode. Charts and all
strategy cards stop at the cursor; the initial cursor depends only on the
configured warm-up length.

## Homeostatic and recursive composition interfaces

T-003 adds a generic strategy tree, aligned USD payoff forecasts, explicit
reference/deviation records and action-indexed component gains. The bounded
evaluator compares primary resizing with covariance-generated hedge quantities.
All candidates share the prior evidence boundary and actual holdings for
transition costs. Final risk sizing receives the composed proposal; forecasts
and deviation are recalculated for the selected quantities.

On the same momentum dataset and T-002 risk bounds, the experimental reference
uses a zero expected-net floor, ES preference coefficient 0.1 and recursion
depth 2. These are supplied inputs, not fitted success criteria.

| Planning constraint | Net P&L | Maximum drawdown | Accepted hedge steps | Accepted primary resize steps |
|---|---:|---:|---:|---:|
| Primary can reduce to zero | $0.00 | $0.00 | 0 | 672 |
| Retain primary during planning | -$34,331.81 | $36,664.91 | 735 | 0 |

The first case chooses flat throughout this sample. The second produces
hedges but loses more than the T-002 momentum result. These outcomes show
which actions the supplied reference and candidate set select; they do not
qualify either the forecast model or an optimizer. Accepted steps describe
planning decisions, not a count of market trades. The primary minimum applies
only during planning; final risk sizing still scales the composed package.

At the first risk-ready decision, evidence through 2023-03-30 supplies a
1,000-barrel Brent proposal. With primary retained, a -964-barrel WTI hedge
reduces estimated tail risk by $1,762.40 while reducing expected net P&L by
$30.78. Normalized reference deviation falls from 1.526 to 0.086. Final sizing
selects 971 Brent and approximately -936.04 WTI barrels, with deviation 0.054.
The displayed final state remains outside the reference because its expected
net result is below the supplied floor. The system does not redefine that
floor to declare success. Allowing primary reduction instead selects flat.

The historical adapter varies estimated joint relationships over a fixed
Brent/WTI instrument set. Synthetic cross-domain tests exercise supplied payoff
interfaces. Discovery of new instruments, physical logistics topology and a
general market-topology service remain outside this slice.

This demonstrates the selected model laws and interface behavior in bounded
cases: a trading representation governed by calculus. It is not a formal proof
over every deal model. Strategy admission retains a separate governing owner
outside the PoC; analytical selection does not confer that admission.

## Explorable calculus demonstration

T-004 turns the replay into a linked explanation of the model. Each observation
projects prior evidence, proposal, composition, selection, market reveal,
simulated execution and economic outcome. Events carry named rule references,
actual quantities, gain and hedge-calculation substitutions, assumptions and
links to detailed panels. Search, category filters and pagination remain
bounded by the cursor; inspecting an older event rewinds every result panel.

The source definition in `CALCULUS_RULES.md` separates model laws, supplied
oil bindings, evaluator choices and demo parameters. The code and on-page
explanations realize those definitions. The event log is a derived read model,
not an admitted or persistent event store. Strategy admission stays outside
the PoC and the existing evaluator is unchanged.

The sensitivity view differentiates the fixed-quantity linear oil price terms.
It compares prior, primary, composed and selected exposure with explicit
reference and parallel/basis conventions. On 2023-03-31 the retained-primary
example selects 971 Brent and -936.044 WTI barrels: a common $1/bbl increase
produces $34.956 gross price P&L, while a $1 Brent-only increase produces $971.
The shock explorer changes neither the historical replay nor its decisions.
Price gamma is zero for this linear model. Vega, theta and rho are unavailable;
funding cost is not presented as option theta.

Stepping to 2023-04-03 explains $2,009.89 gross P&L on the prior holding,
$2.01 rebalance cost and $48.57 funding, yielding $1,959.31 net for that
observation (display-rounded). The new selected exposure does not receive
the preceding price move's P&L. Its expected return remains a forecast for its
next holding interval.

## Local verification

- `npm run check`: TypeScript checks and 54 semantic/numerical/service tests pass.
- `npm run demo`: worked physical/futures values, uncertainty and margin paths reproduce.
- `npm run replay`: control and observation modes reproduce the risk counts,
  P&L and drawdowns above from local data.
- `npm run strategy`: reference-dependent composition, gain vectors and the
  two recursive historical outcomes above reproduce from local data.
- Sizing matches an independently enumerated whole-barrel oracle across long,
  short and paired proposals, existing holdings, costs and supplied budgets.
- Future-price replacement, prefix replay, unseen shocks, insufficient history,
  nonpositive NAV and unavoidable exit costs exercise causal decision branches.
- Browser: initial chart rendering; strategy, quantity and independent risk-window
  changes; curve-family switching; reset/playback; and uncertain/final fill toggle verified.
- Risk-control browser check with adaptive composition off: first momentum size is 496 barrels;
  a $1,000 stress budget selects 99; observation mode selects 1,000.
  Resetting shows $0 and the first date for every strategy card.
- Recursive browser check: default reference selects flat; retaining the
  primary shows the -964 WTI hedge, component gains, final 971 / -936.04
  exposure and an explicit outside-reference result. Turning composition off
  restores 496 / 0. Resetting reports unavailable estimates and awaiting evidence.
- The three P&L series and strategy cards remain cursor-limited. The new
  reference/gain panel has no horizontal overflow at the checked desktop width.
- Browser error/warning log was empty during the interaction check.
- Historical raw-source hash matches its recorded metadata.
- New explanation checks preserve pre-decision text under a changed execution
  mark, reproduce prefix projections and reconcile old-holding P&L, fills and
  closure. Sensitivity calculations match independent stress outputs and
  finite price differences. Unsupported Greeks remain unavailable.
- Demo browser: hedged preset, observation stepping, filtered rule search,
  zero results for future dates, event paging and older-event inspection
  verified. Linked rules expand in place and return to the related panels.
  Reset removes later events; chronological playback advances and pauses.
- The hypothetical Brent-only move changes the sensitivity outcome to $971
  while actual P&L and quantities remain unchanged. The desktop event and
  sensitivity panels are visually checked without page overflow.

## Remaining model boundaries

Historical replay uses complete simulated fills at subsequent spot marks.
The fill-uncertainty/margin experiment is separate; a historical execution
adapter combining those two experiments remains future work. The archive has
the downloaded observation vintage, without original publication history.

The historical risk model covers linear price P&L. Credit, liquidity, physical
performance, nonlinear payoffs, futures rolling and dynamic execution are
outside that replay. Other asset families expose model/capability definitions
and mock curves, not complete production pricers. IEEE-754 amounts are
analytical values, not a currency-rounding posting ledger.

The next decision is whether the demonstrated distinctions and failure
surfaces provide a useful foundation, and which gaps to pursue. Formal STDO
2.5.1 construction/governance adoption follows that evaluation.
