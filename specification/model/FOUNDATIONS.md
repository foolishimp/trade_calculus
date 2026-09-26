# Ontology, algebra and domain calculus

## Ontology

| Sort | Identity and meaning |
|---|---|
| Underlying | Economic subject with family, location/time/quality where material, variables and capabilities |
| Instrument | Versioned rights and obligations over explicit underlying references |
| Deal / position | A particular obligation or holding with quantity, terms and ownership |
| Order / execution | Instruction and its actual performance; package legs retain separate identity |
| Resource | Cash, funding, inventory, capacity, time or transformation capability |
| Observation | Source claim with event time, received time, identity and revision |
| Epistemic state | Represented possibilities, beliefs, evidence and unresolved questions |
| Strategy | Testable thesis connecting candidate actions to an objective |
| Scenario / outcome | A specified possible path and its economic consequences |
| Recommendation | Comparison result with context, assumptions, conditions and alternatives |

An underlying family and an instrument family are independent axes. An oil
option references oil economics through an option contract. Oil-company equity
references a business through ownership rights. Neither identity is inferred
from the word “oil” alone.

## Algebra

Typed operations include:

```text
add: Quantity<U,B> × Quantity<U,B> -> Quantity<U,B>
convert: Quantity<U,B> × ConversionBasis<U,V> -> Quantity<V,B'>
multiply: Quantity<U,B> × Price<C/U,B> -> Money<C>
compose: Book × Deal -> Book
value: Subject × Market × ValuationBasis -> Result<Value>
project: EvidenceHistory × KnowledgeCutoff -> EpistemicState
```

`U` is unit, `B` measurement/subject basis and `C` currency. Same-unit values
still require compatible subject identity before economic netting. Opposite
exposures do not extinguish different counterparties' obligations.

Laws and refusal conditions:

1. Compatible quantity addition is associative, with zero identity, subject
   to the numerical representation's stated tolerance.
2. Unit conversion requires a declared factor and measurement basis. There is
   no universal tonne-to-barrel conversion.
3. Identity-preserving event projection is insensitive to exact duplicate
   delivery. Conflicting reuse of an identity is an explicit conflict.
4. A missing report cannot set a possible executed quantity to zero.
5. P&L components reconcile to economic total. Settled futures gains enter
   through cash once; collateral transfers alone create no P&L.
6. Capabilities derive from the actual subject, instrument and resources.
   Owning a futures position confers no storage or production capability.
7. Unsupported, non-finite, incompatible or conflicting inputs produce an
   explicit failure, not an invented zero value.

The current code realizes a subset: quantity addition/scaling, bbl/gallon
conversion, quantity-price multiplication, order projection, oil valuation and
recursive strategy aggregation over aligned linear USD payoffs. Strategy nodes
own direct quantities; aggregate exposure counts every descendant once.
Composition of general contractual books and multi-currency operations remains
outside this executable subset.

## Domain calculus

Domain transitions operate on a state `S`:

```text
S --action/event--> S'
```

Orders have submitted, accepted, partially filled, filled and cancelled
conditions. Cancellation requests leave fills possible until final evidence
establishes the outcome. Physical delivery, title, pricing, invoice, payment
and futures settlement each have their own lifecycle. A single status string
cannot replace their distinct obligations.

The first executable calculus consumes cumulative order reports from one
declared authoritative stream. A final report establishes an exact filled
quantity. A partial report establishes a lower bound; the submitted quantity
remains the upper bound. Later reports cannot reduce cumulative fills or alter
a finalized quantity in this profile. Corrections require a richer explicitly
versioned evidence model; the kernel rejects them as conflicts.
