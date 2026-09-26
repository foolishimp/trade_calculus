# Oil trading specialization

The oil model composes physical stock/flow, storage, transport, transformation,
financing and contractual cash-flow models. It covers crude and refined
products at the level of domain definition. The executable slice binds a
synthetic local crude and one Brent futures reference in USD.

## Identity and market model

An exposure binds product/grade, quality specification, location, delivery
window, pricing basis, quantity/unit and contractual rights and obligations.
Market price is related to production, consumption, stocks, refinery capacity,
logistics and finance. Those drivers carry uncertainty and incomplete evidence.

Physical oil, storage/transport/process capacity, deals, orders, nominations,
movements, inspections, title, invoices, payments, assessments and settlements
retain distinct identities. Observing a shipment does not establish every
commercial fact about it. Refining uses declared assays, yields and losses;
barrels alone do not supply a universal material-conservation law.

| Market reference | Material distinction |
|---|---|
| NYMEX WTI CL | 1,000 US barrels; physical delivery under Cushing quality/location rules |
| ICE Brent B | 1,000 barrels; EFP delivery with cash-settlement option against the ICE Brent Index |
| Dated Brent | Physical assessment with its own eligible grades and delivery methodology |
| Dubai/Oman assessments | Distinct physical price methodologies and delivery alternatives |
| NYMEX RBOB / ULSD | Standard contracts of 42,000 US gallons; price quoted per gallon |
| ICE low-sulphur gasoil | 100 metric tonnes per lot; contract-specific delivery/conversion convention |

Bind the exact month, index, calendar and version. Dated Brent and a selected
Brent futures month remain different references. Unit conversion from mass to
volume needs a density or contractual basis. Sources and research date appear
in [SOURCES](../../docs/SOURCES.md).

## 1. Strategies

These are established oil-trading strategy archetypes supplied to exercise
the model. Strategy admission is an independently owned governed process and
is out of scope. The synthetic package and historical replay rules below are
illustrative bindings, not claims of industry certification or validated
performance for their selected parameters.

| Strategy | Reason to act | Required evidence and invalidation |
|---|---|---|
| Directional fundamentals | A supply/demand change alters future economics. | Production, consumption, stocks and outages; thesis fails or is already priced |
| Calendar / storage carry | Future sale proceeds exceed complete acquisition/carry/delivery cost. | Curves, capacity, finance, loss and throughput; advantage disappears or storage becomes infeasible |
| Geographic netback | Destination value exceeds acquisition and transport costs. | Executable prices, freight, timing, quality and capacity; route/cost change removes the advantage |
| Grade / benchmark relative value | A specified differential changes. | Substitution, refinery demand and grade balances; structural basis change invalidates the relationship |
| Blending / crude selection | A feasible input mix improves required outputs or economics. | Assays, compatibility, yields and constraints; actual quality/conversion breaks the model |
| Refining margin | Product values move relative to feedstock and conversion cost. | Product balances, runs and actual yields; proxy crack ceases to represent the physical book |
| Volatility / event | Contingent exposure improves an explicit return or protection objective. | Distribution, skew, event evidence and liquidity; volatility or execution assumptions fail |
| Statistical / trend | A tested predictive relation persists after costs. | Point-in-time validation, stability, turnover and capacity; prospective performance decays |
| Commercial hedging | A package improves the combined commercial book's risk or budget outcome. | Exposure, sensitivities and hedge effectiveness; exposure or basis relationship changes |

Each thesis has an objective, evidence references, horizon, model version,
entry/exit/invalidation conditions and evaluation history. A catalogue entry
does not establish that a profitable opportunity currently exists.

The executable examples use a physical/benchmark basis package, simple Brent
trend and Brent–WTI differential-reversion rules, and a covariance-based hedge
calculation. Buy-and-hold and no-trade are comparison baselines. Storage carry,
geographic netback, refining and other catalogue entries remain domain models
without complete executable deal adapters in this PoC.

## 2. Deal types

| Deal family | Terms and obligations |
|---|---|
| Physical spot | Grade, quantity/tolerance, delivery, price, inspection, payment and title |
| Term supply / offtake | Repeated deliveries, nominations, flexibility and pricing schedules |
| Physical forward | Future delivery for an agreed price with performance and credit exposure |
| Listed futures | Exact contract/month, lots, multiplier, fills, daily settlement and expiry |
| Fixed/floating swap | Quantity, fixed rate, index, fixing weights/calendar, payment and collateral |
| Differential swap | Two explicit references, ratios, windows and settlement formula |
| Option | Underlying, quantity, strike, premium, exercise, averaging and settlement |
| Capacity / service right | Storage, transport or process access, fees, timing and performance |

Packages retain each leg's obligations and execution state. A spread does not
make those legs atomic. Physical terms include risk/title transfer, quality,
loss allowance, freight, demurrage and destination/substitution rights where
applicable. Contract semantics are domain inputs; governance rules over who
may enter the contract remain separate overlays.

## 3. Valuation inputs and calculus

| Input family | Required binding |
|---|---|
| Commodity curves | Product, grade, location, delivery period, bid/offer or mark, source/time |
| Differentials and fixings | Exact index, window, observed fixings and unobserved projections |
| Logistics / transformation | Freight, storage, insurance, demurrage, losses, yields and capacity |
| Funding / discount | Currency, collateral/credit basis, tenor and funding spread |
| FX | Reporting and settlement currencies, spot/forward basis and dates |
| Volatility / dependence | Payoff model, surface, correlations/dependencies and parameter evidence |
| Execution / credit | Spreads, fees, slippage, partial-fill states and counterparty exposure |

For weighted index pricing:

```text
contractPrice = sum_i(weight_i * fixing_i) + differential
sum_i(weight_i) = 1
invoice = acceptedQuantity * contractPrice + applicableCharges
```

For a fixed-quantity, single-currency receive-floating/pay-fixed swap under
deterministic discounting:

```text
projectedAverage = sum_fixed(w_i * observedFixing_i)
                 + sum_unfixed(w_i * pricingForwardFixing_i)
swapValue = quantity * discountFactor * (projectedAverage - fixedRate)
```

Project the actual index and averaging convention. Futures-to-forward
adjustments, stochastic discounting, collateral and currency effects require
the appropriate model. A deterministic cash-flow value is the sum of dated
cash flows times their compatible discount factors.

For crude quoted in USD/barrel and products in USD/US gallon:

```text
grossCrack321 = (2*42*RBOB + 42*ULSD - 3*WTI) / 3
```

This proxy has no refinery operating cost or plant-specific yield assumption.
Physical conversion models supply those explicitly. Option models bind their
payoff and price domain, including negative prices where applicable. These
broader valuation models are specified here; the first kernel implements the
linear physical/futures package below.

## 4. P&L and the worked package

Economic P&L is change in NAV after removing external capital contributions.
Cash flows, inventory, liabilities, collateral and remaining claims are valued
consistently. Accounting classifications are supplied by reporting overlays.

For signed futures lots `n`, multiplier `m` and successive settlements:

```text
variationMargin_d = n * m * (settlement_d - previousSettlement)
```

Initial margin is collateral. Its funding cost is a separate expense. Accrued
settlement cash and remaining derivative value reconcile without duplicate gain.

The synthetic thesis is that a local crude differential to a selected Brent
month strengthens within 30 days. Buy physical at $81/barrel and short futures
at $80/barrel. Assume financed inventory, reserved storage/resale capacity,
unchanged quantity/quality and closing the hedge before expiry. Cost is
$0.60/barrel in this example, inclusive of declared funding and transaction
costs. Available variation-margin cash is measured after inventory financing
and initial margin.

For equally sized legs and complete closure:

```text
basis_t = physicalPrice_t - selectedFuturesPrice_t
netPnL = q * (basis_end - basis_start) - costs
```

| Scenario | Probability | Futures path after entry | Terminal basis | P&L at 100,000 bbl |
|---|---:|---|---:|---:|
| Strengthen | 0.60 | 90, 74 | 3 | 140,000 |
| Unchanged | 0.30 | 85, 80 | 1 | -60,000 |
| Weaken | 0.10 | 90 | -1 | -260,000 |

All numbers are invented. Expected net P&L is $40,000. Worst represented loss
is $260,000. A rally to $90 requires $1,000,000 cumulative variation margin on
100 short 1,000-barrel contracts, even when a later price fall makes the hedge
profitable. At 50,000 barrels/50 contracts these amounts halve.

At closing physical $77 and futures $74, the 50,000-barrel package produces
physical P&L -$200,000, futures settlement cash +$300,000 and costs -$30,000:
total $70,000. The physical resale gain or loss is distinct from interim cash
available to satisfy margin.

If the physical purchase is unresolved while 50 short futures are established,
physical quantity spans 0–50,000 barrels. In the weakening scenario the
hedge-only state loses $500,000 before the conservative $30,000 package cost
allowance. Worst represented loss becomes $530,000. The completed-package
forecast remains conditional; it cannot stand in for execution knowledge.

## Epistemology, risk and decisions

Evidence includes prices, fills, stocks, assays, capacity and performance with
source and time. Risk combines current execution possibilities, future paths
and model assumptions. Basis loss, cash timing, physical feasibility and
counterparty exposure remain separate dimensions of the analysis.

The demo supplies $750,000 available margin reserve. It also applies a separate
example overlay with a $150,000 worst-loss tolerance. Under completed-package
assumptions the reduced package fits both. During unresolved execution the
loop requests reconciliation. Neither the resource balance nor the overlay
threshold is a universal trading rule.

New evidence revises the epistemic state; reconciled results update P&L and
forecast evaluation. Operational deployment would bind actual data, contracts,
resources and execution contingencies. The current model's synthetic evidence
and explicit omissions travel with every comparison.
