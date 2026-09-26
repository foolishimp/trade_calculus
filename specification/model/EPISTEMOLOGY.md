# Epistemology and epistemic calculus

An epistemic state records what the system can establish about domain states,
what remains possible and what assumptions support a belief. It does not
execute a trade or change an underlying contractual fact.

Use three distinct uncertainties:

| Kind | Example | Representation |
|---|---|---|
| Current state | An order may have filled despite a timeout. | Bounds or explicit possible states |
| Future evolution | Basis and benchmark prices may change. | Scenarios, predictive distributions, paths |
| Model adequacy | A structural break or omitted failure mode invalidates the model. | Assumptions, alternative models, coverage limits, falsifiers |

## Evidence and time

Evidence carries a source, event identity, event time and receipt time. An
analysis carries both valuation time and knowledge cutoff. A historical view
uses only reports received by its cutoff and applicable by its valuation time.
Late evidence can change a reconstructed view without changing the original
view available to a decision.

Source admission and observation semantics are explicit model inputs. The
first order profile binds one authoritative cumulative-report source, exact
order identity and report sequence. Exact duplicate evidence is idempotent.
Conflicting identity reuse, regressing cumulative quantity, contradictory final
reports or unsupported corrections produce a conflict. They do not become a
zero-exposure estimate.

For an order of 100 units:

```text
submission alone                -> possible filled quantity [0,100]
partial report of 60            -> possible filled quantity [60,100]
final report: 60 filled, closed -> possible filled quantity [60,60]
```

The bounds describe execution knowledge. Combining a proposed additional 80
units gives potential totals of 180, 180 and 140 respectively. A confidence
score does not replace those bounds.

## Bayesian inference

For represented hypotheses `h` and observation `e`:

```text
posterior(h | e) = prior(h) * likelihood(e | h)
                 / sum_k(prior(k) * likelihood(e | k))
```

All quantities refer to a declared model. Zero evidence likelihood under every
represented hypothesis signals incompatibility with that model. The kernel
rejects this condition. Replaying an evidence ID does not multiply its
likelihood twice. Successive likelihood vectors must be conditional on the
already used evidence; correlated reports cannot be treated as independent
without a model justifying that choice.

For evolving systems, prediction through a transition model precedes
conditioning. The current implementation supplies conditioning only; it makes
no full dynamic-epistemic-logic or POMDP-solver claim. Formal connections are
documented in [sources](../../docs/SOURCES.md).

## Consequences for risk and decisions

Risk evaluates consequential supported states, including states with low
posterior weight. Bounds and stresses can operate without probabilities.
Recommendations expose unsupported assumptions and validity conditions.
Unresolved execution or stale decision context can produce `seek-evidence` or
`defer`. Reconciliation is an action with potential decision value even when
it creates no position.
