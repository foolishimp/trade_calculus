# Calculus rules and experimental bindings

This definition owns model meaning independently of its implementation.
Executable functions and the demo are realizations and read models. A new
economic rule enters this definition and its requirements before code; code
cannot silently establish a deal, valuation rule, constraint or permission.

## Named rules used in the demo

| Rule | Meaning | Detailed definition |
|---|---|---|
| TC-MODEL-01 | Typed direct positions compose by instrument identity; count every node once and preserve contractual distinctions. | [Foundations](FOUNDATIONS.md), [recursive strategies](RECURSIVE_STRATEGIES.md) |
| TC-EVIDENCE-01 | A decision uses only its preceding evidence prefix, known holdings, prior NAV and completed outcomes. | [Historical replay](HISTORICAL_REPLAY.md) |
| TC-GAIN-01 | Assess marginal changes to the combined book against a supplied internal-good reference. Compare deviation first, then the declared preference. | [Homeostasis](HOMEOSTASIS.md), [gain algebra](RECURSIVE_STRATEGIES.md) |
| TC-RISK-01 | Calculate joint losses and independent stresses, then apply supplied bounds and resource constraints to the composed proposal. | [Historical replay](HISTORICAL_REPLAY.md#risk-drives-exposure) |
| TC-ACTION-01 | After selection, the illustrative adapter reveals the next mark, simulates complete fills and charges absolute quantity turnover. | [Historical replay](HISTORICAL_REPLAY.md#replay-calculus) |
| TC-PNL-01 | The old holding earns the newly observed move; net P&L deducts transaction and funding costs and reconciles to NAV. | [Strategy, valuation and risk](STRATEGY_VALUATION_RISK.md), [historical replay](HISTORICAL_REPLAY.md) |
| TC-SENS-01 | Sensitivities derive from the stated valuation model with explicit factor conventions; unsupported sensitivities remain unavailable. | [Sensitivities](SENSITIVITIES.md) |

## Supplied oil strategy bindings

These are illustrative numerical bindings of the supplied strategy archetypes,
not admissions or evidence of profitable performance. For quantity `Q` and
the last `L` prior observations:

- Momentum: Brent quantity is `Q * sign(lastBrent - mean(Brent))`; WTI is zero.
  Insufficient history and exact equality supply no directional exposure.
- Differential reversion: calculate `basis = Brent - WTI`, its window mean
  and population standard deviation. With nonzero deviation, `z` is the latest
  basis displacement divided by that deviation. At `|z| >= 1`, Brent quantity
  is `-Q * sign(z)` and WTI is the opposite; otherwise both are zero. A constant
  basis supplies no identified reversion signal.
- Buy-and-hold: propose `Q` Brent after the first available prior observation.
- No-trade: propose zero on both references.

These proposal bindings do not set the final quantity. Composition, explicit
closure and supplied risk selection apply afterward.

## Experimental evaluator and adapter choices

The recursive evaluator considers full and half covariance hedge increments,
rounded to the instrument quantity step within supplied aggregate bounds.
It considers primary scale at its supplied minimum, half or full, scaling the
whole composed package together. A hedge must reduce sampled variance as well
as improve reference comparison. It excludes changes to a primary instrument
from the hedge candidate category. Ties use deterministic candidate identity
order after deviation and preference. Repeated books and depth bounds terminate
the search. These are the declared choices of this simple evaluator; another
evaluator can consume the same calculus.

The oil binding supplies WTI as the hedge candidate for a Brent-only proposal,
a one-barrel candidate step and an aggregate hedge cap of `2 * Q`. The final
sizing policy preserves ratios on a scale grid whose largest leg changes in
one-barrel increments; other legs may therefore have fractional barrels.
This is a synthetic spot-reference exposure adapter, not a futures-lot rule.

Reference normalization uses positive scales: the tail budget (at least $1)
for expected-return shortfall and tail excess, the stress budget (at least $1)
for stress excess and the notional bound (at least $1) for notional excess.
These scales and the reference travel with each decision. Numerical comparison
tolerances belong to the declared realization profile, not unreported risk
appetite or market conventions.

## Demo parameters and presentation

The initial demo supplies 20 strategy observations, 60 risk changes, 1,000
barrels, $0.05 per barrel of turnover, 4% annual funding, $1m initial NAV,
$2,500 tail allowance, $5,000 stress allowance, $150,000 notional, zero expected
net floor, preference coefficient 0.1 and depth 2. Primary reduction is allowed.
The hedged example changes only the planning primary minimum to full retention;
the sizing-only example disables recursive composition. Presets reset all these
parameters explicitly and do not choose a historical date from later returns.

The event log projects existing replay records and labels its explanations as
such. Formatting, filtering and navigation introduce no economic rules.
Hypothetical shock sliders explain sensitivities and never alter the replay or
create an order. Regulatory overlays, strategy admission and live trade
authorization retain their separate owners outside this demo.
