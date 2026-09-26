# Trade Calculus working rules

The parent workspace instructions apply. Read README, GOALS, INTENT, PRODUCT,
requirements and design before changing the project.

- This is an experimental PoC. Its local specification is the contract under
  test; formal STDO 2.5.1 adoption follows evaluation rather than this work wave.
- `specification/` owns economic meaning and analytical obligations.
- Define business rules, lawful operations, valuation conventions and decision
  semantics in specification independently of code. Distinguish supplied
  parameters and evaluator choices. Implementations and explanatory views
  must trace to those definitions and must not introduce hidden business rules.
- `design/` owns realization. `src/` implements the selected design.
- Keep underlying, instrument, strategy, epistemic, valuation and risk models
  distinct. Reuse capabilities with explicit domain bindings.
- Governance and reporting overlays remain separate from economic analysis.
- Preserve event time, receipt time, model identity and unresolved possibilities.
- Do not imply that scenario probabilities establish fills or model completeness.
- A recommendation is an analytical result. It has no implicit execution effect.
- Declare intake and a Writer/Worker activation with exact write territory.
- Record significant work in `.ai-workspace/tickets/`; comments remain commentary.
- Run `npm run check` and the worked example for kernel changes. Use meaningful
  counterexamples, especially missing fills, incompatible units and cash stress.
- Preserve the source-project/release distinction. This project has no release
  cut, external service, market-data binding or broker binding.
