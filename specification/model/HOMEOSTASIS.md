# Internal good and homeostatic control

Internal good is an explicit desired region and preference over the system's
estimated economic state. A state includes expected net outcome, residual
tail/stress exposure, required resources and the adequacy of its evidence.
An epistemic projection supplies the estimate used by the controller. Desired
state, estimated state and actual subsequent outcome remain distinct.

The algebra requires a reference `R`, state estimator `estimate(K,B)`, deviation
measure `deviation(state,R)`, feasible action set, joint transition/payoff model,
action-indexed gain vector and selection/update operator. The reference and
its normalization scales are supplied inputs. Averaging market returns does
not establish those preferences. External governance may constrain admissible
actions without owning economic valuation or the epistemic projection.

```text
environment -> received evidence -> estimated internal state
reference + estimated state -> deviation
feasible actions + joint model -> predicted states and marginal gains
gain comparison -> trade / hedge / resize / hold
observed outcome -> revised evidence and next state estimate
```

For action `a` and unchanged-book alternative `0`, a general preference gain is
`E[U(state_after_a,R) - U(state_after_0,R) | knowledgeCutoff]`.
This differs from standalone instrument return. Each action retains its
unweighted economic/risk/resource changes so the objective remains inspectable.
Recompute gains after an adjustment; correlation and shared resources make
independently attractive local actions interact.

## First experimental reference

The historical adapter supplies a minimum expected net P&L (default zero),
tail/stress loss and gross-notional ceilings, and the existing required history.
Known positive NAV bounds monetary resources. Unavailable history is a missing
estimate, never a healthy zero-risk state. Funding allowance, costs and sample
provenance remain explicit. Cash-path liquidity and execution knowledge need
their own adapters; a notional bound is not proof of liquidity adequacy.

The controller first seeks lower normalized deviation from the reference
region. One-sided violations are divided by explicit monetary scales and
summed. When deviations tie, it prefers higher expected net P&L less a supplied
dimensionless ES penalty. It retains hold/no adjustment and can choose flat
when the historical estimate supports no attractive exposure. Normalization
and preference are experimental policy, separate from forecasts and gain
components. There is no universal internal-good vector.

Recursion composes adjustments over one shared book and reference. Depth,
quantity, repeated-book and improvement bounds terminate search. Prior-evidence
timing excludes future outcomes. These properties do not establish closed-loop
stability or empirical calibration.

The reference can be tuned explicitly between experiments. The controller
cannot silently weaken it to declare success. Model revision, reference
revision and environmental changes are distinct events.
