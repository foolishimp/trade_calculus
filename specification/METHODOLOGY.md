# Systems-analysis methodology

Define the meaning of the system before selecting its realization. An algebra
exposes the ontology through its sorts and operations, but operations alone do
not establish identity, evidence quality or the purpose of acting. State those
parts explicitly and connect them through checkable laws and scenarios.

## Analysis sequence

| Step | Required analysis | Concrete oil result |
|---|---|---|
| 1. Objective and boundary | Whose outcome, which horizon, what existing system and resources? | Isolated USD book; 30-day local crude differential thesis |
| 2. Ontology and taxonomy | What exists, which identities matter, which categories compose? | Grade/location/window; physical holding plus selected futures month |
| 3. Algebra | Which typed operations compose, and under which laws? | Quantity/price multiplication; package composition; explicit conversions |
| 4. Domain calculus | Which events and actions change state, obligations and cash? | Orders, fills, physical performance, daily settlement and closure |
| 5. Epistemology | What warrants a claim, what remains possible, what can falsify it? | Missing acknowledgement retains possible fills; final evidence resolves them |
| 6. Strategy | Why should an available action improve the objective? | Local basis strengthens; hedge broad benchmark exposure |
| 7. Valuation and P&L | Which basis measures current value and future outcomes? | Physical price plus benchmark settlement cash less costs |
| 8. Risk calculus | What can go wrong across joint states and paths? | Basis breakdown, hedge-only execution, cash margin before resale |
| 9. Decision loop | How are alternatives compared and later evaluated? | Trade, resize, wait or reconcile; compare forecasts with outcomes |
| 10. Materialization | Which functions implement these meanings and demonstrate the laws? | Pure typed functions, synthetic example and counterexample tests |

These steps support iteration. A failed scenario can expose missing ontology,
an invalid transition, insufficient evidence or a wrong model assumption.
Revise at the smallest affected definition, then carry the change through its
requirements, design and realization.

## Semantic obligations

- Distinguish observable state, controllable choices, uncertain external
  drivers and estimated parameters. A strategy controls its order size; a
  future oil price remains an uncertain input.
- Identify the model's domain of validity, evidence sources, time basis,
  assumptions, incompatible inputs and refusal conditions.
- Separate facts about a represented world from beliefs about which world
  obtains. Inference changes beliefs; an executed trade changes obligations.
- State both economic consequences and knowledge limitations. A posterior
  over a finite hypothesis set does not demonstrate model completeness.
- Define optimization against an explicit objective and feasible operations.
  An optimizer selects within the declared candidate/model space. The evaluator
  consumes the calculus; its search algorithm does not define deal semantics.
- Preserve governance as an external composition. A numerical loss remains
  the same economic result when a corporate tolerance changes.
- Bind each implemented requirement to functions and falsifying scenarios.

## From definition to code

```text
Intent -> Product -> domain meaning and requirements -> design -> functions
                                                        |
Evidence -> possible states/beliefs -> strategy candidates
         -> valuation and joint risk -> comparison -> recommendation
         -> supplied execution observations -> P&L and forecast evaluation
         -> revised evidence/model/strategy
```

The epistemic calculus is a distinct calculus over claims concerning the
domain calculus. Bayesian inference is one quantitative realization of belief
revision. A formal dynamic epistemic logic, a finite belief model and a
partially observable decision process have different expressive commitments;
each implementation states which it actually provides. The first kernel uses
bounded order possibilities and finite Bayesian conditioning.

## PoC evaluation boundary

Test the [layers and interfaces](model/LAYERS_AND_INTERFACES.md): valid models
compose, invalid operations are refused, evidence remains qualified, economic
quantities reconcile, and action gains retain their reference and tolerances.
Changing market relationships must produce newly assessed combined exposure
without changing the meanings of the constituent deal models.

The evaluator is deliberately simple. Its result supplies a worked traversal
of these interfaces. A stronger search procedure, learned policy or optimizer
is separate work over the same calculus. Poor historical returns can challenge
an estimator or selection policy while the interface obligations still hold;
profitable returns cannot compensate for broken model laws.
