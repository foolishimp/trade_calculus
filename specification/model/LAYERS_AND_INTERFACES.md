# Lawful models, topology and evaluation

The PoC tests a trading model governed by calculus: admissible typed deals,
lawful operations, qualified evidence, explicit economics, tolerances and
traceable composition. Its evaluator is a replaceable consumer of that model.

Strategy admission has a separate governing owner and process. It is outside
this PoC. The calculation consumes supplied strategy models; it does not admit
them. Structural validity, feasibility and comparative gain are analytical
results and cannot confer approval or execution authority.

## Layers

| Layer | Provides | Interface obligation |
|---|---|---|
| Ontology and deal models | Subjects, instruments, units, rights, obligations and resources | Retain identity and actual capabilities; refuse incompatible operations |
| Algebra and domain calculus | Composition and admissible transitions | Preserve quantities, obligations and economic identities through each operation |
| Environmental representation | Available instruments, dependencies, conversion relationships, exposures and constraints | Identify what is represented and what changed; missing adapters remain unsupported |
| Epistemic model | Evidence-qualified state estimates and alternative possibilities | Retain cutoff, provenance, unresolved knowledge and model assumptions |
| Valuation and risk calculus | Joint payoff, P&L, resource demand and residual exposure | Assess the combined book and preserve cost/cash distinctions |
| Homeostatic reference | Internal good, tolerances and preference among competing gains | Keep the desired state separate from estimates of the environment |
| Strategy evaluator | Candidate compositions and adjustments | Search within the supplied model, compare gain vectors and expose constraint results |

The evaluator seeks the best attainable gain under the supplied preference and
tolerances. Gain components can conflict, so a vector alone does not establish
an ordering. The reference supplies that ordering; the evaluator's algorithm
determines how extensively it searches. A simple bounded search exercises this
interface without establishing a global maximum.

## Shifting topology

Topology describes the relationships through which deals interact with their
environment: shared risk factors, basis links, available hedges, resource
dependencies and feasible transformations. Prices and relationship parameters
can change while the available models remain fixed. New instruments, lost
hedge availability or changed contractual capabilities can also change the
available nodes and operations. These are distinct forms of change.

The current historical adapter holds its Brent/WTI instrument set fixed and
re-estimates joint payoff relationships from each prior window. Strategy
composition changes the exposure graph within that set. The generic payoff
interface accepts supplied instruments and aligned scenarios; it does not
discover market topology, reconstruct physical logistics or validate absent
domain adapters. Synthetic cross-domain scenarios exercise that interface.

Each new assessment uses the current represented relationships and evidence.
An earlier hedge quantity or action gain is not a permanent property of its
instrument. Recompute the combined book's gains when evidence, composition or
the reference changes, preserving which of those inputs changed.

## Acceptance and evidence

| PoC claim | Existing requirements and counterexamples |
|---|---|
| Lawful deal representation | REQ-01–REQ-02: capability binding, compatible units and quantity laws |
| Evidence constrains justified state | REQ-03–REQ-04, REQ-15: unresolved fills, Bayesian updates and prior-evidence selection |
| Economics survive composition | REQ-05–REQ-06, REQ-11, REQ-19–REQ-20: cash/P&L reconciliation, joint scenarios and single-count aggregation |
| Constraints remain explicit | REQ-07–REQ-08, REQ-16: resource checks, independent overlays and bounded sizing |
| Gains connect trades, hedges and internal good | REQ-21–REQ-24: residual-risk hedges, action-indexed gains, reference comparison and bounded recursion |
| Representation is inspectable | REQ-09, REQ-12–REQ-13, REQ-18, REQ-22: provenance, service outputs, dashboard and decision traces |

Passing those checks demonstrates the selected model laws and interfaces in
the represented cases. It is not a formal proof for every trading domain, an
empirical validation of the estimator, or qualification of an optimizer.
Regulatory and corporate governance remain independently supplied overlays;
full STDO construction governance follows PoC evaluation.
