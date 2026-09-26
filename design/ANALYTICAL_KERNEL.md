# Analytical kernel design

This design, [causal risk control](CAUSAL_RISK_CONTROL.md) and
[recursive hedging](RECURSIVE_HEDGING.md) and
[explorable demo](EXPLORABLE_DEMO.md) realize REQ-01–REQ-27 under the
experimental Product Definition. They select pure
typed functions and immutable-by-convention input/output records. Domain
analysis has no network, clock, filesystem or execution effects. The example
provides a deterministic clock, synthetic observations and output formatting.

| Module | Function boundary |
|---|---|
| `quantities.ts` | Units, finite quantities, compatible addition/scaling and price multiplication |
| `families.ts` | Family/instrument taxonomy and explicit capability binding |
| `epistemic.ts` | As-of cumulative order projection, finite Bayesian conditioning and forecast score |
| `oil.ts` | Contract/quantity validation, futures settlement paths and physical/futures P&L |
| `risk.ts` | Discrete distributions, expected shortfall and execution-state envelope |
| `decision.ts` | Context/resource checks, supplied overlay results and finite candidate comparison |
| `overlays/loss_tolerance.ts` | Independently identified example loss-tolerance predicate |
| `examples/oil_basis.ts` | Compose functions into a reproducible analysis/reconciliation loop |
| `rates.ts` | Historical observation lookup, synthetic family curves, interpolation, discounting and payoff |
| `replay.ts` | Prior-observation strategy signals, simulated rebalancing, funding and P&L |
| `historical_risk.ts` | Joint historical price VaR/ES and independent shocks |
| `pretrade_risk.ts` | Prior-evidence assessment, completed-breach allowance and costs at proposed scales |
| `overlays/replay_policy.ts` | Separate loss/notional budgets and feasible exposure selection |
| `strategy_model.ts` | Strategy aggregation, joint USD forecasts, homeostatic deviation and component gains |
| `hedging.ts` | Bounded recursive comparison of primary resizing and residual covariance hedges |
| `oil_hedging.ts` | Historical oil payoff adapter, supplied reference and selected-exposure forecast |
| `linear_sensitivities.js` | Exact derivatives of the specified fixed-quantity linear price terms |
| `adapters/local_data.ts` | Load the local historical fixture with its provenance |
| `server.ts` | Read-only local HTTP service for rates, replay and evidence experiments |
| `ui/` | Basic dashboard over the same analytical outputs |
| `ui/replay-explainer.js` | Pure causal projection of replay records into inspectable explanations |

The constructive operations are these public functions. No hidden mutable
service or orchestration state supplies analytical truth. This design does not
select a GTL/ABG runtime or claim an ODD runtime implementation.

## Numerical and temporal profile

Numbers use IEEE-754 arithmetic with finite-input validation. Tests use explicit
tolerances where needed. Monetary outputs are analytical USD scalars, not a
posting ledger with currency-specific rounding. Quantities carry runtime units.
USD-per-barrel inputs are explicitly named. Futures quantities are whole lots.
Negative prices are valid; negative physical holdings are outside this slice.

An `AnalysisContext` retains valuation time, evidence cutoff, horizon, validity,
model, snapshot, book, evidence and assumptions. The comparator checks common
context across candidates, decision time, nonnegative available margin and a
mandatory no-trade baseline. Economic results remain reproducible from their
inputs; no function fetches current prices or uses the wall clock implicitly.

Order projection admits a single declared cumulative-report stream. It orders
reports by sequence, applies only visible evidence, deduplicates semantic
payloads and checks monotonic fills/finality. Corrections and contradictory
sources require a richer design. Conflicts return conservative [0,submitted]
bounds and block a resolved-state claim.

## Scenario and execution coverage

The oil evaluator produces completed-package scenario outcomes. Risk also
evaluates corners of supplied physical/futures fill intervals. For this linear
payoff and rectangular state set, corner evaluation bounds each scenario;
that property does not generalize automatically to nonlinear or dependent
execution models. Cost remains the full supplied package allowance for each
partial state, a conservative assumption documented in the result.

Results distinguish completed-package expectation from the range conditional
on represented execution states. Worst loss and margin cover both the intended
completion and supplied partial states. Scenarios have explicit normalized
probabilities; stress values remain conditional on the supplied path set.

The default completed-package comparison is conditional on both legs being
established and the supplied resources remaining available. Unresolved current
execution causes `seek-evidence`. A separate overlay can add eligibility
constraints. The comparator does not turn package labels into atomic execution
or treat a ranking as authorization.

## Runtime and verification

Node executes erasable TypeScript directly; `tsc --noEmit` checks types
separately. Development dependencies are pinned in the lockfile. The standard
Node test runner verifies the scenarios. Source imports are local; no package
publication is part of this cut. [Node TypeScript documentation](https://nodejs.org/api/typescript.html)
describes the execution/type-check distinction.

The server binds loopback at port 4317 by default. `TRADE_CALCULUS_PORT` selects
another local port. `/api/metadata`, `/api/history`, `/api/rates`, `/api/replay`
and `/api/analysis` expose the mock service. Rates accept a requested date;
replay accepts strategy, lookback, riskWindow, quantity, cost, funding, start,
end, riskMode, tailBudget, stressBudget, notionalLimit, hedgeMode, riskAversion,
hedgeDepth, returnFloor and primaryFloor query parameters.
It returns the selected run, compact counterfactual trajectories for composition
off and sizing off, and cursor-indexed strategy comparisons. All mutations of modeled state happen in local
function results. No endpoint routes an execution instruction.

Native browser verification exercises parameter changes, family curves,
historical playback, risk-policy sizing, homeostatic composition and the evidence toggle. P&L and
strategy comparisons are limited to the cursor. The initial cursor is chosen
from the configured warm-up length, without inspecting future holdings.

The browser also imports the pure explanation and sensitivity modules directly.
Their JavaScript carries checked type annotations for the same Node tests and
browser realization. Static assets and `/definition/rules` use explicit routes;
there is no arbitrary filesystem reader. The latter publishes the local rule
definition through the [specification reader](EXPLORABLE_DEMO.md#specification-reader).
On-page rule summaries remain explanatory read models over the specification.
