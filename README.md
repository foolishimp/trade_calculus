# Trade Calculus

Trade Calculus defines trading systems from their economic meaning: what is
traded, the operations it supports, what is known, why an action is proposed,
and how its value, P&L and risk are assessed.

The foundation separates **underlying models** from **instrument models**.
Agriculture, energy, resources, metals, currencies and businesses expose
different variables and constraints. Holdings, forwards, futures, swaps and
options expose rights and obligations over those subjects. Strategies compose
these models against an explicit objective.

This is an experimental PoC with four connected parts:

| Part | Materialization |
|---|---|
| Analytical calculus | Ontology, algebra, domain/epistemic calculi, strategy, valuation, P&L and risk definitions with typed functions |
| Strategy and risk engine | Historical expectations, homeostatic reference, recursive trade/hedge adjustment, risk-driven sizing, costs, P&L and breach feedback |
| Interactive demo | Replay, searchable event log, linked rule explanations, gain vectors, sensitivities, shock explorer and economic outcomes |
| Mock rates service | Historical daily Brent/WTI observations plus labelled synthetic curves for seven underlying families, funding and volatility |

The purpose is to test the calculus, its representation and the interfaces
between lawful deal models, evidence, economics, risk and action selection.
The simple evaluator exercises those interfaces. Developing a value-maximizing
strategy composer is a separate undertaking; its sophistication and historical
profitability are not PoC acceptance criteria. The model is governed by its
declared types, operations, constraints and evidence rules. Regulatory,
corporate and reporting overlays remain separate. Full STDO 2.5.1
construction/governance adoption follows evaluation of the PoC.

The oil strategy archetypes are supplied inputs. Their admission belongs to a
separately owned governed process outside this PoC. The illustrative evaluator
can compare their consequences without approving a strategy or authorizing a trade.

## Run the model

Requires Node.js 24.3 or later and npm.

```sh
npm ci
npm run check
npm run dev
```

Open [the local dashboard](http://127.0.0.1:4317). The default replay uses
**733 paired daily spot observations from 2023-01-03 to 2025-12-31**. Strategy
and risk selection use previous observations, then execute at the next
available mark. The risk engine resizes or blocks proposed exposure using
historical tail loss, independent stresses, costs and known capital. Strategy
lookback and risk window are separate controls. The initial cursor is the
first observation after risk warm-up; its selection never inspects future
positions or P&L. The source and vintage are described in
[data/README.md](data/README.md).

Start with **Explore a hedged position** to follow an active example, or allow
the primary to reduce to inspect a no-trade decision. Step through observations
or play them in order. Select a stage in the causal walkthrough or search and
filter the event log. The inspector shows the named rule, substituted numbers
and links to the corresponding details on the page. Inspecting an older event
rewinds all panels to that observation; search never exposes later events.

The sensitivity table compares held, primary, composed and selected books.
Try common or independent Brent/WTI moves in the shock explorer. This reprices
only the stated linear price terms and changes no historical event or order.
Option vega, theta and rho are explicitly unavailable in this adapter.

The [rule definition](specification/model/CALCULUS_RULES.md) owns the lawful
meaning independently of implementation. It distinguishes model law, supplied
strategy bindings, experimental evaluator choices and demo inputs. The
explanatory event log is a derived view of simulated records, not an admitted
event store or a strategy-admission process.

The default experimental policy supplies a $2,500 tail-loss allowance, $5,000
stress-loss allowance and $150,000 gross-notional ceiling. These are explicit
PoC inputs, not market or regulatory rules. Change them in the dashboard to
inspect their effect on actual simulated size. Every chart and strategy card
shows outcomes only through the replay cursor.

The dashboard also enables a homeostatic strategy model: a supplied expected-net
floor and risk/resource ceilings define internal good. Historical payoffs
estimate the book's state. Candidate gains compare reducing primary exposure
with adding a hedge, then recompute against the combined book. The default
reference chooses flat throughout this sample. `Retain primary in planning`
exposes hedge calculations; final risk sizing can still reduce the package.
This option is not a binding physical-delivery constraint. The reference is
explicitly tunable and is never learned from future outcomes.

The P&L chart compares selected control with primary-only sizing and with the
configured planner running without final risk sizing. To reproduce the original
fixed-size experiment, select both `Original proposal + sizing` and
`Observe only`. Library/API calls default to composition off; the dashboard
explicitly enables it. These comparisons are experimental counterfactuals.

The library closes positions only when given `liquidationDate`. The dashboard
and CLI explicitly schedule closure at the chosen window end. Truncating a
library replay leaves its prior decisions and open positions unchanged.

Standalone numerical examples:

```sh
npm run demo
npm run demo -- --json
npm run replay
npm run replay -- --json
npm run strategy
npm run strategy -- --json
```

The demo compares an isolated physical-crude/Brent hedge at two sizes and no
trade. It calculates scenario P&L, expected shortfall, path-dependent variation
margin, and partial-execution risk. It then shows how reconciliation changes
the decision and how a Bayesian update changes beliefs without changing fills.
Every price, probability and resource balance in the demo is synthetic.

| Completed package | Expected net P&L | Worst scenario loss | Peak variation margin |
|---|---:|---:|---:|
| 100,000 barrels / 100 short futures | $40,000 | $260,000 | $1,000,000 |
| 50,000 barrels / 50 short futures | $20,000 | $130,000 | $500,000 |
| No trade | $0 | $0 | $0 |

These are conditional analytical comparisons. Execution may leave either leg
unfilled. The demo also calculates that exposure and returns `seek-evidence`
while execution remains unresolved. The library has no execution connection.

The strategy example reports historical trade/hedge adjustment with and without
primary reduction, including the first decision's gain vector. The retained
primary run loses money on this sample; mechanics and model adequacy remain
separate findings.

## Read the definition

| Document | Owns |
|---|---|
| [Intent](specification/INTENT.md) | Purpose and scope |
| [Product](specification/PRODUCT.md) | Product boundary and selected definition |
| [Goals](specification/GOALS.md) | Current bounded work wave |
| [Methodology](specification/METHODOLOGY.md) | How systems analysis produces the model |
| [Foundations](specification/model/FOUNDATIONS.md) | Ontology, algebra and domain calculus |
| [Layers and interfaces](specification/model/LAYERS_AND_INTERFACES.md) | Lawful deal models, changing topology and the replaceable evaluator boundary |
| [Calculus rules](specification/model/CALCULUS_RULES.md) | Named laws and explicit strategy, evaluator and demo bindings |
| [Sensitivities](specification/model/SENSITIVITIES.md) | Valuation derivatives, factor conventions and supported Greeks |
| [Epistemology](specification/model/EPISTEMOLOGY.md) | Evidence, possibility, belief and revision |
| [Strategy, valuation and risk](specification/model/STRATEGY_VALUATION_RISK.md) | Objectives, economics, P&L and decision loop |
| [Historical replay](specification/model/HISTORICAL_REPLAY.md) | Data grain, timing, price-risk forecasts and stress interpretation |
| [Homeostasis](specification/model/HOMEOSTASIS.md) | Internal good, estimated state, deviation, action gain and feedback |
| [Recursive strategies](specification/model/RECURSIVE_STRATEGIES.md) | Joint historical expectation, strategy composition and marginal gains |
| [Model families](specification/domains/MODEL_FAMILIES.md) | Commodity, FX, equity and derivative composition |
| [Oil](specification/domains/OIL.md) | Strategies, deals, valuation inputs and P&L |
| [Requirements](specification/requirements/REQUIREMENTS.md) | Observable obligations and traceability |
| [Scenarios](specification/scenarios/SCENARIOS.md) | Examples and falsifiers |
| [Kernel design](design/ANALYTICAL_KERNEL.md) | Current realization and its limits |
| [Causal risk control](design/CAUSAL_RISK_CONTROL.md) | Pre-execution evidence boundary, feedback, sizing and separate policy |
| [Recursive hedge design](design/RECURSIVE_HEDGING.md) | Generic USD payoffs, bounded adjustment search and historical oil binding |
| [Explorable demo design](design/EXPLORABLE_DEMO.md) | Derived events, linked explanations, navigation and sensitivity views |
| [Origins and sources](docs/SOURCES.md) | Commentary provenance and research |
| [PoC findings](docs/POC_FINDINGS.md) | Verified principles, measured outcomes and limitations |

The executable scope includes the USD oil-basis model, historical oil
spot-reference replay, recursive linear USD strategy composition, typed quantity operations, curve interpolation,
deterministic cash-flow discounting, terminal option payoff, order projection,
finite Bayesian conditioning and risk/candidate comparison. Other underlying
families have definitions, capability descriptors and synthetic curve
functions. Their specialized deal lifecycles and pricing engines are outside
this PoC. [Requirements](specification/requirements/REQUIREMENTS.md) identify
the implemented boundary.
