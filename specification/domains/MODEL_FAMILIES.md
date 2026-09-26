# Underlying families and instrument composition

The economic subject and the instrument are independent model dimensions.
Families describe reusable economics; a concrete binding supplies identities,
variables, laws, parameters and actual resources.

| Underlying family | Material variables | Reusable capabilities | Characteristic constraints |
|---|---|---|---|
| Agriculture | Crop year, acreage, yield, weather, stocks, grade, location | Store, transport, process, finance, hedge | Biological timing, seasonal supply, quality change, handling and delivery |
| Energy | Production, consumption, inventory, grade, location, capacity, yields | Store, transport, transform, finance, hedge | Product-specific storage, network capacity, throughput, losses and delivery |
| Bulk resources | Ore/mineral quality, reserves, extraction, processing, inventory, freight | Extract, beneficiate, transport, transform | Recovery, impurities, mine/plant capacity, freight and environmental operating conditions |
| Industrial metals | Grade, form, location, inventory, warehouse entitlement, funding | Store, process, deliver, finance, hedge | Deliverability, quality, conversion and warehouse access |
| Precious metals | Quantity, fineness, location, allocated/unallocated entitlement, custody | Hold, transfer, finance, hedge | Bar specification, title/claim distinction, custody and counterparty exposure |
| FX | Currency pair, balances, spot quote, funding curves, settlement dates, basis | Exchange, fund, hedge | Two currency legs, settlement timing, funding and quotation convention |
| Equities | Ownership class, shares, distributions, corporate actions, business cash flows and capital structure | Own, receive distributions, trade, hedge | Ownership rights, dilution, financing, distributions and corporate actions |

These groupings can overlap: metals are resources; energy contains physical
subjects with very different storage properties. A general capability says
what can be modeled. An available capability requires an actual resource or
contractual right. A trader cannot store oil merely because the oil family
supports a storage model.

## Instrument dimension

| Instrument family | Model supplied |
|---|---|
| Physical holding / delivery agreement | Identified quantity, title, quality, location, performance and costs |
| Currency balance / spot exchange | Denominated money and paired exchange/settlement |
| Equity ownership | Rights in a business, distributions and corporate actions |
| Forward | Future exchange or cash settlement under agreed terms |
| Futures | Standard contract reference, multiplier, daily settlement, expiry and delivery/cash rules |
| Swap | Specified cash-flow exchange, index fixings, calendars and payment dates |
| Option | Contingent payoff, premium, exercise, expiry and settlement |
| Capacity / service right | Storage, transport or transformation entitlement with timing and constraints |

Derivatives compose these contractual structures with commodity, FX, equity,
rate or other references. A basket or spread can involve multiple underlying
models. An equity derivative also retains corporate-action and contract rules.

```text
wheat inventory = agricultural subject + physical holding
FX forward      = currency-pair subject + forward exchange
oil equity      = business subject + equity ownership
equity option   = equity subject + option contract
oil future      = oil reference + futures contract
```

## Strategy reuse

Storage carry binds storage, finance, preservation/loss, sale and delivery.
The same structure can be specialized to oil, grain and copper with different
parameters and constraints. FX carry binds currency funding and exchange.
Conversion strategies bind an input/output process and feasible capacity.
Relative-value strategies bind a relationship, evidence for its persistence,
and an explicit failure scenario. These shared structures preserve the
underlying subject's variables and economics.

The code publishes family descriptors and checks a strategy's required
capabilities against a supplied concrete binding. It does not infer possession
of physical resources from the family or instrument label. Primary research
references are collected in [SOURCES](../../docs/SOURCES.md).
