# Goals

Current wave: make the calculus explorable through linked explanations,
simulated events and supported sensitivity views. [T-004](../.ai-workspace/tickets/T-004.md)
owns this bounded demo extension. Evaluator sophistication and strategy
admission remain outside this wave.

| Goal | Closure evidence |
|---|---|
| G-01: Make the analytical definition self-contained. | Intent, product, methodology, foundations, epistemology, family and oil definitions |
| G-02: Exercise strategy, valuation, P&L and risk together. | Runnable oil example with full, reduced and no-trade candidates |
| G-03: Make knowledge consequential. | Missing-fill, reconciliation, duplicate-evidence and Bayesian counterexamples |
| G-04: Preserve semantic distinctions. | Unit, capability, settlement/P&L and overlay checks |
| G-05: Exercise the decision loop through historical replay and a trader dashboard. | Mock rates service, causal replay, curve and P&L displays, strategy controls |
| G-06: Exercise the risk-calculus interface independently of strategy profitability. | Rolling joint VaR/ES, prior-forecast breaches, basis shocks and independent risk-window checks |
| G-07: Make risk consequential before execution. | Risk-driven sizing/rejection, historical feedback and preserved pre-execution trace; T-002 |
| G-08: Compose return and hedge strategies through one calculation. | Historical expectation, covariance hedge calculation, action gain vectors, homeostatic reference and causal replay; T-003 |
| G-09: Make the PoC's layered contract and evaluation boundary explicit. | Lawful deal models, shifting represented relationships, replaceable evaluator and separate strategy-admission ownership |
| G-10: Explain application and outcomes interactively. | Causal event inspection, linked rules, observation navigation and sensitivity views; T-004 |

Work and verification are recorded in
[T-001](../.ai-workspace/tickets/T-001.md),
[T-002](../.ai-workspace/tickets/T-002.md),
[T-003](../.ai-workspace/tickets/T-003.md) and
[T-004](../.ai-workspace/tickets/T-004.md). Wider domain pricing and execution
integrations require their own bounded work waves.

The current work remains a PoC. Its results inform whether the principles are
sufficient. Full STDO 2.5.1 construction/governance adoption is subsequent work
after the PoC is evaluated; this wave does not claim that adoption.

The initial PoC, causal control, recursive composition and explorable demo are
implemented within their declared boundaries. Evaluation of the calculus and
its representation remains open.
[Findings](../docs/POC_FINDINGS.md) distinguish
verified mechanics from unresolved model adequacy and implementation boundaries.
