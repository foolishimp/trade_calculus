# Explorable calculus demonstration

Realizes REQ-25–REQ-27. Existing replay records remain the numerical authority.
The explanation is a derived view; it neither reruns selection nor supplies
new runtime facts. Strategy admission and optimizer development stay separate.

`ui/replay-explainer.js` is a pure, checked JavaScript projection usable by both
Node tests and the browser. It produces stable event identities, causal phase,
rule, explanation, numerical facts and links. Each observation uses its row
and earlier rows only. Events before the market reveal use only pre-execution
records. Outcome events distinguish old-holding P&L from new exposure and
compare gross loss with the previous price-risk forecast.

`src/linear_sensitivities.js` exposes exact derivatives of the fixed-quantity
linear USD spot-reference price terms. Brent and WTI deltas equal their signed
barrel exposures; parallel delta is their sum. Basis sensitivity explicitly
holds WTI fixed while moving Brent. The price Hessian is zero. Vega, theta and
rho are unsupported by this price-only model; financing accrual is not relabelled
as option theta. Date, model identity, units and scope accompany results.
These public functions are served through explicit asset routes, with no new
dependencies or arbitrary filesystem route.

The browser owns replay cursor, selected event, search/filter and page state.
Only events through the cursor enter the visible log and search. Inspecting an
older event rewinds the entire page. Observation navigation is chronological;
example presets declare parameters before calculation and never choose dates
by later returns. The initial cursor remains the configured warm-up boundary.

The page provides a compact causal walkthrough, a paged event list and an event
inspector with rule, substituted values and direct links. Expandable on-page
explanations connect ontology, algebra, evidence, internal good, sensitivity,
selection and P&L. A deterministic shock explorer applies supported deltas to
explicit hypothetical moves without changing historical observations or orders.

All fills are clearly simulated. Historical rates, synthetic curves and the
separate uncertain-fill experiment retain their provenance. The explanatory
log is in memory and rebuilt per run; persistent event storage is not selected.

## Specification reader

`/definition/rules` renders the existing Markdown definition in a dedicated
document layout. `ui/document.ts` uses Marked to render source text with stable
heading anchors, a contents list, responsive tables and code blocks. The source
remains authoritative; rendering supplies no economic rules or summaries.

An explicit document registry publishes the linked specification and supporting
design/data/source notes. Relative Markdown links resolve through that registry,
preserving section fragments. Unpublished workspace references remain labelled
text. No request supplies a filesystem path. Raw HTML in Markdown is escaped,
and links use published documents or HTTP(S) destinations. The reader includes
the source identity, an optional raw Markdown view and a return to the demo.
