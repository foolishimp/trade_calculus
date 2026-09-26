# Origins and research sources

Research date: 2026-09-26. Numerical scenarios and model choices are local,
synthetic constructions. Source references establish domain facts; they do not
validate a trading strategy or make this project an adopted shared standard.

## Origin

This project develops two open commentary documents in the sibling STDO source
project. Those documents retain their original commentary status:

- [Generic framework](../../specification_methodology/specification_methodology/.ai-workspace/comments/codex/20260926T023304Z_STRATEGY_ontology_calculus_epistemic_risk.md)
- [Oil application](../../specification_methodology/specification_methodology/.ai-workspace/comments/codex/20260926T031254Z_SCHEMA_oil_trading_domain_and_decision_support.md)

The project adopts its own definition through `specification/PRODUCT.md`.
Relevant methodology references are the upstream
[constitutional-set sufficiency](../../specification_methodology/specification_methodology/specification/standards/SPEC_METHOD.md#constitutional-set-sufficiency)
and [epistemic overlay distinction](../../specification_methodology/specification_methodology/specification/standards/WORLD_MODEL_METHOD.md#probability-belongs-in-the-epistemic-overlay).
These links are provenance, not an installed release selection.

## Knowledge and decision theory

- [Dynamic Update with Probabilities](https://link.springer.com/article/10.1007/s11225-009-9209-y): probabilistic dynamic epistemic updates.
- [Algebraic probabilistic dynamic epistemic logic](https://arxiv.org/abs/1612.05267): a formal algebraic treatment; the kernel does not implement this logic.
- [Planning and acting in partially observable stochastic domains](https://people.csail.mit.edu/lpk/papers/aij98-pomdp.pdf): belief states and action under partial observation; the kernel is not a POMDP solver.

## Historical expectation and hedge calculation

- [CME sector-index spread trading](https://www.cmegroup.com/education/articles-and-reports/spread-trading-sector-index-futures): covariance-related hedge ratios and changing co-movement. The generic candidate generator uses aligned USD payoff covariance.
- [MOSEK portfolio formulation](https://docs.mosek.com/portfolio-cookbook/markowitz.html): expected return, covariance and supplied portfolio preferences. This PoC uses bounded candidate search rather than a Markowitz solver.
- [MOSEK input estimation](https://docs.mosek.com/portfolio-cookbook/inputdata.html): estimation choices and the limits of historical inputs.
- [MOSEK transaction costs](https://docs.mosek.com/portfolio-cookbook/transaction.html): transition costs as part of portfolio decisions.

The homeostatic reference, normalized deviation ordering and recursive search
are the local experimental design. These sources neither establish its
calibration nor validate its selected default parameters.

## Valuation sensitivities

- [CME delta](https://www.cmegroup.com/education/courses/option-greeks/options-delta-the-greeks): sensitivity to an underlying price.
- [CME gamma](https://www.cmegroup.com/education/courses/option-greeks/options-gamma-the-greeks): change in delta as the underlying moves.
- [CME Greeks overview](https://www.cmegroup.com/articles/2025/precision-risk-management-starts-with-quality-greeks.html): delta, gamma, vega, theta and rho as valuation sensitivities for risk assessment.

The PoC differentiates its own specified linear price terms. It does not
consume a commercial Greeks feed or implement the option pricers described by
these sources. Factor identities, units and unsupported dimensions are explicit
in [the sensitivity definition](../specification/model/SENSITIVITIES.md).

## Underlying families

- [USDA crop estimation](https://www.nass.usda.gov/Education_and_Outreach/Understanding_Statistics/Estimating_Programs/Crops/index.php): acreage, yields, production and stocks.
- [CME grain basis](https://www.cmegroup.com/education/courses/introduction-to-grains-and-oilseeds/learn-about-basis-grains): local cash/futures differentials, quality and transport.
- [LME warrants](https://www.lme.com/Sustainability-and-Physical-Markets/Warehousing/LME-warrants): metal-lot entitlements and physical delivery.
- [LBMA Loco London](https://www.lbma.org.uk/market-standards/about-loco-london): location and allocated/unallocated precious-metal claims.
- [BIS covered interest parity and basis](https://www.bis.org/publications/qr-201609/covered-interest-parity-lost-understanding-cross-currency-basis): FX funding relationships and observed basis.
- [SEC stock definition](https://www.investor.gov/introduction-investing/investing-basics/glossary/stock): ownership in a business.
- [CFTC glossary](https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CFTCGlossary/index.htm): derivatives terminology; no jurisdictional rule is imported into the core.

## Oil economics and contract profiles

- [EIA oil market analysis](https://www.eia.gov/finance/markets/crudeoil/): supply, demand, prices and inventory drivers.
- [EIA inventory evidence](https://www.eia.gov/finance/markets/crudeoil/balance.php): incomplete global inventory information.
- [EIA refining](https://www.eia.gov/energyexplained/oil-and-petroleum-products/refining-crude-oil-inputs-and-outputs.php): crude inputs and product yields.
- [EIA transit chokepoints](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/): route constraints.
- [CME WTI rulebook](https://www.cmegroup.com/rulebook/NYMEX/2/200.pdf): CL units and delivery.
- [ICE Brent](https://www.ice.com/products/219): contract size and settlement/delivery structure.
- [Dated Brent](https://www.spglobal.com/energy/en/pricing-benchmarks/assessments/crude-oil/dated-brent-price-explained): physical assessment identity.
- [Dubai crude](https://www.spglobal.com/energy/en/pricing-benchmarks/assessments/crude-oil/dubai-crude-oil-price-explained): distinct assessment/delivery methodology.
- [ICE gasoil](https://www.ice.com/products/34361119): metric-tonne contract profile.
- [CME crack spreads](https://www.cmegroup.com/articles/2024/trading-crack-spreads.html): product units and 3:2:1 spread construction.
- [ICE swaps](https://idd.ice.com/CM/CMHelp/Content/FM/Swap.htm): averaging and fixed/floating structures.
- [CME settlement calculations](https://www.cmegroup.com/clearing/files/CME-Money-Calculations-Futures-and-Options.pdf): variation-margin cash arithmetic.
- [New York Fed reference rates](https://www.newyorkfed.org/markets/reference-rates): USD rate references; a reference rate alone is not a complete funding curve.
- [CME 2020 negative-price notice](https://www.cmegroup.com/notices/clearing/2020/04/Chadv20-152.html): price-domain/model compatibility, as a historical example.
- [ICC Incoterms](https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/): shipping responsibility terms.
- [IAS 2](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/): inventory accounting as a separate reporting interpretation.

Contract profiles in an operational extension need current exact version and
calendar bindings. The example uses only the 1,000-barrel benchmark multiplier
and invented paths; it does not implement a complete exchange contract.
