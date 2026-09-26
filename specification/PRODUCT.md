# Product definition

Status: experimental PoC; full STDO 2.5.1 adoption follows evaluation of the PoC.

Trade Calculus is a composable definition and executable analysis of trading
systems. It consists of a semantic model, domain specializations, analytical
functions, worked scenarios and evidence that those functions preserve their
declared meaning.

## Selected definition

This Product Definition selects [INTENT](INTENT.md),
[METHODOLOGY](METHODOLOGY.md), the documents under `model/`,
[MODEL_FAMILIES](domains/MODEL_FAMILIES.md), [OIL](domains/OIL.md),
[REQUIREMENTS](requirements/REQUIREMENTS.md), and
[SCENARIOS](scenarios/SCENARIOS.md) as the local definition. Requirements
identify which obligations the current kernel realizes.

The workspace construction rules apply. The local methodology defines this
product's analysis; upstream STDO documents and originating commentary are
references. This initial source project makes no installed STDO release or
toolchain binding claim. A source package version identifies development
bytes; a released immutable Product requires a separately established release cut.

## Product components

1. **Underlying models:** economic subjects, identity, state, dynamics,
   capabilities, resources and intrinsic constraints.
2. **Instrument models:** contractual rights, obligations, payoff and lifecycle
   over one or more underlying references.
3. **Algebra and calculus:** typed composition and lawful state transitions.
4. **Epistemic model:** evidence, observation rules, possible states, beliefs,
   conflicts, coverage limits and revision.
5. **Strategy model:** objective, thesis, supporting evidence, horizon,
   candidate actions, invalidation and evaluation.
6. **Economic model:** valuation bases, cash flows, P&L, attribution and risk.
7. **Decision loop:** compare actions, expose conditions, observe execution,
   reconcile outcomes and evaluate forecasts.
8. **Overlay interfaces:** independently identified governance constraints and
   reporting interpretations over preserved analytical facts and results.

## First materialization

The PoC has four connected components: the analytical calculus, a numerical
strategy engine, a basic trader dashboard, and a mock rates service. Its local
definition is the contract under test; it remains subject to the PoC's findings.

Daily observations are the selected analysis grain. The calculus,
representation and interfaces are the primary objects of evaluation. Lawful
deal models supply admissible operations; valuation, epistemic and risk models
make their consequences inspectable. The simple strategy evaluator exercises
that composition. Developing a sophisticated value-maximizing evaluator is a
separate undertaking, and historical profitability is not the PoC pass criterion.

The kernel implements an isolated USD physical-oil/benchmark-futures book,
with linear costs and finite supplied future paths. It includes no-trade,
full-size and reduced-size comparisons; current fill uncertainty; Bayesian
conditioning; settlement cash and P&L; scenario losses and expected shortfall;
and peak variation-margin funding. It records model and evidence context.

The rates service replays supplied historical oil spot observations and
generates explicitly synthetic rate/forward curves for the family models. A
historical strategy engine produces signals, simulated fills, positions, costs,
P&L and drawdown using a declared timing model. The dashboard exposes that
replay, strategy parameters and results, rate curves and evidence effects.

The dashboard is an explorable demonstration of that calculus. A derived event
log connects prior evidence, model application, candidate composition, tolerance
checks, simulated action and outcome. Each explanation exposes the applicable
rule and actual inputs/results, linking to details on the same page. Inspecting
an event synchronizes the displayed observation. Price sensitivities expose how
the current and proposed books respond to specified factor moves; unsupported
valuation sensitivities remain explicit.

Risk drives historical position selection before execution. The strategy
proposes an exposure; a risk model assesses its loss distribution, independent
stresses, notional and cost allowances from prior evidence. A separately
supplied experimental policy selects a feasible size or a flat position.
Previously observed breaches can increase the declared model allowance.
Decision records preserve the proposal, selected exposure, evidence cutoff,
policy, assumptions and reasons. Observation-only replay is a counterfactual.

Primary and hedge strategies share a recursive composition model. A historical
payoff estimator supplies expected return and joint residual risk. The generic
hedge calculation proposes covariance-based quantities and compares combined
after-cost benefit under an explicit objective. Its first historical adapter
uses the available Brent/WTI spot proxies. Cross-domain adapters retain their
own units and payoff semantics; synthetic examples establish composition only.

A supplied homeostatic reference defines internal good as a desired economic
region and preference. The epistemic model estimates state from available
evidence. Action-indexed gains expose changes in expected net return, residual
risk, resource demand and deviation from that reference. Primary resizing and
hedge changes compete against the same combined book. Evidence revision and
reference revision remain distinct; neither profitability nor closed-loop
stability follows from implementing the comparison.

Cross-asset definitions are part of the product. Executable multi-currency
pricing, physical logistics optimization, option pricing, live ingestion,
persistent event storage and live execution adapters are outside this PoC.
Extensions enter through requirements and design when they are selected for
implementation. No market order is an effect of an analytical function.

## Core and overlays

Physical feasibility, contractual payoff, available resources, costs and
economic consequences belong to the core. A contract profile instantiates
units, benchmark, settlement and delivery semantics. External governance owns
permissions, institutional limits and approval arrangements. A reporting
overlay owns accounting recognition and presentation. Human and automated
action selection can both consume the same core outputs.

Strategy admission is a separately owned governed process and is outside this
PoC. Oil strategy archetypes are supplied domain inputs. Their illustrative
implementations exercise the calculus; comparison, feasibility and favorable
gain do not constitute admission, approval or authority to execute.

Governed trading by calculus means that represented deals, compositions and
transitions obey the declared model laws, preserve evidence and expose their
constraint checks. This claim concerns the implemented model and interfaces;
it does not imply regulatory approval or adoption of a construction standard.
