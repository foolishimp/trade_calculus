# Requirements and realization coverage

These requirements qualify the first kernel. The broader model definitions
retain their stated boundaries; a family descriptor is not a pricing engine.

| ID | Obligation | Realization | Falsifier |
|---|---|---|---|
| REQ-01 | Separate underlying and instrument families; require actual capabilities for a strategy binding. | `src/families.ts` | S-01 |
| REQ-02 | Preserve units and reject incompatible, unsupported or non-finite operations. | `src/quantities.ts` | S-02 |
| REQ-03 | Project order evidence at valuation time and knowledge cutoff; retain unresolved fills and reject conflicting reports. | `src/epistemic.ts` | S-03, S-04 |
| REQ-04 | Condition finite beliefs with explicit likelihoods; deduplicate evidence, reject incompatible evidence and retain the model identity. | `src/epistemic.ts` | S-05 |
| REQ-05 | Value physical/futures packages with explicit multiplier, costs, settlement cash and attribution. | `src/oil.ts` | S-06 |
| REQ-06 | Calculate expected P&L, fractional-tail expected shortfall, represented loss and peak cumulative margin; expose partial-execution risk. | `src/risk.ts`, `src/oil.ts` | S-07, S-08 |
| REQ-07 | Compare candidates including no trade; expose objective, context, resource exclusions, conditions and unresolved knowledge. | `src/decision.ts` | S-09 |
| REQ-08 | Keep governance assessment separate; applying a supplied overlay preserves economic results. | `src/overlays/loss_tolerance.ts` | S-10 |
| REQ-09 | Make the worked example reproducible with model, market, book, time and evidence identities. | `examples/oil_basis.ts` | S-06, S-09 |
| REQ-10 | Close the analytical feedback loop by reconciling evidence, attributing a supplied outcome and scoring the original forecast. | `src/epistemic.ts`, `examples/oil_basis.ts` | S-04, S-11 |
| REQ-11 | Replay supplied observations without future rows in strategy inputs; report timing, costs, positions, attribution and drawdown. | `src/replay.ts` | S-12 |
| REQ-12 | Publish a mock rates service with provenance, as-of selection and explicit synthetic family curves. | `src/rates.ts`, `server.ts` | S-13 |
| REQ-13 | Show price history, curves, P&L, positions, strategy settings and evidence effects in a usable local dashboard. | `ui/`, `server.ts` | S-14 |
| REQ-14 | Estimate rolling joint historical price VaR/ES without future observations; compare prior risk with the next gross holding outcome and expose independent basis stresses. | `src/historical_risk.ts`, `src/replay.ts`, `ui/` | S-15 |
| REQ-15 | Assess and select a strategy's target before observing its execution price, using prior observations, holding, NAV and completed forecast outcomes only. | `src/pretrade_risk.ts`, `src/overlays/replay_policy.ts`, `src/replay.ts` | S-16 |
| REQ-16 | Apply explicit experimental loss/notional budgets to accept, resize or reject exposure; insufficient history blocks entry; preserve risk-reducing exits. | `src/overlays/replay_policy.ts` | S-17 |
| REQ-17 | Feed already observed forecast breaches into a declared conservative model allowance; expose the heuristic and evidence used. | `src/pretrade_risk.ts` | S-18 |
| REQ-18 | Preserve a trace of proposed/selected exposure and compare control versus observation modes using the same strategy/data; display cursor-limited outcomes. | `src/replay.ts`, `server.ts`, `ui/` | S-19 |
| REQ-19 | Estimate joint portfolio expected P&L, net return on known capital, variance and tail loss from explicitly aligned prior payoff scenarios with units and provenance. | `src/strategy_model.ts` | S-20 |
| REQ-20 | Compose primary and hedge strategies recursively, aggregating each direct leg once and rejecting cyclic or duplicate identities. | `src/strategy_model.ts`, `src/hedging.ts` | S-21 |
| REQ-21 | Calculate covariance-based hedge increments against residual book risk; compare combined after-cost benefit, retain no hedge and bound recursion. | `src/hedging.ts` | S-22 |
| REQ-22 | Integrate causal historical hedge composition and selected-position expected returns into replay and dashboard, retaining raw signals and an unhedged comparator. | `src/oil_hedging.ts`, `src/replay.ts`, `server.ts`, `ui/` | S-23 |
| REQ-23 | Establish an action-indexed gain vector over primary and hedge adjustments, retaining expected net gain, joint risk reduction and cost/resource effects separately from the supplied objective; recompute after each action. | `src/strategy_model.ts`, `src/hedging.ts` | S-24 |
| REQ-24 | Keep internal-good references, estimated state, normalized deviation and action gains explicit; preserve the reference across recursive decisions and distinguish unavailable evidence from a healthy state. | `src/strategy_model.ts`, `src/hedging.ts`, `ui/` | S-25 |
| REQ-25 | Project a causal explanation of prior evidence, strategy composition, selection, revealed market move, simulated fills and outcome from existing replay records; use actual values and link rules to details. | `ui/replay-explainer.js`, `ui/` | S-26 |
| REQ-26 | Support a cursor-bounded searchable/filterable event log, observation stepping and linked inspection that synchronizes the dashboard without admitting strategies or changing evaluation. | `ui/`, `server.ts` | S-27 |
| REQ-27 | Expose model-bound, dated linear oil price sensitivities for prior, primary, composed and selected holdings; preserve factor conventions and report unsupported option sensitivities explicitly. | `src/linear_sensitivities.js`, `ui/` | S-28 |

General-purpose book/event storage, arbitrary correction chains, transport and
refining optimization, options, fixing calendars, cross-currency discounting,
nonlinear/multi-currency portfolio aggregation and live execution are extension requirements. This
kernel reports its empty initial book, linear cost, finite-scenario and
authoritative-report assumptions; it does not represent those extensions as
implemented. Tests cover the declared implemented requirements only.
